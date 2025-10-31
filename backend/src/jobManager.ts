import { v4 as uuid } from 'uuid';
import { AnalysisJob, AnalysisType, JobStatusResponse, UploadInfo } from './types';
import { buildMockAnalysis } from './mockAnalysis';

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
  };

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

  const totalProcessingTime = 6500 + Math.random() * 2000;
  setTimeout(() => finalizeJob(jobId), totalProcessingTime).unref();
};

const finalizeJob = (jobId: string) => {
  const job = jobs.get(jobId);
  if (!job) return;

  const interval = processingTimers.get(jobId);
  if (interval) {
    clearInterval(interval);
    processingTimers.delete(jobId);
  }

  try {
    job.analysis = buildMockAnalysis(job.type);
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
