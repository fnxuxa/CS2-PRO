import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

import { AnalysisType, UploadInfo } from './types';
import { createAnalysisJob, getJob, getJobStatus } from './jobManager';
import { generateRushResponse } from './rushCoach';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const storageRoot = path.resolve(process.cwd(), 'storage');
const uploadsDir = path.join(storageRoot, 'uploads');
// Usar caminho absoluto direto para Windows
const mapsDir = 'D:\\cs2curss\\CS2-PRO\\mapas';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Verificar se a pasta de mapas existe
if (!fs.existsSync(mapsDir)) {
  console.warn(`⚠️ Pasta de mapas não encontrada: ${mapsDir}`);
  console.warn(`   Certifique-se de que a pasta existe e contém os arquivos de mapa.`);
} else {
  console.log(`✅ Pasta de mapas encontrada: ${mapsDir}`);
  // Listar arquivos na pasta para debug
  try {
    const files = fs.readdirSync(mapsDir);
    console.log(`   Arquivos encontrados: ${files.length}`);
    if (files.length > 0) {
      console.log(`   Primeiros arquivos: ${files.slice(0, 5).join(', ')}`);
    }
  } catch (err) {
    console.error(`   Erro ao ler pasta:`, err);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuid()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 450 * 1024 * 1024, // 450MB (limite máximo para arquivos .dem)
  },
  fileFilter: (_req, file, cb) => {
    // Validar se o arquivo é .dem
    if (!file.originalname.toLowerCase().endsWith('.dem')) {
      return cb(new Error('Apenas arquivos .dem são permitidos.'));
    }
    cb(null, true);
  },
});

const uploadsStore = new Map<string, UploadInfo>();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/upload', upload.single('demo'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado. Certifique-se de usar o campo "demo".' });
  }

  // Validação adicional: verificar tamanho (450MB)
  const maxSizeBytes = 450 * 1024 * 1024; // 450MB
  if (req.file.size > maxSizeBytes) {
    const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);
    return res.status(400).json({ 
      error: `Arquivo muito grande! O tamanho máximo permitido é 450MB. Seu arquivo tem ${fileSizeMB}MB.` 
    });
  }

  // Validação adicional: verificar extensão
  const fileName = req.file.originalname.toLowerCase();
  if (!fileName.endsWith('.dem')) {
    return res.status(400).json({ 
      error: 'Apenas arquivos .dem são permitidos.' 
    });
  }

  const uploadId = uuid();
  const sizeMB = Number((req.file.size / 1024 / 1024).toFixed(2));

  const uploadInfo: UploadInfo = {
    id: uploadId,
    storedFilename: req.file.filename,
    originalName: req.file.originalname,
    sizeMB,
    path: req.file.path,
    uploadedAt: new Date(),
  };

  uploadsStore.set(uploadId, uploadInfo);

  res.json({
    id: uploadInfo.id,
    name: uploadInfo.originalName,
    sizeMB: uploadInfo.sizeMB,
    uploadedAt: uploadInfo.uploadedAt,
  });
});

app.post('/analysis/start', (req: Request, res: Response) => {
  const { uploadId, steamId } = req.body as { uploadId?: string; steamId?: string };

  if (!uploadId || typeof uploadId !== 'string') {
    return res.status(400).json({ error: 'uploadId é obrigatório.' });
  }

  // Steam ID é opcional - se não fornecido, faz análise geral
  const targetSteamId = steamId && steamId.trim() !== '' ? steamId.trim() : undefined;

  const uploadInfo = uploadsStore.get(uploadId);

  if (!uploadInfo) {
    return res.status(404).json({ error: 'Upload não encontrado. Reenvie o arquivo.' });
  }

  // Para compatibilidade, ainda usamos 'player' como type, mas agora com steamId
  const job = createAnalysisJob(uploadInfo, 'player', targetSteamId);

  res.status(201).json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
  });
});

app.get('/analysis/:jobId/status', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const status = getJobStatus(jobId);

  if (!status) {
    return res.status(404).json({ error: 'Job não encontrado.' });
  }

  res.json(status);
});

app.get('/analysis/:jobId/result', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job não encontrado.' });
  }

  if (job.status === 'failed') {
    return res.status(500).json({ error: job.error ?? 'Análise falhou.' });
  }

  if (job.status !== 'completed' || !job.analysis) {
    return res.status(409).json({ error: 'Análise ainda não concluída.' });
  }

  res.json({ jobId, analysis: job.analysis });
});

