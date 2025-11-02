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

export interface PlayerStats {
  steamID: number;
  name: string;
  team: 'CT' | 'T';
  kills: number;
  deaths: number;
  assists: number;
  adr?: number;
  hsRate?: number;
  kdRatio?: number;
  damage?: number;
  roundsPlayed?: number;
}

export interface TeamStats {
  team: 'CT' | 'T';
  score: number;
  totalKills: number;
  totalDeaths: number;
  avgKDRatio: number;
  avgADR: number;
  bombPlants: number;
  bombDefuses: number;
  zonePerformance: ZonePerformance[];
}

export interface ZonePerformance {
  zone: string;
  kills: number;
  deaths: number;
  control: number; // 0-100%
}

export interface DetailedRound {
  round: number;
  winner: 'CT' | 'T';
  reason: number;
  time: number;
  keyEvents: string[];
  mvp?: string;
  detail: string;
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
  // Novos campos
  players: PlayerStats[];
  teams: TeamStats[];
  topPerformers: {
    mostKills: PlayerStats;
    mostAssists: PlayerStats;
    mostDamage: PlayerStats;
    bestKDRatio: PlayerStats;
  };
  detailedRounds: DetailedRound[];
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
