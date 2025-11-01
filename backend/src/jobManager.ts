import { v4 as uuid } from 'uuid';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { AnalysisJob, AnalysisType, JobStatusResponse, UploadInfo, AnalysisData } from './types';

const execFileAsync = promisify(execFile);

const jobs = new Map<string, AnalysisJob>();

const processingTimers = new Map<string, NodeJS.Timeout>();

const stageThresholds = [20, 45, 75, 95];

export const createAnalysisJob = (upload: UploadInfo, type: AnalysisType): AnalysisJob => {
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

  // Armazenar upload info no job para usar no processamento
  (job as any).uploadInfo = upload;

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

    // Caminho do binário Go (assumindo que será compilado)
    // No Windows será .exe, no Linux/Mac será sem extensão
    const processorName = process.platform === 'win32' ? 'demo-processor.exe' : 'demo-processor';
    const processorPath = path.resolve(process.cwd(), 'processor', processorName);
    
    // Tentar executar o processador Go
    try {
      const { stdout } = await execFileAsync(processorPath, [upload.path, job.type], {
        timeout: 300000, // 5 minutos timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Parse do JSON retornado pelo Go
      const analysisData: AnalysisData = JSON.parse(stdout);
      job.analysis = analysisData;
    } catch (goError: any) {
      // Se o binário Go não existir ou der erro, usar mock como fallback
      console.warn('Erro ao executar processador Go, usando mock:', goError.message);
      const { buildMockAnalysis } = await import('./mockAnalysis');
      job.analysis = buildMockAnalysis(job.type);
    }

    job.progress = 100;
    job.status = 'completed';
    job.updatedAt = new Date();
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
