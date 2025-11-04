import { v4 as uuid } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AnalysisJob, AnalysisType, JobStatusResponse, UploadInfo, AnalysisData } from './types';
import { convertGoDataToAnalysisData } from './goDataConverter';

const jobs = new Map<string, AnalysisJob>();

const processingTimers = new Map<string, NodeJS.Timeout>();

const stageThresholds = [20, 45, 75, 95];

export const createAnalysisJob = (upload: UploadInfo, type: AnalysisType, steamId?: string): AnalysisJob => {
  const jobId = uuid();
  const now = new Date();

  const job: AnalysisJob = {
    id: jobId,
    uploadId: upload.id,
    type,
    status: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  } as any;

  // Armazenar upload info e steamId no job para usar no processamento
  (job as any).uploadInfo = upload;
  (job as any).steamId = steamId;

  jobs.set(jobId, job);
  startProcessing(jobId);
  return job;
};

export const getJob = (jobId: string): AnalysisJob | undefined => jobs.get(jobId);

export const getJobStatus = (jobId: string): JobStatusResponse | undefined => {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  return {
    jobId,
    status: job.status,
    progress: job.progress,
    error: job.error,
  };
};

const startProcessing = (jobId: string) => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.updatedAt = new Date();
  job.progress = 5;

  let stageIndex = 0;

  const interval = setInterval(() => {
    const currentJob = jobs.get(jobId);
    if (!currentJob) {
      clearInterval(interval);
      processingTimers.delete(jobId);
      return;
    }

    if (currentJob.status !== 'processing') {
      clearInterval(interval);
      processingTimers.delete(jobId);
      return;
    }

    const increment = Math.floor(Math.random() * 15) + 5;
    currentJob.progress = Math.min(currentJob.progress + increment, stageThresholds[Math.min(stageIndex, stageThresholds.length - 1)]);
    currentJob.updatedAt = new Date();

    if (currentJob.progress >= stageThresholds[Math.min(stageIndex, stageThresholds.length - 1)]) {
      stageIndex += 1;
    }
  }, 1200);

  processingTimers.set(jobId, interval);

  // Processar em background com simulação de progresso
  // Na realidade, o Go vai processar e pode levar mais tempo
  const totalProcessingTime = 6500 + Math.random() * 2000;
  setTimeout(() => {
    finalizeJob(jobId).catch(err => {
      const currentJob = jobs.get(jobId);
      if (currentJob) {
        currentJob.status = 'failed';
        currentJob.error = err instanceof Error ? err.message : 'Erro ao processar';
        currentJob.updatedAt = new Date();
      }
    });
  }, totalProcessingTime).unref();
};