app.post('/chat/rush', (req: Request, res: Response) => {
  const { message, uploadId, jobId } = req.body as {
    message?: string;
    uploadId?: string;
    jobId?: string;
  };

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message é obrigatório.' });
  }

  if (!uploadId) {
    return res.json({ reply: '❌ Primeiro envie uma demo pelo botão **UPLOAD** antes de conversar comigo.' });
  }

  const uploadInfo = uploadsStore.get(uploadId);
  const job = jobId ? getJob(jobId) : undefined;

  const reply = generateRushResponse({ message, upload: uploadInfo, job });
  res.json({ reply });
});

// Rota para servir arquivos de mapa da pasta local
app.get('/api/maps/:mapName', (req: Request, res: Response) => {
  // Decodificar o nome do mapa (pode vir codificado na URL)
  const mapNameRaw = decodeURIComponent(req.params.mapName);
  const normalizedMap = mapNameRaw.toLowerCase().trim();
  
  console.log(`🔍 Buscando mapa: "${mapNameRaw}" (normalizado: "${normalizedMap}")`);
  console.log(`📁 Pasta de mapas: ${mapsDir}`);
  
  // Garantir que o nome comece com 'de_' se não começar
  const mapNameWithPrefix = normalizedMap.startsWith('de_') ? normalizedMap : `de_${normalizedMap}`;
  const mapNameWithoutPrefix = normalizedMap.replace(/^de_/, '');
  
  // Possíveis nomes de arquivo (priorizando o padrão exato: de_{mapa}_radar_psd.png)
  const possibleFileNames = [
    `${mapNameWithPrefix}_radar_psd.png`, // Padrão principal: de_dust2_radar_psd.png
    `${normalizedMap}_radar_psd.png`,      // Se já vier com de_: de_dust2_radar_psd.png
    `${mapNameWithoutPrefix}_radar_psd.png`, // Se vier sem de_: dust2_radar_psd.png
    `${mapNameWithPrefix}.png`,
    `${mapNameWithPrefix}.jpg`,
    `${normalizedMap}.png`,
    `${normalizedMap}.jpg`,
    `${normalizedMap}_radar.png`,
    `de_${mapNameWithoutPrefix}_radar.png`,
    `${mapNameWithoutPrefix}_radar.png`,
  ];
  
  console.log(`📋 Tentativas de busca:`, possibleFileNames);
  
  // Tentar encontrar o arquivo
  for (const fileName of possibleFileNames) {
    const filePath = path.join(mapsDir, fileName);
    console.log(`   🔎 Tentando: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ Arquivo encontrado: ${filePath}`);
      // Verificar extensão para definir Content-Type
      const ext = path.extname(fileName).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      
      res.setHeader('Content-Type', contentType);
      // Desabilitar cache durante desenvolvimento para permitir atualizações imediatas
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(filePath);
    }
  }
  
  // Arquivo não encontrado - listar arquivos na pasta para debug
  console.error(`❌ Mapa não encontrado: ${mapNameRaw}`);
  console.error(`   Tentativas: ${possibleFileNames.join(', ')}`);
  console.error(`   Pasta: ${mapsDir}`);
  
  try {
    if (fs.existsSync(mapsDir)) {
      const files = fs.readdirSync(mapsDir);
      console.error(`   Arquivos na pasta (${files.length}):`, files.slice(0, 10).join(', '));
    } else {
      console.error(`   ⚠️ Pasta não existe: ${mapsDir}`);
    }
  } catch (err) {
    console.error(`   Erro ao ler pasta:`, err);
  }
  
  res.status(404).json({ 
    error: `Mapa não encontrado: ${mapNameRaw}`,
    attempts: possibleFileNames,
    mapsDir: mapsDir
  });
});

// Handler de erros do multer (tamanho de arquivo, tipo, etc.)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  
  // Erros do multer (tamanho de arquivo excedido, tipo inválido, etc.)
  if (err.message.includes('File too large') || err.message.includes('LIMIT_FILE_SIZE')) {
    return res.status(400).json({ 
      error: 'Arquivo muito grande! O tamanho máximo permitido é 450MB.' 
    });
  }
  
  if (err.message.includes('.dem') || err.message.includes('permitidos')) {
    return res.status(400).json({ 
      error: err.message || 'Apenas arquivos .dem são permitidos.' 
    });
  }
  
  res.status(500).json({ error: 'Erro interno inesperado.', details: err.message });
});

app.listen(PORT, () => {
  console.log(`⚡ CS2 analyzer backend rodando em http://localhost:${PORT}`);
});
