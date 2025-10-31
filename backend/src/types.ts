export type AnalysisType = 'player' | 'team';

export type Trend = 'up' | 'down' | 'neutral';

export interface MetricCard {
  label: string;
  value: string;
  description: string;
  trend: Trend;
}

export interface HeatmapHotspot {
  zone: string;
  pressure: 'Alta' | 'Média' | 'Baixa';
  note: string;
}

export interface RadarPlayer {
  name: string;
  role: 't' | 'ct';
  x: number;
  y: number;
  action: string;
}

export interface RadarMoment {
  tick: number;
  clock: string;
  phase: 'início' | 'meio' | 'final';
  callout: string;
  highlight: string;
  players: RadarPlayer[];
}

export interface RoundHighlight {
  round: number;
  result: string;
  detail: string;
}

export interface EconomyStats {
  averageSpend: number;
  economyStrength: string;
  swings: string[];
}

export interface AnalysisData {
  type: AnalysisType;
  map: string;
  duration: string;
  rounds: number;
  mvp: string;
  rating?: number;
  score?: string;
  summary: string;
  keyFindings: string[];
  heatmapUrl: string;
  heatmapSummary: string;
  heatmapHotspots: HeatmapHotspot[];
  playerMetrics?: MetricCard[];
  teamMetrics?: MetricCard[];
  radarMoments: RadarMoment[];
  roundHighlights: RoundHighlight[];
  recommendations: string[];
  economy: EconomyStats;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface UploadInfo {
  id: string;
  storedFilename: string;
  originalName: string;
  sizeMB: number;
  path: string;
  uploadedAt: Date;
}

export interface AnalysisJob {
  id: string;
  uploadId: string;
  type: AnalysisType;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  analysis?: AnalysisData;
  error?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  error?: string;
}
