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

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
    fileSize: 1024 * 1024 * 1024, // 1GB
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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno inesperado.', details: err.message });
});

app.listen(PORT, () => {
  console.log(`⚡ CS2 analyzer backend rodando em http://localhost:${PORT}`);
});