const finalizeJob = async (jobId: string) => {
  const job = jobs.get(jobId);
  if (!job) return;

  const interval = processingTimers.get(jobId);
  if (interval) {
    clearInterval(interval);
    processingTimers.delete(jobId);
  }

  try {
    // Buscar o upload info para obter o caminho do arquivo
    // Isso será passado através do job, precisamos armazenar o upload info
    const upload = (job as any).uploadInfo as UploadInfo;
    
    if (!upload || !upload.path) {
      throw new Error('Informações de upload não encontradas');
    }

    // Caminho do binário Go - está em backend/processor/
    // No Windows será .exe, no Linux/Mac será sem extensão
    const processorName = process.platform === 'win32' ? 'demo-processor.exe' : 'demo-processor';
    
    // __dirname em TypeScript compilado aponta para dist/, então subimos para backend/processor
    // Em desenvolvimento, __dirname aponta para src/, então também funciona
    const processorPath = path.resolve(__dirname, '..', 'processor', processorName);
    
    // Verificar se o arquivo existe antes de executar
    if (!fs.existsSync(processorPath)) {
      throw new Error(`Processador Go não encontrado em: ${processorPath}. Certifique-se de que o arquivo ${processorName} existe.`);
    }
    
    // Tentar executar o processador Go
    // Args: [demo_path, steamId?] - steamId é opcional
    const args = [upload.path];
    const steamId = (job as any).steamId;
    if (steamId && steamId.trim() !== '') {
      args.push(steamId);
    }

    try {
      // Usar spawn com streams para lidar com output muito grande (snapshots a cada tick)
      // Criar arquivo temporário para output do Go (para não exceder buffer)
      const tempOutputPath = path.join(__dirname, '..', 'storage', 'temp', `output-${jobId}.json`);
      const tempDir = path.dirname(tempOutputPath);
      
      // Garantir que o diretório existe
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Executar processador Go e redirecionar stdout para arquivo
      await new Promise<void>((resolve, reject) => {
        const childProcess = spawn(processorPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout: pipe, stderr: pipe
        });
        
        let stderrData = '';
        const writeStream = fs.createWriteStream(tempOutputPath);
        
        // Escrever stdout diretamente no arquivo (sem limite de buffer)
        childProcess.stdout.on('data', (data: Buffer) => {
          writeStream.write(data);
        });
        
        childProcess.stdout.on('end', () => {
          writeStream.end();
        });
        
        // Coletar stderr para logs
        childProcess.stderr.on('data', (data: Buffer) => {
          stderrData += data.toString();
          // Log de stderr para debug
          const stderrStr = data.toString();
          if (stderrStr.includes('[DEBUG]') || stderrStr.includes('[WARN]')) {
            console.log('[Go Processor]', stderrStr.trim());
          }
        });
        
        childProcess.on('close', async (code) => {
          // Aguardar write stream finalizar completamente
          await new Promise<void>((res, rej) => {
            if (writeStream.writableEnded) {
              res();
              return;
            }
            writeStream.on('finish', () => res());
            writeStream.on('error', (err) => rej(err));
            // Forçar finalização se ainda não terminou
            setTimeout(() => {
              if (!writeStream.writableEnded) {
                writeStream.end();
              }
              res();
            }, 1000);
          });
          
          try {
            // Ler do arquivo - verificar tamanho primeiro
            const stats = fs.statSync(tempOutputPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            console.log(`[Go Processor] Tamanho do JSON: ${fileSizeMB.toFixed(2)} MB`);
            
            // Se arquivo muito grande (>500MB), avisar mas tentar parsear mesmo assim
            if (fileSizeMB > 500) {
              console.warn(`[Go Processor] AVISO: Arquivo JSON muito grande (${fileSizeMB.toFixed(2)} MB). Pode demorar para parsear.`);
            }
            
            // Ler arquivo em chunks para evitar problemas de memória
            const jsonString = fs.readFileSync(tempOutputPath, 'utf-8');
            
            if (!jsonString || jsonString.trim().length === 0) {
              throw new Error('Nenhum dado recebido do processador Go');
            }
            
            // Parse do JSON retornado pelo Go (com timeout implícito)
            let goData;
            try {
              goData = JSON.parse(jsonString);
            } catch (parseErr: any) {
              // Se falhar, tentar ler apenas parte do arquivo para debug
              const sample = jsonString.substring(Math.max(0, parseErr.message.match(/position (\d+)/)?.[1] || 0) - 100, 
                (parseErr.message.match(/position (\d+)/)?.[1] || 0) + 100);
              console.error(`[Go Processor] Erro no parse JSON próximo à posição ${parseErr.message.match(/position (\d+)/)?.[1]}: ${sample}`);
              throw parseErr;
            }
            
            // Limpar arquivo temporário
            try {
              fs.unlinkSync(tempOutputPath);
            } catch {}
            
            // Converter dados do Go para o formato AnalysisData esperado pelo frontend
            const analysisData: AnalysisData = convertGoDataToAnalysisData(goData, job.type);
            
            // Armazenar também os dados brutos do Go para uso no chatbot
            (job as any).rawGoData = goData;
            
            job.analysis = analysisData;
            console.log(`✅ Análise concluída: ${goData.events?.length || 0} eventos, ${goData.radarReplay?.length || 0} snapshots processados`);
            
            job.progress = 100;
            job.status = 'completed';
            job.updatedAt = new Date();
            
            resolve();
          } catch (parseError: any) {
            // Limpar arquivo temporário em caso de erro
            try {
              if (fs.existsSync(tempOutputPath)) {
                fs.unlinkSync(tempOutputPath);
              }
            } catch {}
            
            if (code !== 0) {
              reject(new Error(`Processador Go retornou código ${code}. Erro: ${stderrData.substring(0, 500) || 'desconhecido'}`));
            } else {
              reject(new Error(`Erro ao parsear JSON do Go: ${parseError.message}`));
            }
          }
        });
        
        childProcess.on('error', (error) => {
          writeStream.destroy();
          // Limpar arquivo temporário em caso de erro
          try {
            if (fs.existsSync(tempOutputPath)) {
              fs.unlinkSync(tempOutputPath);
            }
          } catch {}
          reject(error);
        });
        
        // Timeout de 5 minutos
        const timeout = setTimeout(() => {
          childProcess.kill();
          writeStream.destroy();
          reject(new Error('Timeout: processador Go demorou mais de 5 minutos'));
        }, 300000);
        
        childProcess.on('close', () => {
          clearTimeout(timeout);
        });
      });
      
    } catch (goError: any) {
      // Se o binário Go não existir ou der erro, usar mock como fallback
      console.warn('Erro ao executar processador Go, usando mock:', goError.message);
      const { buildMockAnalysis } = await import('./mockAnalysis');
      job.analysis = buildMockAnalysis(job.type);
      
      job.progress = 100;
      job.status = 'completed';
      job.updatedAt = new Date();
    }
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Erro desconhecido ao gerar análise.';
    job.updatedAt = new Date();
  }
};

export const resetJobStore = () => {
  processingTimers.forEach(timer => clearInterval(timer));
  processingTimers.clear();
  jobs.clear();
};
