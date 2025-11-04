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

export interface TradeKill {
  round: number;
  time: number;
  victimSteamID: number;
  victimName: string;
  victim: string; // Para compatibilidade com frontend
  killedBySteamID: number;
  killedByName: string;
  killer: string; // Para compatibilidade com frontend
  tradedBy?: string;
  tradedBySteamID?: number;
  tradeTime?: number;
  failedTrades: Array<{
    player: string;
    playerSteamID: number;
    distance: number;
  }>;
  tradeType: 'successful' | 'failed';
}

export interface WeaponStats {
  weapon: string;
  kills: number;
  headshots: number;
  damage: number;
}

export interface EntryFrag {
  round: number;
  time: number;
  playerSteamID: number;
  playerName: string;
  killedSteamID: number;
  killedName: string;
  wonRound: boolean;
}

export interface ClutchSituation {
  round: number;
  playerSteamID: number;
  playerName: string;
  situation: '1v1' | '1v2' | '1v3' | '1v4' | '1v5';
  won: boolean;
  enemiesAlive: number;
  teammatesAlive: number;
}

export interface RoundPerformance {
  round: number;
  playerSteamID: number;
  kills: number;
  deaths: number;
  assists: number;
  wonRound: boolean;
}

export interface CriticalError {
  round: number;
  player: string;
  playerSteamID: number;
  type: 'bomb_carrier_death' | 'plant_failed' | 'clutch_lost' | 'early_death' | 'late_rotation';
  description: string;
}

export interface Highlight {
  round: number;
  player: string;
  playerSteamID: number;
  type: '3k' | '4k' | 'ace' | 'clutch_1v2' | 'clutch_1v3' | 'clutch_1v4' | 'clutch_1v5';
  description: string;
}

export interface TeamPlay {
  playerSteamID: number;
  assistsGiven: number;
  tradesGiven: number;
  tradesReceived: number;
  mostAssistedPlayer?: {
    playerSteamID: number;
    assists: number;
  };
  mostTradedBy?: {
    playerSteamID: number;
    trades: number;
  };
}

export interface PlayerRole {
  playerSteamID: number;
  primaryRole: string;
  roles: {
    entry: number;
    support: number;
    lurker: number;
    awper: number;
    rifler: number;
    anchor: number;
    igl: number;
  };
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
  // Trades
  successfulTrades?: number;
  failedTrades?: number;
  tradeKills?: TradeKill[];
  // Entry Frags / First Kill
  entryFrags?: number;
  entryFragWins?: number;
  entryFragLosses?: number;
  // Clutches
  clutch1v1Wins?: number;
  clutch1v1Losses?: number;
  clutch1v2Wins?: number;
  clutch1v2Losses?: number;
  clutch1v3Wins?: number;
  clutch1v3Losses?: number;
  clutch1v4Wins?: number;
  clutch1v4Losses?: number;
  clutch1v5Wins?: number;
  clutch1v5Losses?: number;
  clutch1v1Winrate?: number;
  clutch1v2Rate?: number;
  clutch1v3Rate?: number;
  // Kill Timings
  firstKillTiming?: number;
  // Round Performance
  consistencyScore?: number;
  avgKillsWin?: number;
  avgKillsLoss?: number;
  // Weapon Stats
  weaponStats?: WeaponStats[];
}

export interface TeamStats {
  team: 'CT' | 'T';
  teamName?: string; // Nome do time baseado no MVP
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
  roundHighlights: RoundHighlight[];
  recommendations: string[];
  economy: EconomyStats;
  // Novos campos
  players: PlayerStats[];
  teams: TeamStats[];
  topPerformers: {
    mostKills: PlayerStats;
    mostAssists: PlayerStats;
    mostDeaths: PlayerStats;
    mostDamage: PlayerStats;
    bestKDRatio: PlayerStats;
  };
  detailedRounds: DetailedRound[];
  // Novos campos para warmup/knife detection
  warmupRounds?: number;
  knifeRound?: boolean;
  source?: string; // "GC" ou "Valve"
  // Heatmap de kills e deaths
  killHeatmap?: Array<{ x: number; y: number; z: number; count: number }>;
  deathHeatmap?: Array<{ x: number; y: number; z: number; count: number }>;
  // Eventos de kill com posições para filtro
  killEventsWithPositions?: Array<{
    round: number;
    time: number;
    killerSteamID: number;
    killerName: string;
    killerPosition: { x: number; y: number; z: number } | null;
    victimSteamID: number;
    victimName: string;
    victimPosition: { x: number; y: number; z: number } | null;
  }>;
  // Estatísticas avançadas
  tradeKills?: TradeKill[];
  entryFrags?: EntryFrag[];
  clutchSituations?: ClutchSituation[];
  weaponStats?: WeaponStats[];
  killTimings?: Array<{ playerSteamID: number; playerName: string; averageTime: number }>;
  roundPerformances?: RoundPerformance[];
  criticalErrors?: CriticalError[];
  highlights?: Highlight[];
  teamPlay?: TeamPlay[];
  playerRoles?: PlayerRole[];
  aiSuggestions?: string[];
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
