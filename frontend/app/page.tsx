'use client';

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Upload, User, Users, MessageSquare, Check, Loader2, TrendingUp, Target, Award, Zap, AlertCircle, ArrowRight, Star, Crown, Sparkles, Send, Flame, Compass, BarChart3, Crosshair, Shield, Skull, TrendingDown, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type View = 'landing' | 'upload-area' | 'select-analysis' | 'processing' | 'results';
type Trend = 'up' | 'down' | 'neutral';
type AnalysisType = 'player' | 'team' | null;

interface UploadedDemo {
  id: string;
  name: string;
  sizeMB: number;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface MetricCard {
  label: string;
  value: string;
  description: string;
  trend: Trend;
}

interface RadarPlayer {
  name: string;
  role: 't' | 'ct';
  x: number;
  y: number;
  isAlive?: boolean; // Se o jogador está vivo
  action: string;
}

interface RadarEvent {
  type: 'kill' | 'bomb_planted' | 'bomb_defused';
  x: number;
  y: number;
  player?: string;
}

interface RadarMoment {
  tick: number;
  time?: number; // Tempo absoluto em segundos (para calcular delay real)
  clock: string;
  phase: 'início' | 'meio' | 'final';
  callout: string;
  highlight: string;
  players: RadarPlayer[];
  events?: RadarEvent[]; // ADICIONAR ESTA LINHA
}

interface RoundHighlight {
  round: number;
  result: string;
  detail: string;
}

interface HeatmapHotspot {
  zone: string;
  pressure: 'Alta' | 'Média' | 'Baixa';
  note: string;
}

interface EconomyStats {
  averageSpend: number;
  economyStrength: string;
  swings: string[];
}

interface TradeKill {
  round: number;
  time: number;
  victim: string;
  victimSteamID: number;
  killer: string;
  killerSteamID: number;
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

interface WeaponStats {
  weapon: string;
  kills: number;
  headshots: number;
  damage: number;
  usage: number;
}

interface EntryFrag {
  round: number;
  player: string;
  playerSteamID: number;
  target: string;
  targetSteamID: number;
  result: 'win' | 'loss';
  time: number;
}

interface ClutchSituation {
  round: number;
  player: string;
  playerSteamID: number;
  type: '1v1' | '1v2' | '1v3' | '1v4' | '1v5';
  result: 'win' | 'loss';
  enemiesAlive: number;
  alliesAlive: number;
  time: number;
}

interface PlayerStats {
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
  successfulTrades?: number;
  failedTrades?: number;
  tradeKills?: TradeKill[];
  weaponStats?: WeaponStats[];
  entryFrags?: number;
  entryFragWins?: number;
  entryFragLosses?: number;
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
  // Consistência
  avgKillsWin?: number;
  avgKillsLoss?: number;
  avgDeathsWin?: number;
  avgDeathsLoss?: number;
  consistencyScore?: number;
  firstKillTiming?: number;
}

interface TeamStats {
  team: 'CT' | 'T';
  teamName?: string;
  score: number;
  totalKills: number;
  totalDeaths: number;
  avgKDRatio: number;
  avgADR: number;
  bombPlants: number;
  bombDefuses: number;
  zonePerformance: Array<{
    zone: string;
    kills: number;
    deaths: number;
    control: number;
  }>;
}

interface DetailedRound {
  round: number;
  winner: 'CT' | 'T';
  reason: number;
  time: number;
  keyEvents: string[];
  mvp?: string;
  detail: string;
}

interface KillTiming {
  round: number;
  time: number;
  player: string;
  playerSteamID: number;
}

interface RoundPerformance {
  round: number;
  playerSteamID: number;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  wonRound: boolean;
  score: number;
}

interface CriticalError {
  round: number;
  player: string;
  playerSteamID: number;
  type: 'bomb_carrier_death' | 'plant_failed' | 'clutch_lost' | 'early_death' | 'late_rotation';
  description: string;
  time: number;
}

interface Highlight {
  round: number;
  type: '3k' | '4k' | 'ace' | 'clutch_1v2' | 'clutch_1v3' | 'clutch_1v4' | 'clutch_1v5';
  player: string;
  playerSteamID: number;
  description: string;
  time: number;
  kills: number;
}

interface TeamPlay {
  playerSteamID: number;
  assistsGiven: number;
  tradesReceived: number;
  tradesGiven: number;
  mostAssistedPlayer?: {
    playerSteamID: number;
    assists: number;
  };
  mostTradedBy?: {
    playerSteamID: number;
    trades: number;
  };
}

interface PlayerRole {
  playerSteamID: number;
  primaryRole: 'Entry Fragger' | 'Support' | 'Lurker' | 'AWPer' | 'IGL' | 'Rifler' | 'Anchor';
  roles: {
    entry: number;
    support: number;
    lurker: number;
    awper: number;
    igl: number;
    rifler: number;
    anchor: number;
  };
}

interface AnalysisData {
  type: 'player' | 'team';
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
  players?: PlayerStats[];
  teams?: TeamStats[];
  topPerformers?: {
    mostKills: PlayerStats;
    mostAssists: PlayerStats;
    mostDeaths: PlayerStats;
    mostDamage: PlayerStats;
    bestKDRatio: PlayerStats;
  };
  detailedRounds?: DetailedRound[];
  // Campos para warmup/knife detection
  warmupRounds?: number;
  knifeRound?: boolean;
  source?: string;
  // Dados de trades
  tradeKills?: TradeKill[];
  // Novas estatísticas
  weaponStats?: WeaponStats[];
  entryFrags?: EntryFrag[];
  clutchSituations?: ClutchSituation[];
  killHeatmap?: Array<{ x: number; y: number; z: number; count: number }>;
  deathHeatmap?: Array<{ x: number; y: number; z: number; count: number }>;
  killEventsWithPositions?: Array<{ 
    round?: number;
    killerSteamID?: number;
    killerTeam?: 'CT' | 'T';
    killerPosition?: { x: number; y: number; z: number };
    victimSteamID?: number;
    victimTeam?: 'CT' | 'T';
    victimPosition?: { x: number; y: number; z: number };
  }>;
  // Estatísticas avançadas
  roundPerformances?: RoundPerformance[];
  criticalErrors?: CriticalError[];
  highlights?: Highlight[];
  teamPlay?: TeamPlay[];
  playerRoles?: PlayerRole[];
  aiSuggestions?: string[];
}

// Componente para visualização 2D do Heatmap
interface Heatmap2DViewerProps {
  mapName: string;
  killHeatmap: Array<{ x: number; y: number; z: number; count: number }>;
  deathHeatmap: Array<{ x: number; y: number; z: number; count: number }>;
  playerSteamID?: number | null; // SteamID do jogador para filtrar (opcional)
  killEvents?: Array<{ 
    round?: number;
    killerSteamID?: number;
    killerTeam?: 'CT' | 'T';
    killerPosition?: { x: number; y: number; z: number };
    victimSteamID?: number;
    victimTeam?: 'CT' | 'T';
    victimPosition?: { x: number; y: number; z: number };
  }>; // Eventos de kill para filtrar
}

const Heatmap2DViewer: React.FC<Heatmap2DViewerProps> = ({ mapName, killHeatmap, deathHeatmap, playerSteamID, killEvents }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const radarImageRef = React.useRef<HTMLImageElement | null>(null);
  const [showKills, setShowKills] = React.useState(true);
  const [showDeaths, setShowDeaths] = React.useState(true);
  const [radarLoaded, setRadarLoaded] = React.useState(false);
  const [radarReloadKey, setRadarReloadKey] = React.useState(0);
  
  // Gerar heatmaps filtrados baseado no jogador selecionado
  const filteredKillHeatmap = React.useMemo(() => {
    if (!playerSteamID || !killEvents || killEvents.length === 0) {
      return killHeatmap; // Retornar heatmap original se não houver filtro
    }
    
    // Gerar novo heatmap apenas com kills do jogador selecionado
    const killPoints = new Map<string, number>();
    killEvents.forEach((event: any) => {
      // Verificar se o jogador selecionado foi o killer
      if (event.killerSteamID === playerSteamID && event.killerPosition) {
        const pos = event.killerPosition;
        const key = `${Math.floor(pos.x / 50)}_${Math.floor(pos.y / 50)}_${Math.floor(pos.z / 50)}`;
        killPoints.set(key, (killPoints.get(key) || 0) + 1);
      }
      // Fallback para estrutura antiga
      else if (event.killer?.steamID === playerSteamID && event.killer?.position) {
        const pos = event.killer.position;
        const key = `${Math.floor(pos.x / 50)}_${Math.floor(pos.y / 50)}_${Math.floor(pos.z / 50)}`;
        killPoints.set(key, (killPoints.get(key) || 0) + 1);
      }
    });
    
    return Array.from(killPoints.entries()).map(([key, count]) => {
      const [x, y, z] = key.split('_').map(Number);
      return { x: x * 50, y: y * 50, z: z * 50, count };
    });
  }, [playerSteamID, killEvents, killHeatmap]);
  
  const filteredDeathHeatmap = React.useMemo(() => {
    if (!playerSteamID || !killEvents || killEvents.length === 0) {
      return deathHeatmap; // Retornar heatmap original se não houver filtro
    }
    
    // Gerar novo heatmap apenas com deaths do jogador selecionado
    const deathPoints = new Map<string, number>();
    killEvents.forEach((event: any) => {
      // Verificar se o jogador selecionado foi a vítima
      // Suportar ambos os formatos (antigo e novo)
      const victimID = event.victimSteamID || event.victim?.steamID;
      const victimPos = event.victimPosition || event.victim?.position;
      
      if (victimID === playerSteamID && victimPos) {
        const pos = victimPos;
        const key = `${Math.floor(pos.x / 50)}_${Math.floor(pos.y / 50)}_${Math.floor(pos.z / 50)}`;
        deathPoints.set(key, (deathPoints.get(key) || 0) + 1);
      }
      // Fallback para estrutura antiga
      else if (event.victim?.steamID === playerSteamID && event.victim?.position) {
        const pos = event.victim.position;
        const key = `${Math.floor(pos.x / 50)}_${Math.floor(pos.y / 50)}_${Math.floor(pos.z / 50)}`;
        deathPoints.set(key, (deathPoints.get(key) || 0) + 1);
      }
    });
    
    return Array.from(deathPoints.entries()).map(([key, count]) => {
      const [x, y, z] = key.split('_').map(Number);
      return { x: x * 50, y: y * 50, z: z * 50, count };
    });
  }, [playerSteamID, killEvents, deathHeatmap]);

  // Configurações de transformação de coordenadas (world → radar) para cada mapa
  // Baseado nos valores oficiais do CS2 (de_dust2_radar.txt e JSON de overview)
  // Cada mapa tem um "overview transform" com OriginX, OriginY e Scale
  interface MapTransform {
    originX: number;
    originY: number;
    scale: number;
  }

  const radarTransforms: Record<string, MapTransform> = {
    'de_dust2': { originX: -2476, originY: 3239, scale: 5.25 },
    // de_inferno: Valores corrigidos baseados em pesquisa
    // Valores oficiais do CS2 para de_inferno
    'de_inferno': { originX: -2087, originY: 3870, scale: 5.15 },
    'de_mirage': { originX: -3230, originY: 1713, scale: 5.0 },
    'de_nuke': { originX: -3453, originY: 2887, scale: 7.0 },
    'de_overpass': { originX: -4831, originY: 1781, scale: 5.2 },
    'de_vertigo': { originX: -3168, originY: 1762, scale: 5.0 },
    // Valores padrão para mapas não listados (aproximações)
    'de_ancient': { originX: -2950, originY: 2168, scale: 5.0 },
    'de_anubis': { originX: -2856, originY: 2856, scale: 5.0 },
    'de_train': { originX: -3000, originY: 3000, scale: 5.0 },
    'de_cache': { originX: -3000, originY: 3000, scale: 5.0 },
  };

  // Configurações de heatmap por mapa (offset e tamanho de visualização)
  interface HeatmapConfig {
    offsetX: number;      // Offset X (positivo = direita, negativo = esquerda)
    offsetY: number;      // Offset Y (positivo = baixo, negativo = cima)
    blurRadius: number;  // Tamanho do raio de visualização dos pontos
    zoom: number;         // Zoom da visualização do radar (1.0 = normal, >1.0 = zoom in, <1.0 = zoom out)
  }

  const heatmapConfigs: Record<string, HeatmapConfig> = {
    // de_inferno: Configuração ajustada
    'de_inferno': {
      offsetX: 60,      // 80px para a direita (40px + 40px)
      offsetY: -20,     // 20px para cima (negativo porque Y cresce para baixo)
      blurRadius: 28,   // Raio de 28px
      zoom: 1.15        // Zoom de 10% (aumenta visualização em 10px equivalente)
    },
    // Outros mapas: usar valores padrão (serão ajustados conforme necessário)
    'de_overpass': {
      offsetX: 35,
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_dust2': {
      offsetX: 10,
      offsetY: -20,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_mirage': {
      offsetX: 16,      // 16px para a direita (12px + 4px)
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_nuke': {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_vertigo': {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_ancient': {
      offsetX: 7,
      offsetY: 25,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_anubis': {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_train': {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    },
    'de_cache': {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 25,
      zoom: 1.0
    }
  };

  // Obter configuração do mapa atual ou usar padrão
  const heatmapConfig = heatmapConfigs[mapName] || {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 25,
    zoom: 1.0
  };

  const transform = radarTransforms[mapName] || { originX: -3000, originY: 3000, scale: 5.0 };
  
  // Debug: Log da transformação usada
  console.log(`[HEATMAP] Map: ${mapName}, Transform:`, transform);
  console.log(`[HEATMAP] Kill points: ${killHeatmap?.length || 0}, Death points: ${deathHeatmap?.length || 0}`);

  // Carregar imagem de radar APENAS da pasta local
  React.useEffect(() => {
    // Resetar estado ao mudar o mapa ou forçar reload
    setRadarLoaded(false);
    radarImageRef.current = null;
    
    if (!mapName || mapName === 'unknown') {
      console.warn('⚠️ Nome do mapa não identificado:', mapName);
      return;
    }
    
    console.log('🔍 Carregando radar da pasta local para mapa:', mapName);
    
    const img = new Image();
    img.crossOrigin = null;
    
    // Buscar APENAS da pasta local com timestamp para evitar cache
    // O timestamp força o navegador a recarregar a imagem sempre que necessário
    const timestamp = Date.now();
    const localUrl = `http://localhost:4000/api/maps/${mapName}?t=${timestamp}&reload=${radarReloadKey}`;
    
    img.onload = () => {
      console.log(`✅ Radar carregado da pasta local: ${mapName}`);
      radarImageRef.current = img;
      setRadarLoaded(true);
    };
    
    img.onerror = () => {
      console.error(`❌ Falha ao carregar mapa da pasta local: ${mapName}`);
      console.error(`   Verifique se o arquivo existe em: D:\\cs2curss\\CS2-PRO\\mapas\\`);
      console.error(`   Nomes aceitos: ${mapName}.png, ${mapName}.jpg, ${mapName}_radar_psd.png, etc.`);
    };
    
    img.src = localUrl;
  }, [mapName, radarReloadKey]);

  // Função para converter coordenadas do mundo 3D CS2 para coordenadas do radar 2D
  // Baseado na fórmula correta: WorldToMap(x, y, transform)
  // mapX = (x - OriginX) / Scale
  // mapY = (OriginY - y) / Scale  // Note o sinal invertido no Y
  // O radar CS2 tem 1024x1024 pixels, com origem no centro (512, 512)
  // Os valores mapX e mapY retornados são relativos ao centro (-512 a +512)
  const worldToMap = (x: number, y: number, t: MapTransform): { mapX: number; mapY: number } => {
    const mapX = (x - t.originX) / t.scale;
    const mapY = (t.originY - y) / t.scale; // Y invertido
    return { mapX, mapY };
  };

  // Offset dinâmico calculado baseado nos dados (usando ref para evitar re-renders)
  const dynamicOffsetRef = React.useRef({ x: 512, y: 512 });
  
  // Função para converter coordenadas do mapa para coordenadas do canvas
  // O radar CS2 tem tamanho padrão de 1024x1024 pixels
  // A conversão WorldToMap retorna coordenadas do radar
  // Usamos offset dinâmico calculado baseado nos dados reais
  const worldToCanvas = (x: number, y: number, width: number, height: number) => {
    // Converter coordenadas do mundo para coordenadas do mapa
    const { mapX, mapY } = worldToMap(x, y, transform);
    
    // Usar offset dinâmico calculado baseado nos dados
    let radarX = mapX + dynamicOffsetRef.current.x;
    let radarY = mapY + dynamicOffsetRef.current.y;
    
    // Escalar para o tamanho do canvas (1024x1024 → width x height)
    let canvasX = (radarX / 1024) * width;
    let canvasY = (radarY / 1024) * height;
    
    // Garantir que fique dentro dos bounds do canvas
    return {
      x: Math.max(0, Math.min(width, canvasX)),
      y: Math.max(0, Math.min(height, canvasY)),
    };
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = 1024; // Tamanho padrão dos radares CS2
    const height = canvas.height = 1024;
    
    // Debug: Log dos dados recebidos
    console.log(`[HEATMAP RENDER] Map: ${mapName}, Transform:`, transform);
    console.log(`[HEATMAP RENDER] Kill heatmap points: ${killHeatmap?.length || 0}`);
    console.log(`[HEATMAP RENDER] Death heatmap points: ${deathHeatmap?.length || 0}`);
    if (killHeatmap && killHeatmap.length > 0) {
      console.log(`[HEATMAP RENDER] Sample kill point:`, killHeatmap[0]);
    }
    if (deathHeatmap && deathHeatmap.length > 0) {
      console.log(`[HEATMAP RENDER] Sample death point:`, deathHeatmap[0]);
    }

    // Limpar canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Desenhar imagem de radar de fundo se disponível
    if (radarImageRef.current && radarLoaded) {
      try {
        // Aplicar zoom se configurado (zoom > 1.0 = zoom in, aumenta visualização)
        const zoom = heatmapConfig.zoom || 1.0;
        if (zoom !== 1.0 && zoom > 1.0) {
          // Para zoom in, desenhar uma porção menor da imagem escalada para o tamanho do canvas
          // Isso cria o efeito de zoom (mostra menos área, mas ampliada)
          const sourceWidth = radarImageRef.current.width / zoom;
          const sourceHeight = radarImageRef.current.height / zoom;
          const sourceX = (radarImageRef.current.width - sourceWidth) / 2;
          const sourceY = (radarImageRef.current.height - sourceHeight) / 2;
          ctx.drawImage(
            radarImageRef.current,
            sourceX, sourceY, sourceWidth, sourceHeight,  // Área da imagem original
            0, 0, width, height  // Área no canvas
          );
          console.log(`✅ Imagem de radar desenhada no canvas com zoom ${zoom}`);
        } else {
          // Desenhar a imagem completa no canvas
          ctx.drawImage(radarImageRef.current, 0, 0, width, height);
          console.log('✅ Imagem de radar desenhada no canvas');
        }
      } catch (error) {
        console.error('❌ Erro ao desenhar imagem de radar:', error);
        // Fallback para grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
          const pos = (width / 10) * i;
          ctx.beginPath();
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, pos);
          ctx.lineTo(width, pos);
          ctx.stroke();
        }
      }
    } else {
      // Se não tiver imagem de radar, desenhar grid de referência
      if (!radarLoaded) {
        console.log('⚠️ Radar não carregado, usando grid de referência');
      }
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const pos = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(width, pos);
        ctx.stroke();
      }
    }

    // Criar heatmap contínuo com gradiente suave
    // Usar técnica de densidade de kernel (Kernel Density Estimation) para gradiente suave
    
    // Primeiro, criar um canvas temporário para desenhar os pontos com blur
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Limpar canvas temporário
    tempCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    tempCtx.fillRect(0, 0, width, height);
    
    // Usar heatmaps filtrados se houver filtro de jogador
    const displayKillHeatmap = filteredKillHeatmap || [];
    const displayDeathHeatmap = filteredDeathHeatmap || [];
    
    // Debug: Log dos heatmaps que serão desenhados e verificar coordenadas
    if (displayKillHeatmap.length === 0 && displayDeathHeatmap.length === 0) {
      console.warn('[HEATMAP RENDER] ⚠️ Nenhum ponto de heatmap para desenhar!');
      console.warn('[HEATMAP RENDER] KillHeatmap recebido:', killHeatmap?.length || 0, 'pontos');
      console.warn('[HEATMAP RENDER] DeathHeatmap recebido:', deathHeatmap?.length || 0, 'pontos');
    }
    
    // Calcular offset dinâmico baseado em TODOS os dados (não filtrados)
    // IMPORTANTE: Usar killHeatmap e deathHeatmap originais, não os filtrados!
    // Isso garante que o offset seja consistente mesmo quando há filtro de jogador
    let calculatedOffset = { x: 512, y: 512 };
    
    // Usar TODOS os dados (não filtrados) para calcular o offset base
    const allUnfilteredPoints = [...(killHeatmap || []), ...(deathHeatmap || [])];
    
    if (allUnfilteredPoints.length > 0) {
      const allCoords = allUnfilteredPoints.map(p => worldToMap(p.x, p.y, transform));
      
      const minX = Math.min(...allCoords.map(c => c.mapX));
      const maxX = Math.max(...allCoords.map(c => c.mapX));
      const minY = Math.min(...allCoords.map(c => c.mapY));
      const maxY = Math.max(...allCoords.map(c => c.mapY));
      
      console.log(`[HEATMAP DEBUG] Range de coordenadas Map (TODOS os dados): X[${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y[${minY.toFixed(1)}, ${maxY.toFixed(1)}]`);
      
      // Calcular offset necessário para alinhar os dados com o radar (1024x1024)
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      
      // Estratégia de alinhamento melhorada:
      // 1. Se o range é menor que 1024, centralizar normalmente
      // 2. Se o range é maior, ajustar para que o mínimo fique próximo de 0
      let baseOffsetX = 512 - centerX;
      let baseOffsetY = 512 - centerY;
      
      // Se o range é muito grande, pode ser melhor alinhar pelo mínimo
      if (rangeX > 1024) {
        // Alinhar mínimo próximo de 0, mas ainda considerar o centro
        baseOffsetX = (0 - minX) * 0.7 + (512 - centerX) * 0.3;
      }
      if (rangeY > 1024) {
        baseOffsetY = (0 - minY) * 0.7 + (512 - centerY) * 0.3;
      }
      
      calculatedOffset = { x: baseOffsetX, y: baseOffsetY };
      
      // Aplicar configuração específica do mapa (offset X e Y)
      calculatedOffset.x += heatmapConfig.offsetX;
      calculatedOffset.y += heatmapConfig.offsetY; // Y já está correto (negativo = cima)
      console.log(`[HEATMAP DEBUG] Configuração do mapa aplicada: offsetX=${heatmapConfig.offsetX}, offsetY=${heatmapConfig.offsetY}`);
      
      // Atualizar ref para uso em outras chamadas
      dynamicOffsetRef.current = calculatedOffset;
      console.log(`[HEATMAP DEBUG] Offset final (baseado em TODOS os dados): (${calculatedOffset.x.toFixed(1)}, ${calculatedOffset.y.toFixed(1)})`);
      console.log(`[HEATMAP DEBUG] Range: X=${rangeX.toFixed(1)}, Y=${rangeY.toFixed(1)}`);
      
      if (rangeX > 1024 || rangeY > 1024) {
        console.warn(`[HEATMAP DEBUG] ⚠️ Range muito grande! Pode ser que os valores de transform estejam errados.`);
      }
    } else {
      // Se não houver dados, usar offset padrão + configuração do mapa
      calculatedOffset.x = 512 + heatmapConfig.offsetX;
      calculatedOffset.y = 512 + heatmapConfig.offsetY;
      dynamicOffsetRef.current = calculatedOffset;
    }
    
    // Criar função worldToCanvas local que usa o offset calculado
    const worldToCanvasLocal = (x: number, y: number, w: number, h: number) => {
      const { mapX, mapY } = worldToMap(x, y, transform);
      const radarX = mapX + calculatedOffset.x;
      const radarY = mapY + calculatedOffset.y;
      const canvasX = (radarX / 1024) * w;
      const canvasY = (radarY / 1024) * h;
      return {
        x: Math.max(0, Math.min(w, canvasX)),
        y: Math.max(0, Math.min(h, canvasY)),
      };
    };
    
    // Calcular máximos para normalização
    let maxKills = 0;
    let maxDeaths = 0;
    if (showKills && displayKillHeatmap.length > 0) {
      maxKills = Math.max(...displayKillHeatmap.map(p => p.count));
      console.log(`[HEATMAP RENDER] Max kills: ${maxKills}, Total kill points: ${displayKillHeatmap.length}`);
    }
    if (showDeaths && displayDeathHeatmap.length > 0) {
      maxDeaths = Math.max(...displayDeathHeatmap.map(p => p.count));
      console.log(`[HEATMAP RENDER] Max deaths: ${maxDeaths}, Total death points: ${displayDeathHeatmap.length}`);
    }
    
    // Usar blurRadius da configuração do mapa
    const blurRadius = heatmapConfig.blurRadius;
    const intensityMultiplier = 1.2; // Multiplicador de intensidade reduzido
    
    // Desenhar kills (verde) com gradiente radial suave
    if (showKills && maxKills > 0) {
      displayKillHeatmap.forEach(point => {
        const pos = worldToCanvasLocal(point.x, point.y, width, height);
        const intensity = Math.min(point.count / maxKills, 1) * intensityMultiplier;
        
        // Criar gradiente radial para cada ponto
        const gradient = tempCtx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, blurRadius);
        const alpha = Math.min(0.15 + intensity * 0.85, 1);
        
        // Gradiente de verde mais compacto e preciso
        gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`); // Verde central intenso
        gradient.addColorStop(0.4, `rgba(34, 197, 94, ${alpha * 0.5})`); // Verde médio
        gradient.addColorStop(0.7, `rgba(74, 222, 128, ${alpha * 0.2})`); // Verde claro
        gradient.addColorStop(1, `rgba(74, 222, 128, 0)`); // Transparente na borda
        
        tempCtx.fillStyle = gradient;
        tempCtx.beginPath();
        tempCtx.arc(pos.x, pos.y, blurRadius, 0, Math.PI * 2);
        tempCtx.fill();
      });
    }
    
    // Desenhar deaths (vermelho) com gradiente radial suave
    if (showDeaths && maxDeaths > 0) {
      displayDeathHeatmap.forEach(point => {
        const pos = worldToCanvasLocal(point.x, point.y, width, height);
        const intensity = Math.min(point.count / maxDeaths, 1) * intensityMultiplier;
        
        // Criar gradiente radial para cada ponto
        const gradient = tempCtx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, blurRadius);
        const alpha = Math.min(0.15 + intensity * 0.85, 1);
        
        // Gradiente de vermelho mais compacto e preciso
        gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`); // Vermelho central intenso
        gradient.addColorStop(0.4, `rgba(239, 68, 68, ${alpha * 0.5})`); // Vermelho médio
        gradient.addColorStop(0.7, `rgba(248, 113, 113, ${alpha * 0.2})`); // Vermelho claro
        gradient.addColorStop(1, `rgba(248, 113, 113, 0)`); // Transparente na borda
        
        tempCtx.fillStyle = gradient;
        tempCtx.beginPath();
        tempCtx.arc(pos.x, pos.y, blurRadius, 0, Math.PI * 2);
        tempCtx.fill();
      });
    }
    
    // Copiar o canvas temporário para o canvas principal com composição para suavizar
    // Usar composição "screen" ou "lighter" para sobrepor gradientes suavemente
    ctx.globalCompositeOperation = 'lighter'; // Permite sobreposição aditiva de cores
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; // Resetar para modo normal
    
    // Aplicar overlay adicional para áreas de alta densidade (opcional)
    // Isso cria áreas mais intensas onde há sobreposição de pontos
    if (showKills && maxKills > 0) {
      displayKillHeatmap.forEach(point => {
        const pos = worldToCanvasLocal(point.x, point.y, width, height);
        const intensity = Math.min(point.count / maxKills, 1);
        
        // Adicionar ponto central mais intenso para áreas de alta atividade
        if (intensity > 0.5) {
          const coreGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
          coreGradient.addColorStop(0, `rgba(34, 197, 94, ${intensity * 0.9})`);
          coreGradient.addColorStop(1, `rgba(34, 197, 94, 0)`);
          ctx.fillStyle = coreGradient;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    
    if (showDeaths && maxDeaths > 0) {
      displayDeathHeatmap.forEach(point => {
        const pos = worldToCanvasLocal(point.x, point.y, width, height);
        const intensity = Math.min(point.count / maxDeaths, 1);
        
        // Adicionar ponto central mais intenso para áreas de alta atividade
        if (intensity > 0.5) {
          const coreGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
          coreGradient.addColorStop(0, `rgba(239, 68, 68, ${intensity * 0.9})`);
          coreGradient.addColorStop(1, `rgba(239, 68, 68, 0)`);
          ctx.fillStyle = coreGradient;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

  }, [filteredKillHeatmap, filteredDeathHeatmap, showKills, showDeaths, mapName, radarLoaded, transform]);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={showKills}
            onChange={(e) => setShowKills(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500"
          />
          <span className="text-sm">Mostrar Kills (Verde)</span>
        </label>
        <label className="flex items-center gap-2 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={showDeaths}
            onChange={(e) => setShowDeaths(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
          />
          <span className="text-sm">Mostrar Deaths (Vermelho)</span>
        </label>
      </div>

      {/* Canvas */}
      <div className="bg-black/40 rounded-xl p-4 border border-gray-800 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="w-full max-w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* Status do carregamento */}
        {!radarLoaded && mapName !== 'unknown' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Carregando radar do mapa...</p>
              <p className="text-gray-400 text-xs mt-1">{mapName}</p>
            </div>
          </div>
        )}
        {mapName === 'unknown' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <p className="text-white text-sm">Mapa não identificado</p>
              <p className="text-gray-400 text-xs mt-1">Impossível carregar radar</p>
            </div>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="bg-black/40 rounded-xl p-4 border border-gray-800">
        <p className="text-sm text-gray-400">
          <span className="text-green-400">●</span> Kills (Verde) • <span className="text-red-400">●</span> Deaths (Vermelho)
          <br />
          Mapa: <span className="text-white font-semibold">{mapName}</span>
          {radarLoaded && (
            <>
              <span className="ml-2 text-green-400">✓ Radar carregado</span>
              <button
                onClick={() => setRadarReloadKey(prev => prev + 1)}
                className="ml-3 px-2 py-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded text-orange-300 transition-colors"
                title="Recarregar radar (útil após editar a imagem)"
              >
                🔄 Recarregar
              </button>
            </>
          )}
          {!radarLoaded && mapName !== 'unknown' && (
            <span className="ml-2 text-yellow-400">⚠ Carregando radar...</span>
          )}
        </p>
      </div>
    </div>
  );
};

// Componente DemoPlayer2D removido completamente

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
type JobLifecycleStatus = JobStatus | 'idle';

interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  error?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const PARTICLE_COUNT = 30;

const createParticles = (): Particle[] => (
  Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }))
);

const trendCopy: Record<Trend, { label: string; color: string; icon: string }> = {
  up: { label: 'Acima da média', color: 'text-green-400', icon: '▲' },
  down: { label: 'Abaixo da média', color: 'text-red-400', icon: '▼' },
  neutral: { label: 'Estável', color: 'text-gray-400', icon: '▪' },
};

const trendBadgeClasses: Record<Trend, string> = {
  up: 'bg-green-500/15 border-green-500/40 text-green-300',
  down: 'bg-red-500/15 border-red-500/40 text-red-300',
  neutral: 'bg-gray-700/60 border-gray-600 text-gray-300',
};

const pressureBadgeClasses: Record<HeatmapHotspot['pressure'], string> = {
  Alta: 'bg-red-500/10 border-red-500/30 text-red-300',
  Média: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  Baixa: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
};

const API_BASE_URL = 'http://localhost:4000';

const CS2ProAnalyzerApp = () => {
  const [currentPage, setCurrentPage] = useState<View>('landing');
  const [uploadedDemo, setUploadedDemo] = useState<UploadedDemo | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  // Inicializar partículas apenas no cliente para evitar problemas de hidratação
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobLifecycleStatus>('idle');
  const [jobError, setJobError] = useState<string | null>(null);
  // Estados para a página de resultados (movidos para fora do condicional para evitar problemas de hidratação)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'players' | 'teams' | 'rounds' | 'heatmap' | 'chat'>('overview');
  const [teamComparison, setTeamComparison] = useState<'both' | 'ct' | 't'>('both');
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>('all'); // Filtro de jogador: 'all' ou steamID
  const [selectedPlayersForComparison, setSelectedPlayersForComparison] = useState<number[]>([]); // Jogadores selecionados para comparação
  const [hoveredPlayer, setHoveredPlayer] = useState<number | null>(null); // SteamID do jogador com hover

  // Função para extrair nomes dos times do nome do arquivo
  const extractTeamNames = (fileName: string): { team1?: string; team2?: string } | null => {
    const match = fileName.match(/team-([^_]+)__vs__team-([^_\.]+)/);
    if (match) {
      return {
        team1: match[1],
        team2: match[2],
      };
    }
    return null;
  };

  // Extrair nomes dos times do arquivo atual
  const teamNames = uploadedDemo ? extractTeamNames(uploadedDemo.name) : null;

  const metrics = useMemo<MetricCard[]>(() => {
    if (!analysis) return [];
    return analysis.playerMetrics ?? analysis.teamMetrics ?? [];
  }, [analysis]);

  // Gerar partículas apenas no cliente (após montagem)
  useEffect(() => {
    // Verificar se estamos no cliente (não no servidor SSR)
    if (typeof window !== 'undefined') {
      setIsClient(true);
      setParticles(createParticles());
    }
  }, []);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 60);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  useEffect(() => {
    if (!uploadedDemo) {
      setAnalysis(null);
      setAnalysisType(null);
      setChatMessages([]);
      setActiveJobId(null);
      setJobStatus('idle');
      setProgress(0);
      setJobError(null);
    }
  }, [uploadedDemo]);

  // Reset tab quando entrar na página de resultados
  useEffect(() => {
    if (currentPage === 'results' && analysis) {
      setSelectedTab('overview');
    }
  }, [currentPage, analysis]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação: Verificar se o arquivo é .dem
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.dem')) {
      const errorMessage = '❌ Arquivo inválido! Por favor, selecione um arquivo .dem válido.';
      setJobError(errorMessage);
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: errorMessage },
      ]);
      e.target.value = '';
      return;
    }

    // Validação: Verificar tamanho máximo (450MB)
    const maxSizeBytes = 450 * 1024 * 1024; // 450MB em bytes
    const fileSizeBytes = file.size;
    
    if (fileSizeBytes > maxSizeBytes) {
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
      const errorMessage = `❌ Arquivo muito grande! O tamanho máximo permitido é 450MB. Seu arquivo tem ${fileSizeMB}MB.`;
      setJobError(errorMessage);
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: errorMessage },
      ]);
      e.target.value = '';
      return;
    }

    // Validação: Verificar se o arquivo não está vazio
    if (fileSizeBytes === 0) {
      const errorMessage = '❌ Arquivo vazio! Por favor, selecione um arquivo válido.';
      setJobError(errorMessage);
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: errorMessage },
      ]);
      e.target.value = '';
      return;
    }

    // Limpar erros anteriores
    setJobError(null);

    const formData = new FormData();
    formData.append('demo', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha ao enviar a demo.');
      }

      const uploaded: UploadedDemo = {
        id: payload.id,
        name: payload.name,
        sizeMB: payload.sizeMB,
      };

      setUploadedDemo(uploaded);
      setJobStatus('queued');
      // Não iniciar automaticamente - aguardar clique no botão "Analisar"
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado no upload.';
      setJobError(message);
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: `⚠️ Não consegui enviar a demo: ${message}` },
      ]);
    } finally {
      e.target.value = '';
    }
  };

  const handleChatSubmit = async (
    event?:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    event?.preventDefault();
    if (!chatInput.trim()) return;

    const message = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatInput('');

    const lower = message.toLowerCase();

    // Se usuário mencionar análise ou iniciar, redireciona para página de análise
    if ((lower.includes('analis') || lower.includes('iniciar') || lower.includes('começar')) && uploadedDemo) {
      setCurrentPage('select-analysis');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat/rush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          uploadId: uploadedDemo?.id ?? null,
          jobId: activeJobId,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha ao receber resposta da RUSH.');
      }

      setChatMessages(prev => [...prev, { role: 'ai', text: payload.reply }]);
    } catch (error) {
      const messageError = error instanceof Error ? error.message : 'Erro inesperado na conversa.';
      setChatMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${messageError}` }]);
    }
  };

  const startAnalysis = async (steamIdInput?: string) => {
    if (!uploadedDemo) {
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: '⚠️ Faça upload de uma demo antes de iniciar a análise.' },
      ]);
      return;
    }

    setAnalysisType('player'); // Mantemos 'player' para compatibilidade
    setIsProcessing(true);
    setProgress(0);
    setAnalysis(null);
    setJobError(null);
    setCurrentPage('processing');
    setJobStatus('processing');

    // Sempre análise geral (sem SteamID)
    const requestBody: { uploadId: string } = { uploadId: uploadedDemo.id };

    try {
      const response = await fetch(`${API_BASE_URL}/analysis/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Falha ao iniciar a análise.');
      }

      setActiveJobId(payload.jobId);
      setJobStatus(payload.status ?? 'processing');
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: '⚙️ Iniciei a análise. Vou avisar quando terminar!' },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao iniciar a análise.';
      setJobError(message);
      setIsProcessing(false);
      setJobStatus('idle');
      setCurrentPage('select-analysis');
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: `⚠️ ${message}` },
      ]);
    }
  };

  useEffect(() => {
    if (!isProcessing || !activeJobId) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analysis/${activeJobId}/status`);
        const payload: JobStatusResponse & { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Falha ao consultar o status do job.');
        }

        if (cancelled) return;

        setProgress(payload.progress);
        setJobStatus(payload.status);

        if (payload.status === 'failed') {
          const errorMessage = payload.error ?? 'Análise falhou.';
          setIsProcessing(false);
          setJobError(errorMessage);
          setCurrentPage('select-analysis');
          setChatMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${errorMessage}` }]);
          return;
        }

        if (payload.status === 'completed') {
          const resultResponse = await fetch(`${API_BASE_URL}/analysis/${activeJobId}/result`);
          const resultPayload = await resultResponse.json();

          if (!resultResponse.ok) {
            throw new Error(resultPayload.error ?? 'Falha ao recuperar o relatório.');
          }

          if (cancelled) return;

          setAnalysis(resultPayload.analysis as AnalysisData);
          setIsProcessing(false);
          setProgress(100);
          setCurrentPage('results');
          setChatMessages(prev => [...prev, { role: 'ai', text: '✅ Análise concluída! Confira os resultados completos.' }]);
          return;
        }

        timeoutId = setTimeout(fetchStatus, 1500);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Erro ao monitorar o job.';
        setJobError(message);
        setIsProcessing(false);
        setJobStatus('idle');
        setCurrentPage('select-analysis');
        setChatMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${message}` }]);
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isProcessing, activeJobId]);

  // ==================== LANDING PAGE ====================
  if (currentPage === 'landing') {
    return (
      <div 
        className="min-h-screen bg-black relative overflow-hidden"
        style={{ backgroundImage: 'url(https://images8.alphacoders.com/132/thumb-1920-1329760.jpeg)' }}
      >
        {/* Particles Background - só renderizar no cliente */}
        {isClient && particles.length > 0 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute bg-orange-500 rounded-full opacity-30"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s`,
                }}
              />
            ))}
          </div>
        )}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(15px, -20px); }
            66% { transform: translate(-15px, -35px); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 25px rgba(249, 115, 22, 0.5), 0 0 50px rgba(249, 115, 22, 0.3); }
            50% { box-shadow: 0 0 45px rgba(249, 115, 22, 0.7), 0 0 90px rgba(249, 115, 22, 0.4); }
          }
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .glow-orange { 
            animation: pulse-glow 3s ease-in-out infinite;
            will-change: box-shadow;
            backface-visibility: hidden;
            transform: translateZ(0);
          }
          .shimmer {
            background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.3), transparent);
            background-size: 200% 100%;
            animation: shimmer 3s infinite;
          }
        `}</style>

        {/* Hero Section with CS2 Banner */}
        <div 
          className="relative h-screen bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images8.alphacoders.com/132/thumb-1920-1329760.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black"></div>
          
          {/* Navigation */}
          <nav className="relative z-10 p-6 flex justify-between items-center animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-xl shadow-orange-500/50 hover:scale-110 hover:rotate-3 transition-all duration-300">
                <Target className="w-8 h-8 text-black" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                CS2<span className="text-orange-500">PRO</span>
              </h1>
            </div>
            <button 
              onClick={() => setCurrentPage('upload-area')}
              className="relative bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black px-8 py-3 rounded-xl font-black shadow-xl hover:shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/80 transition-all duration-300 hover:scale-110 glow-orange overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Começar
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="absolute inset-0 shimmer"></div>
            </button>
          </nav>

          {/* Hero Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col items-center justify-center h-[calc(100vh-100px)]">
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center gap-2 bg-red-500/20 border-2 border-red-500 rounded-full px-6 py-2 mb-8 animate-blink">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-black text-sm tracking-wider">⚠️ PARE DE JOGAR NO ESCURO</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
                Você Está <span className="text-orange-500 animate-pulse inline-block">Perdendo</span><br/>
                <span className="text-5xl md:text-6xl">Por Falta de Análise</span>
              </h2>
              
              <p className="text-2xl md:text-3xl text-gray-200 mb-10 max-w-4xl mx-auto drop-shadow-lg font-medium">
                Enquanto você joga no <span className="line-through text-red-500">feeling</span>, seus adversários usam 
                <span className="text-orange-500 font-black"> IA profissional</span> para dominar
              </p>
              
              <button 
                onClick={() => setCurrentPage('upload-area')}
                className="group relative bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-black px-16 py-7 rounded-2xl text-2xl font-black shadow-2xl transition-all duration-500 hover:scale-110 glow-orange overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Sparkles className="w-7 h-7 group-hover:rotate-180 transition-transform duration-500" />
                  Melhorar Agora
                  <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 shimmer"></div>
              </button>
            </div>

            {/* Stats Icons */}
            <div className="grid grid-cols-3 gap-12 mt-20 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {[
                { value: '10x', label: 'Mais Rápido', icon: '⚡', color: 'from-yellow-400 to-orange-500' },
                { value: 'IA', label: 'Gemini Pro', icon: '✨', color: 'from-purple-400 to-pink-500' },
                { value: '24/7', label: 'Coaching', icon: '🎯', color: 'from-blue-400 to-cyan-500' }
              ].map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className={`w-24 h-24 bg-gradient-to-br ${stat.color} rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-orange-500/40 group-hover:border-orange-500 group-hover:scale-110 transition-all duration-300 shadow-xl shadow-orange-500/30`}>
                    <span className="text-5xl">{stat.icon}</span>
                  </div>
                  <p className="text-7xl font-black text-orange-500 mb-2 group-hover:scale-110 transition-transform duration-300">{stat.value}</p>
                  <p className="text-gray-300 font-bold text-lg">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Problem Section */}
        <div className="relative bg-gradient-to-b from-black via-gray-900 to-black py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-4 border-red-500 rounded-3xl p-14 mb-20 animate-scale-in hover:scale-[1.02] transition-transform duration-300 shadow-2xl shadow-red-500/20">
              <div className="flex items-start gap-6 mb-8">
                <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse shadow-xl shadow-red-500/50">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h3 className="text-5xl font-black text-white mb-4 leading-tight">Você Está Cometendo os Mesmos Erros</h3>
                  <p className="text-2xl text-gray-300 leading-relaxed">
                    Sem análise profissional, você repete os mesmos erros de posicionamento, economia e timing. 
                    <span className="text-red-400 font-black"> Seus oponentes sabem disso.</span>
                  </p>
                </div>
              </div>
              <ul className="space-y-5 text-gray-200 text-xl">
                {[
                  'Morrendo nos mesmos ângulos toda partida',
                  'Perdendo rounds que deveria ganhar (e não sabe por quê)',
                  'Jogando "no feeling" enquanto outros usam dados científicos'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 hover:translate-x-3 transition-transform duration-300">
                    <span className="text-red-500 text-4xl font-black">×</span>
                    <span className="font-bold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="text-6xl font-black text-center text-white mb-20 animate-slide-up">
              Por Que <span className="text-orange-500">NÃO</span> Usar Outras Ferramentas?
            </h3>

            <div className="grid md:grid-cols-2 gap-10 mb-20">
              {[
                {
                  title: 'CS Demo Manager',
                  emoji: '😴',
                  issues: [
                    'Sem análise por IA inteligente',
                    'Interface complexa e lenta',
                    'Você precisa interpretar os dados sozinho',
                    'Zero insights sobre como melhorar'
                  ]
                },
                {
                  title: 'Análise Manual no Jogo',
                  emoji: '😰',
                  issues: [
                    'Leva horas para encontrar seus erros',
                    'Viés pessoal cega suas falhas',
                    'Impossível comparar com profissionais',
                    'Você não sabe o que procurar'
                  ]
                }
              ].map((tool, i) => (
                <div key={i} className="group bg-gray-900/50 border-2 border-gray-800 hover:border-orange-500/60 rounded-3xl p-10 transition-all duration-300 hover:scale-105 animate-scale-in shadow-xl hover:shadow-orange-500/20" style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                      <span className="text-5xl">{tool.emoji}</span>
                    </div>
                    <h4 className="text-3xl font-black text-white">{tool.title}</h4>
                  </div>
                  <ul className="space-y-4 text-gray-400 text-lg">
                    {tool.issues.map((issue, j) => (
                      <li key={j} className="flex items-start gap-3 hover:translate-x-2 transition-transform duration-200">
                        <span className="text-red-500 mt-1 text-xl">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Solution Box */}
            <div className="relative bg-gradient-to-r from-orange-500/20 via-orange-600/20 to-orange-500/20 border-4 border-orange-500 rounded-3xl p-20 text-center overflow-hidden group hover:scale-[1.02] transition-transform duration-300 glow-orange shadow-2xl shadow-orange-500/30">
              <div className="absolute inset-0 shimmer"></div>
              <Crown className="relative z-10 w-28 h-28 text-orange-500 mx-auto mb-10 animate-bounce" />
              <h3 className="relative z-10 text-6xl font-black text-white mb-8">CS2 PRO: A Única com IA Real</h3>
              <p className="relative z-10 text-2xl text-gray-200 mb-10 max-w-3xl mx-auto font-medium leading-relaxed">
                Upload → Análise (Player/Team) → IA Processa → Chat para Dúvidas
              </p>
              <button 
                onClick={() => setCurrentPage('upload-area')}
                className="relative z-10 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black px-16 py-7 rounded-2xl text-2xl font-black shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/80 transition-all duration-300 hover:scale-110 glow-orange"
              >
                Começar Agora - Primeira Demo Grátis
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gray-900 py-28">
          <div className="max-w-6xl mx-auto px-6">
            <h3 className="text-6xl font-black text-center text-white mb-24 animate-slide-up">
              O Que Você Recebe <span className="text-orange-500">Hoje</span>
            </h3>
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { icon: Upload, title: 'Upload Instantâneo', desc: 'Arraste sua .dem e pronto. Processa em menos de 30 segundos.', delay: '0s' },
                { icon: Target, title: 'Análise Profunda', desc: 'Uma Análise completa estratégica de time completa ou filtrada por jogador.', delay: '0.15s' },
                { icon: MessageSquare, title: 'Chat IA Coach', desc: 'Pergunte qualquer coisa sobre sua partida. A IA responde como um coach profissional, nosso mascote RUSH tem as respostas para suas dúvidas.', delay: '0.3s' }
              ].map((feature, i) => (
                <div key={i} className="group bg-black border-2 border-gray-800 hover:border-orange-500 rounded-3xl p-12 transition-all duration-300 hover:scale-110 hover:-translate-y-3 animate-scale-in shadow-xl hover:shadow-orange-500/30" style={{ animationDelay: feature.delay }}>
                  <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xl shadow-orange-500/50">
                    <feature.icon className="w-12 h-12 text-black" />
                  </div>
                  <h4 className="text-3xl font-black text-white mb-5">{feature.title}</h4>
                  <p className="text-gray-400 text-lg leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-black py-32 border-t-4 border-orange-500">
          <div className="max-w-5xl mx-auto text-center px-6">
            <h3 className="text-7xl font-black text-white mb-10 animate-slide-up leading-tight">
              Pare de <span className="text-red-500 line-through">Perder Tempo</span><br/>
              Comece a <span className="text-orange-500">Dominar</span>
            </h3>
            <p className="text-3xl text-gray-300 mb-14 animate-slide-up font-medium" style={{ animationDelay: '0.1s' }}>
              Cada demo não analisada é uma oportunidade perdida de melhorar
            </p>
            <button 
              onClick={() => setCurrentPage('upload-area')}
              className="group bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-black px-20 py-8 rounded-2xl text-3xl font-black shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/100 transition-all duration-300 hover:scale-110 glow-orange animate-scale-in overflow-hidden" style={{ animationDelay: '0.2s' }}>
              <span className="relative z-10 flex items-center gap-4">
                <Star className="w-10 h-10 fill-black group-hover:rotate-180 transition-transform duration-500" />
                Começar Análise Agora
                <ArrowRight className="w-10 h-10 group-hover:translate-x-3 transition-transform" />
              </span>
              <div className="absolute inset-0 shimmer"></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== UPLOAD AREA PAGE ====================
  if (currentPage === 'upload-area') {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Particles - só renderizar no cliente */}
        {isClient && particles.length > 0 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute bg-orange-500 rounded-full opacity-30"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s`,
                }}
              />
            ))}
          </div>
        )}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(15px, -20px); }
            66% { transform: translate(-15px, -35px); }
          }
          @keyframes pulse-glow {
            0%, 100% { 
              box-shadow: 0 0 25px rgba(249, 115, 22, 0.5), 0 0 50px rgba(249, 115, 22, 0.3);
              opacity: 1;
            }
            50% { 
              box-shadow: 0 0 45px rgba(249, 115, 22, 0.7), 0 0 90px rgba(249, 115, 22, 0.4);
              opacity: 0.95;
            }
          }
          .glow-orange { 
            animation: pulse-glow 3s ease-in-out infinite;
            will-change: box-shadow;
            backface-visibility: hidden;
            transform: translateZ(0);
          }
        `}</style>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <div className="p-6 flex justify-between items-center">
            <button 
              onClick={() => setCurrentPage('landing')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
            >
              <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                <Target className="w-7 h-7 text-black" />
              </div>
              <h1 className="text-2xl font-black text-white">
                CS2<span className="text-orange-500">PRO</span>
              </h1>
            </div>
          </div>

          {/* Main Upload Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-96">
            <div className="w-full max-w-4xl">
              <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 rounded-3xl p-16 text-center shadow-2xl shadow-orange-500/20">
                <div className="mb-10">
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-orange-500/50 glow-orange">
                    <Upload className="w-16 h-16 text-black" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4">Upload Sua Demo</h2>
                  <p className="text-xl text-gray-400 mb-4">Arraste ou clique para selecionar arquivo .dem</p>
                  <p className="text-sm text-gray-500 mb-8">Tamanho máximo: 450MB</p>
                  
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept=".dem" 
                      onChange={handleUpload} 
                      className="hidden" 
                    />
                    <div className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black px-16 py-6 rounded-2xl text-2xl font-black shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/80 transition-all duration-300 hover:scale-110 glow-orange">
                      UPLOAD
                    </div>
                  </label>
                </div>

                {uploadedDemo && (
                  <>
                    <div className="bg-black/50 border border-orange-500/30 rounded-xl p-6 mt-8 animate-scale-in">
                      <div className="flex items-center justify-center gap-3">
                        <Check className="w-6 h-6 text-green-400" />
                        <span className="text-white font-bold">{uploadedDemo.name}</span>
                        <span className="text-gray-400">({uploadedDemo.sizeMB}MB)</span>
                      </div>
                    </div>

                    {/* Botão Analisar */}
                    <div className="mt-6">
                      <button
                        onClick={() => startAnalysis()}
                        disabled={isProcessing || jobStatus === 'processing'}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-16 py-6 rounded-2xl text-2xl font-black shadow-2xl shadow-green-500/50 hover:shadow-green-500/80 transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-60"
                      >
                        {isProcessing || jobStatus === 'processing' ? 'Analisando...' : 'ANALISAR'}
                      </button>
                    </div>
                  </>
                )}

                {jobError && (
                  <div className="mt-6 text-sm text-red-400 font-semibold">
                    {jobError}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }


  // ==================== PROCESSING PAGE ====================
  if (currentPage === 'processing') {
    // Determinar etapa atual baseada no progresso
    const getCurrentStep = () => {
      if (progress < 20) return 0;
      if (progress < 40) return 1;
      if (progress < 70) return 2;
      if (progress < 90) return 3;
      return 4;
    };

    const steps = [
      { label: 'Processando arquivo demo', description: 'Lendo e validando estrutura do arquivo .dem' },
      { label: 'Extraindo eventos', description: 'Coletando kills, deaths, rounds e eventos da partida' },
      { label: 'Calculando estatísticas', description: 'Processando trades, clutches, first kills e análises avançadas' },
      { label: 'Gerando relatório com IA', description: 'IA analisando e criando insights profissionais' },
      { label: 'Finalizando', description: 'Preparando visualização dos resultados' },
    ];

    const currentStep = getCurrentStep();
    const statusMessages: Record<string, string> = {
      idle: 'Aguardando',
      queued: 'Na fila de processamento',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou',
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 animate-fade-in">
        <div className="max-w-2xl w-full bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 rounded-3xl p-8 sm:p-12 text-center shadow-2xl shadow-orange-500/20 animate-scale-in">
          {/* Animated Loader */}
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full animate-pulse shadow-2xl shadow-orange-500/50"></div>
            <Loader2 className="relative w-28 h-28 text-black animate-spin" />
          </div>
          
          {/* Title */}
          <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 animate-slide-in">Processando Demo</h3>
          <p className="text-gray-400 mb-6 text-lg sm:text-xl animate-fade-in-delay">
            Analisando <span className="text-orange-500 font-bold">{uploadedDemo?.name}</span>
          </p>
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/50 rounded-full px-4 py-2 mb-8 animate-fade-in-delay-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-orange-400 font-semibold uppercase tracking-wider">
              {statusMessages[jobStatus] || 'Processando'}
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-8 animate-fade-in-delay-2">
            <div className="bg-black/50 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 h-full shadow-lg shadow-orange-500/50 transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 shimmer"></div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">{Math.round(progress)}% concluído</p>
          </div>
          
          {/* Steps List */}
          <div className="space-y-4 text-left animate-fade-in-delay-3">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isActive = index === currentStep;
              const isPending = index > currentStep;
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : isActive
                      ? 'bg-orange-500/10 border border-orange-500/30 scale-105'
                      : 'bg-gray-800/30 border border-gray-700/30 opacity-60'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    ) : isActive ? (
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-600"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-base sm:text-lg font-semibold mb-1 ${
                      isCompleted ? 'text-green-400' : isActive ? 'text-orange-400' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== RESULTS PAGE ====================
  if (currentPage === 'results' && analysis) {
    
    const players = analysis.players || [];
    
    // Atualizar nomes dos times com os nomes reais extraídos do arquivo
    let teams = analysis.teams || [];
    if (teamNames) {
      teams = teams.map(team => {
        const updatedTeam = { ...team };
        // Atualizar teamName com os nomes reais dos times do arquivo
        // Assumir que team1 começa em CT e team2 em T (troca após 12 rounds)
        if (team.team === 'CT') {
          updatedTeam.teamName = teamNames.team1 || updatedTeam.teamName || 'Counter-Terrorists';
        } else {
          updatedTeam.teamName = teamNames.team2 || updatedTeam.teamName || 'Terrorists';
        }
        return updatedTeam;
      });
    }
    
    const topPerformers = analysis.topPerformers;
    const detailedRounds = analysis.detailedRounds || analysis.roundHighlights.map(r => ({
      round: r.round,
      winner: (r.result.includes('CT') ? 'CT' : 'T') as 'CT' | 'T',
      reason: 0,
      time: 0,
      keyEvents: [],
      detail: r.detail,
    }));

    // Função para calcular distância entre dois pontos
    const distance = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number => {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    };

    // Função para identificar bombsite/zona do mapa baseado em coordenadas
    const getMapZone = (x: number, y: number, z: number, mapName: string): string => {
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      
      // Coordenadas aproximadas dos bombsites (baseadas em dados reais de CS2)
      // Formato: { x, y, z, radius }
      const mapSites: Record<string, { siteA: { x: number; y: number; z: number; radius: number }, siteB: { x: number; y: number; z: number; radius: number } }> = {
        'de_mirage': {
          siteA: { x: 2000, y: 700, z: 0, radius: 800 },
          siteB: { x: -2000, y: 700, z: 0, radius: 800 },
        },
        'de_dust2': {
          siteA: { x: 0, y: 2000, z: 0, radius: 600 },
          siteB: { x: -2000, y: 2000, z: 0, radius: 600 },
        },
        'de_inferno': {
          siteA: { x: 2500, y: 0, z: 0, radius: 700 },
          siteB: { x: -2500, y: 0, z: 0, radius: 700 },
        },
        'de_ancient': {
          siteA: { x: 1500, y: 2000, z: 0, radius: 700 },
          siteB: { x: -2000, y: 2000, z: 0, radius: 700 },
        },
        'de_vertigo': {
          siteA: { x: 0, y: 2500, z: 500, radius: 800 },
          siteB: { x: 0, y: -2500, z: 500, radius: 800 },
        },
        'de_anubis': {
          siteA: { x: 2000, y: 2000, z: 0, radius: 700 },
          siteB: { x: -2000, y: 2000, z: 0, radius: 700 },
        },
        'de_overpass': {
          siteA: { x: 2500, y: 0, z: 0, radius: 700 },
          siteB: { x: -2500, y: 0, z: 0, radius: 700 },
        },
        'de_nuke': {
          siteA: { x: 2000, y: 2000, z: 0, radius: 700 },
          siteB: { x: -2000, y: 2000, z: 0, radius: 700 },
        },
      };
      
      const sites = mapSites[mapName];
      
      // Se temos sites específicos do mapa, usar distância
      if (sites) {
        const distA = distance(x, y, z, sites.siteA.x, sites.siteA.y, sites.siteA.z);
        const distB = distance(x, y, z, sites.siteB.x, sites.siteB.y, sites.siteB.z);
        
        if (distA <= sites.siteA.radius) return 'Site A';
        if (distB <= sites.siteB.radius) return 'Site B';
        
        // Verificar se está próximo de um dos sites (mas não dentro)
        if (distA < distB + 500 && distA < 1500) return 'Long A';
        if (distB < distA + 500 && distB < 1500) return 'Long B';
      }
      
      // Fallback melhorado: usar coordenadas relativas
      // A maioria dos mapas tem Site A no lado positivo de X e Site B no lado negativo
      if (absX > 1000) {
        // Está longe do centro, provavelmente em um bombsite
        if (x > 500) return 'Long A'; // Lado positivo = Site A
        if (x < -500) return 'Long B'; // Lado negativo = Site B
      }
      
      // Área central = Mid
      if (absX < 1000 && absY < 1000) {
        return 'Mid';
      }
      
      // Áreas extremas = Spawn
      if (absY > 2000) return 'Spawn';
      
      return 'Other';
    };

    // Função para determinar se uma kill foi em área "agressiva" (território inimigo)
    const isAggressiveKill = (
      killPosition: { x: number; y: number; z: number },
      killerTeam: 'CT' | 'T',
      round: number,
      mapName: string
    ): boolean => {
      const zone = getMapZone(killPosition.x, killPosition.y, killPosition.z, mapName);
      
      // Determinar qual lado do mapa é controlado por qual time baseado no round
      // Rounds 1-12: CT controla lado positivo (X > 0), T controla lado negativo (X < 0)
      // Rounds 13+: CT controla lado negativo (X < 0), T controla lado positivo (X > 0)
      const isFirstHalf = round <= 12;
      
      // Determinar se a kill foi no lado "oposto" (território inimigo)
      // Uma kill é agressiva se foi feita no lado do mapa que o time inimigo normalmente controla
      
      if (killerTeam === 'CT') {
        if (isFirstHalf) {
          // CT no primeiro half controla lado positivo (X > 0)
          // Kill agressiva = lado negativo (X < 0) OU Site B OU Long B OU Mid em território inimigo
          if (zone === 'Site B' || zone === 'Long B') return true;
          // Kill em X negativo = território T (agressivo)
          if (killPosition.x < -500) return true;
          // Kill no meio do mapa mas longe do centro CT = agressivo
          if (zone === 'Mid' && killPosition.x < -200) return true;
          return false;
        } else {
          // CT no segundo half controla lado negativo (X < 0) após troca
          // Kill agressiva = lado positivo (X > 0) OU Site A OU Long A
          if (zone === 'Site A' || zone === 'Long A') return true;
          // Kill em X positivo = território T (agressivo)
          if (killPosition.x > 500) return true;
          // Kill no meio do mapa mas longe do centro CT = agressivo
          if (zone === 'Mid' && killPosition.x > 200) return true;
          return false;
        }
      } else {
        // T (Terrorists)
        if (isFirstHalf) {
          // T no primeiro half controla lado negativo (X < 0)
          // Kill agressiva = lado positivo (X > 0) OU Site A OU Long A OU Mid em território inimigo
          if (zone === 'Site A' || zone === 'Long A') return true;
          // Kill em X positivo = território CT (agressivo)
          if (killPosition.x > 500) return true;
          // Kill no meio do mapa mas longe do centro T = agressivo
          if (zone === 'Mid' && killPosition.x > 200) return true;
          return false;
        } else {
          // T no segundo half controla lado positivo (X > 0) após troca
          // Kill agressiva = lado negativo (X < 0) OU Site B OU Long B
          if (zone === 'Site B' || zone === 'Long B') return true;
          // Kill em X negativo = território CT (agressivo)
          if (killPosition.x < -500) return true;
          // Kill no meio do mapa mas longe do centro T = agressivo
          if (zone === 'Mid' && killPosition.x < -200) return true;
          return false;
        }
      }
    };

    // Função para calcular estatísticas do jogador (bombsite, agressividade)
    const calculatePlayerInsights = (playerSteamID: number) => {
      if (!analysis?.killEventsWithPositions || !analysis.map) {
        return null;
      }

      const player = players.find(p => p.steamID === playerSteamID);
      if (!player) return null;

      const bombsiteCounts: Record<string, number> = { 'Site A': 0, 'Site B': 0, 'Mid': 0, 'Other': 0 };
      let aggressiveKills = 0;
      let totalKills = 0;
      let killsInOwnTerritory = 0;

      // Analisar kills do jogador
      analysis.killEventsWithPositions.forEach((event: any) => {
        if (event.killerSteamID === playerSteamID && event.killerPosition) {
          const pos = event.killerPosition;
          const zone = getMapZone(pos.x, pos.y, pos.z, analysis.map || 'unknown');
          const round = event.round || 1; // Usar round do evento ou assumir 1
          
          totalKills++;
          
          // Contar por bombsite
          if (zone === 'Site A') bombsiteCounts['Site A']++;
          else if (zone === 'Site B') bombsiteCounts['Site B']++;
          else if (zone === 'Mid') bombsiteCounts['Mid']++;
          else bombsiteCounts['Other']++;

          // Verificar agressividade (precisa do round para determinar qual lado controla)
          // Usar o time do jogador no momento da kill (se disponível no evento)
          const killerTeamAtKill: 'CT' | 'T' = event.killerTeam || player.team;
          
          // Verificar se a kill foi agressiva
          const isAggressive = isAggressiveKill(pos, killerTeamAtKill, round, analysis.map || 'unknown');
          
          if (isAggressive) {
            aggressiveKills++;
          } else {
            killsInOwnTerritory++;
          }
        }

        // Também contar deaths para ter visão completa
        if (event.victimSteamID === playerSteamID && event.victimPosition) {
          const pos = event.victimPosition;
          const zone = getMapZone(pos.x, pos.y, pos.z, analysis.map || 'unknown');
          
          if (zone === 'Site A') bombsiteCounts['Site A']++;
          else if (zone === 'Site B') bombsiteCounts['Site B']++;
          else if (zone === 'Mid') bombsiteCounts['Mid']++;
          else bombsiteCounts['Other']++;
        }
      });

      // Determinar bombsite preferido
      const totalActivity = bombsiteCounts['Site A'] + bombsiteCounts['Site B'] + bombsiteCounts['Mid'] + bombsiteCounts['Other'];
      const preferredSite = totalActivity > 0 
        ? Object.entries(bombsiteCounts).reduce((a, b) => bombsiteCounts[a[0]] > bombsiteCounts[b[0]] ? a : b)[0]
        : 'N/A';

      // Calcular percentuais
      const siteAPercent = totalActivity > 0 ? (bombsiteCounts['Site A'] / totalActivity) * 100 : 0;
      const siteBPercent = totalActivity > 0 ? (bombsiteCounts['Site B'] / totalActivity) * 100 : 0;
      const midPercent = totalActivity > 0 ? (bombsiteCounts['Mid'] / totalActivity) * 100 : 0;

      // Calcular taxa de agressividade
      const aggressiveRate = totalKills > 0 ? (aggressiveKills / totalKills) * 100 : 0;
      let playstyle = 'Equilibrado';
      // Ajustar thresholds: > 50% = Agressivo, < 25% = Defensivo
      if (aggressiveRate >= 50) playstyle = 'Agressivo';
      else if (aggressiveRate <= 25) playstyle = 'Defensivo';

      // Obter armas mais usadas do jogador
      const playerWeaponStats = player.weaponStats || [];
      const topWeapons = playerWeaponStats
        .filter(ws => ws.kills > 0) // Apenas armas com kills
        .sort((a, b) => b.kills - a.kills) // Ordenar por kills (maior primeiro)
        .slice(0, 5); // Top 5 armas

      return {
        preferredSite,
        siteAPercent: siteAPercent.toFixed(1),
        siteBPercent: siteBPercent.toFixed(1),
        midPercent: midPercent.toFixed(1),
        aggressiveRate: aggressiveRate.toFixed(1),
        aggressiveKills,
        totalKills,
        playstyle,
        killsInOwnTerritory,
        topWeapons, // Adicionar armas mais usadas
      };
    };

    // Função para determinar qual time real ganhou o round considerando troca de lado
    // Assumindo que times trocam após 12 rounds (round 13 = lado trocado)
    const getRealTeamName = (side: 'CT' | 'T', round: number): string => {
      const ctTeam = teams.find(t => t.team === 'CT');
      const tTeam = teams.find(t => t.team === 'T');
      
      if (!teamNames) {
        // Fallback para nomes dos times se não houver extração do arquivo
        if (side === 'CT') {
          return ctTeam?.teamName || 'Counter-Terrorists';
        } else {
          return tTeam?.teamName || 'Terrorists';
        }
      }
      
      // Com nomes extraídos: team1 começa em CT, team2 em T
      // Após 12 rounds (round 13+), os times trocam de lado
      if (round <= 12) {
        return side === 'CT' ? (teamNames.team1 || 'Time 1') : (teamNames.team2 || 'Time 2');
      } else {
        return side === 'CT' ? (teamNames.team2 || 'Time 2') : (teamNames.team1 || 'Time 1');
      }
    };

    // Função para obter o nome do time vencedor real
    const getWinnerTeamName = (round: DetailedRound): string => {
      return getRealTeamName(round.winner, round.round);
    };
    
    // Fallbacks para topPerformers
    const getTopPerformer = (key: 'mostKills' | 'mostAssists' | 'mostDeaths' | 'mostDamage' | 'bestKDRatio'): PlayerStats | null => {
      if (!topPerformers || !topPerformers[key]) {
        if (players.length === 0) return null;
        const p = players[0];
        return {
          steamID: p.steamID,
          name: p.name,
          team: p.team,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          adr: p.adr,
          hsRate: p.hsRate,
          kdRatio: p.kdRatio,
        };
      }
      return topPerformers[key];
    };

    // Calcular K/D para todos os jogadores se não tiver calculado
    const playersWithKD = players.map(p => ({
      ...p,
      kdRatio: p.kdRatio !== undefined 
        ? p.kdRatio 
        : (p.deaths > 0 ? p.kills / p.deaths : (p.kills > 0 ? p.kills : 0))
    }));
    
    // FILTRO DE JOGADOR: Filtrar dados baseado no selectedPlayerFilter
    const selectedPlayerSteamID = selectedPlayerFilter !== 'all' ? parseInt(selectedPlayerFilter) : null;
    const filteredPlayers = selectedPlayerSteamID 
      ? playersWithKD.filter(p => p.steamID === selectedPlayerSteamID)
      : playersWithKD;
    
    // Filtrar trades relacionados ao jogador selecionado
    const filteredTradeKills = selectedPlayerSteamID && analysis.tradeKills
      ? analysis.tradeKills.filter(trade => 
          trade.victimSteamID === selectedPlayerSteamID || 
          trade.killerSteamID === selectedPlayerSteamID ||
          trade.tradedBySteamID === selectedPlayerSteamID ||
          trade.failedTrades?.some(failed => failed.playerSteamID === selectedPlayerSteamID)
        )
      : analysis.tradeKills || [];
    
    // Filtrar entry frags do jogador selecionado
    const filteredEntryFrags = selectedPlayerSteamID && analysis.entryFrags
      ? analysis.entryFrags.filter(ef => ef.playerSteamID === selectedPlayerSteamID)
      : analysis.entryFrags || [];
    
    // Filtrar clutches do jogador selecionado
    const filteredClutchSituations = selectedPlayerSteamID && analysis.clutchSituations
      ? analysis.clutchSituations.filter(c => c.playerSteamID === selectedPlayerSteamID)
      : analysis.clutchSituations || [];
    
    
    // Filtrar round performances do jogador selecionado
    const filteredRoundPerformances = selectedPlayerSteamID && analysis.roundPerformances
      ? analysis.roundPerformances.filter(rp => rp.playerSteamID === selectedPlayerSteamID)
      : analysis.roundPerformances || [];
    
    // Filtrar weapon stats do jogador selecionado
    const filteredWeaponStats = selectedPlayerSteamID && analysis.weaponStats
      ? analysis.weaponStats.filter(ws => 
          playersWithKD.find(p => p.steamID === selectedPlayerSteamID)?.weaponStats?.some(
            pws => pws.weapon === ws.weapon
          )
        )
      : analysis.weaponStats || [];
    
    // Filtrar highlights do jogador selecionado
    const filteredHighlights = selectedPlayerSteamID && analysis.highlights
      ? analysis.highlights.filter(h => h.playerSteamID === selectedPlayerSteamID)
      : analysis.highlights || [];
    
    // Ordenar jogadores por diferentes métricas (após filtro)
    const playersByKills = [...filteredPlayers].sort((a, b) => b.kills - a.kills);
    const playersByAssists = [...filteredPlayers].sort((a, b) => b.assists - a.assists);
    const playersByKDRatio = [...filteredPlayers].sort((a, b) => {
      // Ordenar por K/D: maior primeiro (melhor K/D primeiro)
      const kdA = a.kdRatio || 0;
      const kdB = b.kdRatio || 0;
      return kdB - kdA;
    });
    const playersByADR = [...filteredPlayers].filter(p => p.adr).sort((a, b) => (b.adr || 0) - (a.adr || 0));

    return (
      <div className="min-h-screen bg-black py-12 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header com Score */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900 border-2 border-gray-800 rounded-2xl p-8 mb-10">
            <button 
              onClick={() => setCurrentPage('upload-area')}
              className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors group"
            >
              <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-1">
                <h2 className="text-4xl font-black text-white mb-2">
                  Relatório de <span className="text-orange-500">Análise</span>
                </h2>
                <p className="text-gray-400 text-sm">
                  {uploadedDemo?.name} • {analysis.map}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {analysis.duration} • {analysis.rounds} rounds
                </p>
              </div>
              
              {/* Score Card */}
              <div className="md:col-span-2">
                <div className="bg-black/60 border-2 border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Shield className="w-6 h-6 text-blue-400" />
                          <span className="text-gray-400 text-sm font-semibold">
                            {(() => {
                              const ctTeam = teams.find(t => t.team === 'CT');
                              if (teamNames) {
                                return teamNames.team1 || ctTeam?.teamName || 'Counter-Terrorists';
                              }
                              return ctTeam?.teamName || 'Counter-Terrorists';
                            })()}
                          </span>
                        </div>
                        <div className="text-5xl font-black text-blue-400">{teams.find(t => t.team === 'CT')?.score || '0'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {teams.find(t => t.team === 'CT')?.totalKills || 0} kills • K/D: {teams.find(t => t.team === 'CT')?.avgKDRatio.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      
                      <div className="text-3xl font-black text-gray-600 mx-4">VS</div>
                      
                      <div className="text-center flex-1">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Skull className="w-6 h-6 text-orange-400" />
                          <span className="text-gray-400 text-sm font-semibold">
                            {(() => {
                              const tTeam = teams.find(t => t.team === 'T');
                              if (teamNames) {
                                return teamNames.team2 || tTeam?.teamName || 'Terrorists';
                              }
                              return tTeam?.teamName || 'Terrorists';
                            })()}
                          </span>
                        </div>
                        <div className="text-5xl font-black text-orange-400">{teams.find(t => t.team === 'T')?.score || '0'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {teams.find(t => t.team === 'T')?.totalKills || 0} kills • K/D: {teams.find(t => t.team === 'T')?.avgKDRatio.toFixed(2) || '0.00'}
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtro de Jogador */}
            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-4 mb-6">
              <label className="block text-white font-semibold text-sm mb-2">
                Filtrar por Jogador
              </label>
              <select
                value={selectedPlayerFilter}
                onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="all">Geral (Todos os Jogadores)</option>
                {players.map((player) => (
                  <option key={player.steamID} value={player.steamID.toString()}>
                    {player.name}
                  </option>
                ))}
              </select>
              {selectedPlayerFilter !== 'all' && (
                <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-orange-400 text-sm font-semibold">
                    📊 Mostrando apenas dados de: <span className="text-white">{players.find(p => p.steamID.toString() === selectedPlayerFilter)?.name || 'Jogador'}</span>
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Estatísticas, trades, clutches, kills, e demais dados filtrados para este jogador específico.
                  </p>
                </div>
              )}
            </div>

            {/* Tabs de Navegação */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
                { id: 'players', label: 'Jogadores', icon: Users },
                { id: 'teams', label: 'Times', icon: Shield },
                { id: 'rounds', label: 'Rounds', icon: Target },
                { id: 'heatmap', label: 'Heatmap', icon: Flame },
                { id: 'chat', label: 'RUSH Chat', icon: MessageSquare },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedTab(id as any)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold transition-all-smooth whitespace-nowrap hover:scale-105 ${
                    selectedTab === id
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-black shadow-lg shadow-orange-500/50 scale-105'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="tab-content">
          {selectedTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* MVP e Top Performers */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-4 border-orange-500 rounded-3xl p-8 shadow-2xl shadow-orange-500/30 card-hover">
                  <div className="flex items-center gap-3 mb-4">
                    <Crown className="w-8 h-8 text-orange-500" />
                    <h3 className="text-2xl font-bold text-white">MVP</h3>
                  </div>
                  <p className="text-4xl font-black text-white mb-2">{analysis.mvp}</p>
                  {analysis.rating && (
                    <p className="text-lg text-orange-200">Rating: {analysis.rating.toFixed(2)}</p>
                  )}
                </div>
                
                {(topPerformers || players.length > 0) && (
                  <>
                    <div className="bg-gray-900 border-2 border-gray-800 rounded-2xl p-6 card-hover">
                      <div className="flex items-center gap-2 mb-3">
                        <Skull className="w-5 h-5 text-red-400" />
                        <h4 className="text-lg font-bold text-white">Mais Kills</h4>
                      </div>
                      <p className="text-2xl font-black text-red-400 truncate max-w-full" title={getTopPerformer('mostKills')?.name || playersByKills[0]?.name || 'N/A'}>
                        {(() => {
                          const name = getTopPerformer('mostKills')?.name || playersByKills[0]?.name || 'N/A';
                          return name.length > 20 ? `${name.substring(0, 17)}...` : name;
                        })()}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{getTopPerformer('mostKills')?.kills || playersByKills[0]?.kills || 0} eliminações</p>
                    </div>
                    
                    <div className="bg-gray-900 border-2 border-gray-800 rounded-2xl p-6 card-hover">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-blue-400" />
                        <h4 className="text-lg font-bold text-white">Mais Assists</h4>
                      </div>
                      <p className="text-2xl font-black text-blue-400 truncate max-w-full" title={getTopPerformer('mostAssists')?.name || playersByAssists[0]?.name || 'N/A'}>
                        {(() => {
                          const name = getTopPerformer('mostAssists')?.name || playersByAssists[0]?.name || 'N/A';
                          return name.length > 20 ? `${name.substring(0, 17)}...` : name;
                        })()}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{getTopPerformer('mostAssists')?.assists || playersByAssists[0]?.assists || 0} assistências</p>
                    </div>
                  </>
                )}
              </div>

              {/* Informações da Demo (GC/Valve, Warmup) */}
              {(analysis.source || analysis.warmupRounds !== undefined || analysis.knifeRound) && (
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-2 border-purple-500 rounded-3xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📋</span>
                    Informações da Demo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis.source && (
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">Fonte</p>
                        <p className="text-2xl font-black text-white">
                          {analysis.source === 'GC' ? '🎮 Gamers Club' : '🎯 Valve Matchmaking'}
                        </p>
                      </div>
                    )}
                    {analysis.warmupRounds !== undefined && analysis.warmupRounds > 0 && (
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">Rounds de Aquecimento</p>
                        <p className="text-2xl font-black text-orange-400">{analysis.warmupRounds}</p>
                        <p className="text-xs text-gray-400 mt-1">Ignorados na análise</p>
                      </div>
                    )}
                    {analysis.knifeRound && (
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">Round de Faca</p>
                        <p className="text-2xl font-black text-yellow-400">Detectado</p>
                        <p className="text-xs text-gray-400 mt-1">Ignorado na análise</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Métricas Principais */}
              {metrics.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Métricas-Chave</h3>
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {metrics.map((metric, index) => {
                      const trend = trendCopy[metric.trend];
                      return (
                        <div
                          key={index}
                          className="bg-black/60 border border-gray-800 rounded-2xl p-6"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-white">{metric.label}</h4>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${trendBadgeClasses[metric.trend]}`}>
                              {trend.icon} {trend.label}
                            </span>
                          </div>
                          <p className="text-3xl font-black text-orange-500 mb-2">{metric.value}</p>
                          <p className="text-sm text-gray-400">{metric.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Principais Achados */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                  <h3 className="text-2xl font-bold text-white">Principais Achados</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysis.keyFindings.map((finding, index) => (
                    <div key={index} className="flex items-start gap-3 bg-black/40 rounded-xl p-4">
                      <span className="text-orange-500 text-xl leading-none mt-1">•</span>
                      <p className="text-gray-200 leading-relaxed">{finding}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendações */}
              <div className="bg-gradient-to-br from-orange-500/15 to-orange-600/10 border-2 border-orange-500/40 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-8 h-8 text-orange-200" />
                  <h3 className="text-2xl font-bold text-white">Plano de Ação RUSH</h3>
                </div>
                <ul className="space-y-3 text-gray-100">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-orange-300 font-black">{index + 1}.</span>
                      <p className="leading-relaxed">{rec}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Players */}
          {selectedTab === 'players' && (
            <div className="animate-fade-in">
            <div className="space-y-8">
              {/* Top Performers Cards */}
              <div className="grid md:grid-cols-5 gap-4">
                {(topPerformers || players.length > 0) && (
                  <>
                    <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Skull className="w-5 h-5 text-red-400" />
                        <h4 className="font-bold text-white">Mais Kills</h4>
                      </div>
                      <p className="text-2xl font-black text-red-400">{getTopPerformer('mostKills')?.name || playersByKills[0]?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-400">{getTopPerformer('mostKills')?.kills || playersByKills[0]?.kills || 0} eliminações</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-2 border-purple-500 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-purple-400" />
                        <h4 className="font-bold text-white">Mais Mortes</h4>
                      </div>
                      <p className="text-2xl font-black text-purple-400">{getTopPerformer('mostDeaths')?.name || [...players].sort((a, b) => b.deaths - a.deaths)[0]?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-400">{getTopPerformer('mostDeaths')?.deaths || [...players].sort((a, b) => b.deaths - a.deaths)[0]?.deaths || 0} mortes</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-500 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        <h4 className="font-bold text-white">Mais Assists</h4>
                      </div>
                      <p className="text-2xl font-black text-blue-400">{getTopPerformer('mostAssists')?.name || playersByAssists[0]?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-400">{getTopPerformer('mostAssists')?.assists || playersByAssists[0]?.assists || 0} assistências</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-green-400" />
                        <h4 className="font-bold text-white">Mais Dano</h4>
                      </div>
                      <p className="text-2xl font-black text-green-400">{getTopPerformer('mostDamage')?.name || playersByADR[0]?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-400">ADR: {getTopPerformer('mostDamage')?.adr?.toFixed(1) || playersByADR[0]?.adr?.toFixed(1) || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <h4 className="font-bold text-white">Melhor K/D</h4>
                      </div>
                      <p className="text-2xl font-black text-yellow-400">{getTopPerformer('bestKDRatio')?.name || playersByKDRatio[0]?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-400">K/D: {getTopPerformer('bestKDRatio')?.kdRatio?.toFixed(2) || playersByKDRatio[0]?.kdRatio?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Comparação de Jogadores */}
              {selectedPlayersForComparison.length > 0 && (
                <div className="bg-gray-900 border-2 border-orange-500/30 rounded-3xl p-8 animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-orange-400" />
                      Comparação de Jogadores ({selectedPlayersForComparison.length})
                    </h3>
                    <button
                      onClick={() => setSelectedPlayersForComparison([])}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Limpar Seleção
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {selectedPlayersForComparison.map((steamID) => {
                      const player = players.find(p => p.steamID === steamID);
                      if (!player) return null;
                      
                      return (
                        <div key={steamID} className="bg-black/40 border-2 border-orange-500/30 rounded-xl p-6 card-hover">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-white">{player.name}</h4>
                            <button
                              onClick={() => setSelectedPlayersForComparison(prev => prev.filter(id => id !== steamID))}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">Kills</p>
                              <p className="text-2xl font-bold text-green-400">{player.kills}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Deaths</p>
                              <p className="text-2xl font-bold text-red-400">{player.deaths}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Assists</p>
                              <p className="text-2xl font-bold text-blue-400">{player.assists}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">K/D</p>
                              <p className="text-2xl font-bold text-yellow-400">{player.kdRatio?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">ADR</p>
                              <p className="text-2xl font-bold text-purple-400">{player.adr?.toFixed(1) || '0.0'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">HS%</p>
                              <p className="text-2xl font-bold text-cyan-400">
                                {(() => {
                                  if (player.hsRate === undefined || player.hsRate === null) return '0.0';
                                  let hsValue = player.hsRate; // hsRate já está em formato de porcentagem (64.706 = 64.7%)
                                  // Se o valor for maior que 100, pegar apenas os 2 primeiros dígitos
                                  if (hsValue >= 100) {
                                    // Dividir por 100 para pegar apenas os 2 primeiros dígitos (64.7% ao invés de 6470.6%)
                                    hsValue = Math.floor(hsValue / 100 * 10) / 10;
                                  }
                                  return hsValue.toFixed(1);
                                })()}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Gráfico Comparativo */}
                  {selectedPlayersForComparison.length >= 2 && (
                    <div className="bg-black/40 rounded-xl p-6 border border-gray-700">
                      <h4 className="text-lg font-bold text-white mb-4">Comparação Visual</h4>
                      <div className="space-y-4">
                        {['kills', 'deaths', 'assists', 'kdRatio', 'adr', 'headshotRate'].map((stat) => {
                          const statLabel: Record<string, string> = {
                            kills: 'Kills',
                            deaths: 'Deaths',
                            assists: 'Assists',
                            kdRatio: 'K/D Ratio',
                            adr: 'ADR',
                            headshotRate: 'HS%',
                          };
                          
                          const selectedPlayersData = selectedPlayersForComparison
                            .map(steamID => players.find(p => p.steamID === steamID))
                            .filter(Boolean);
                          
                          const maxValue = Math.max(...selectedPlayersData.map(p => {
                            if (!p) return 0;
                            let value = 0;
                            if (stat === 'headshotRate') {
                              // Usar hsRate diretamente se disponível, senão calcular
                              let rawValue = 0;
                              if (p.hsRate !== undefined && p.hsRate !== null) {
                                rawValue = p.hsRate; // hsRate já está em formato de porcentagem (64.706 = 64.7%)
                                // Se o valor for maior que 100, pegar apenas os 2 primeiros dígitos
                                if (rawValue >= 100) {
                                  rawValue = Math.floor(rawValue / 100 * 10) / 10;
                                }
                              } else {
                                // Fallback: calcular se não tiver hsRate
                                rawValue = ((p as any).headshotKills || (p as any).headshots || 0) / ((p as any).kills || 1) * 100;
                                if (rawValue >= 100) {
                                  rawValue = Math.floor(rawValue / 100 * 10) / 10;
                                }
                              }
                              value = rawValue;
                            } else {
                              value = (p as any)[stat] || 0;
                            }
                            return typeof value === 'number' ? value : 0;
                          }));
                          
                          return (
                            <div key={stat} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{statLabel[stat]}</span>
                                <span className="text-gray-500">{maxValue.toFixed(stat === 'kdRatio' ? 2 : stat === 'headshotRate' ? 1 : 0)}{stat === 'headshotRate' ? '%' : ''}</span>
                              </div>
                              <div className="space-y-2">
                                {selectedPlayersData.map((player) => {
                                  if (!player) return null;
                                  let value = 0;
                                  if (stat === 'headshotRate') {
                                    // Usar hsRate diretamente se disponível, senão calcular
                                    let rawValue = 0;
                                    if (player.hsRate !== undefined && player.hsRate !== null) {
                                      rawValue = player.hsRate; // hsRate já está em formato de porcentagem (64.706 = 64.7%)
                                      // Se o valor for maior que 100, pegar apenas os 2 primeiros dígitos
                                      if (rawValue >= 100) {
                                        rawValue = Math.floor(rawValue / 100 * 10) / 10;
                                      }
                                    } else {
                                      // Fallback: calcular se não tiver hsRate
                                      rawValue = ((player as any).headshotKills || (player as any).headshots || 0) / ((player as any).kills || 1) * 100;
                                      if (rawValue >= 100) {
                                        rawValue = Math.floor(rawValue / 100 * 10) / 10;
                                      }
                                    }
                                    value = rawValue;
                                  } else {
                                    value = (player as any)[stat] || 0;
                                  }
                                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                  
                                  return (
                                    <div key={player!.steamID} className="flex items-center gap-3">
                                      <span className="text-white text-sm font-semibold w-24 truncate" title={player!.name}>
                                        {player!.name.length > 12 ? `${player!.name.substring(0, 9)}...` : player!.name}
                                      </span>
                                      <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 flex items-center justify-end pr-2"
                                          style={{ width: `${percentage}%` }}
                                        >
                                          <span className="text-xs font-bold text-black">
                                            {typeof value === 'number' ? value.toFixed(stat === 'kdRatio' ? 2 : stat === 'headshotRate' ? 1 : 0) : '0'}{stat === 'headshotRate' ? '%' : ''}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tabela de Jogadores */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Estatísticas dos Jogadores</h3>
                  {selectedPlayersForComparison.length > 0 && (
                    <button
                      onClick={() => setSelectedPlayersForComparison([])}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Limpar Seleção ({selectedPlayersForComparison.length})
                    </button>
                  )}
                </div>
                
                {/* Filtros de ordenação */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {[
                    { label: 'Kills', data: playersByKills },
                    { label: 'Assists', data: playersByAssists },
                    { label: 'K/D Ratio', data: playersByKDRatio },
                    { label: 'ADR', data: playersByADR },
                  ].map((filter, idx) => (
                    <button
                      key={idx}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold whitespace-nowrap"
                    >
                      Top {filter.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Jogador</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">Time</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">K</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">D</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">A</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">K/D</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">ADR</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">HS%</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm" title="Trades Bem-Sucedidos">Trades ✓</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm" title="Trades Falhados (presente mas não matou)">Trades ✗</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playersByKills.map((player, idx) => {
                        const isSelected = selectedPlayersForComparison.includes(player.steamID);
                        return (
                        <tr key={player.steamID} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${isSelected ? 'bg-orange-500/10 border-orange-500/30' : ''}`}>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 font-bold">#{idx + 1}</span>
                              <div 
                                className="relative"
                                onMouseEnter={() => setHoveredPlayer(player.steamID)}
                                onMouseLeave={() => setHoveredPlayer(null)}
                              >
                                <span className="text-white font-semibold truncate max-w-[200px] cursor-help" title={player.name}>
                                  {player.name.length > 25 ? `${player.name.substring(0, 22)}...` : player.name}
                                </span>
                                
                                {/* Tooltip do Jogador */}
                                {hoveredPlayer === player.steamID && (() => {
                                  const insights = calculatePlayerInsights(player.steamID);
                                  if (!insights) return null;
                                  
                                  return (
                                    <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-gray-900 border-2 border-orange-500/50 rounded-xl p-4 shadow-2xl animate-fade-in">
                                      <div className="flex items-center gap-2 mb-3">
                                        <User className="w-5 h-5 text-orange-400" />
                                        <h4 className="text-lg font-bold text-white">{player.name}</h4>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        {/* Bombsite Preferido */}
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-400">Bombsite Preferido</span>
                                            <span className="text-sm font-bold text-orange-400">{insights.preferredSite}</span>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-gray-500">Site A</span>
                                              <span className="text-white">{insights.siteAPercent}%</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-gray-500">Site B</span>
                                              <span className="text-white">{insights.siteBPercent}%</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-gray-500">Mid</span>
                                              <span className="text-white">{insights.midPercent}%</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Agressividade */}
                                        <div className="border-t border-gray-700 pt-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-400">Estilo de Jogo</span>
                                            <span className={`text-sm font-bold ${
                                              insights.playstyle === 'Agressivo' ? 'text-red-400' :
                                              insights.playstyle === 'Defensivo' ? 'text-blue-400' :
                                              'text-yellow-400'
                                            }`}>
                                              {insights.playstyle}
                                            </span>
                                          </div>
                                          <div className="space-y-1 text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="text-gray-500">Kills em área inimiga</span>
                                              <span className="text-red-400 font-semibold">{insights.aggressiveKills} ({insights.aggressiveRate}%)</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-gray-500">Kills em área própria</span>
                                              <span className="text-blue-400 font-semibold">{insights.killsInOwnTerritory}</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Armas Mais Usadas */}
                                        {insights.topWeapons && insights.topWeapons.length > 0 && (
                                          <div className="border-t border-gray-700 pt-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-sm text-gray-400">Armas Mais Usadas</span>
                                              <Crosshair className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div className="space-y-1.5">
                                              {insights.topWeapons.map((weapon, idx) => {
                                                const killPercentage = insights.totalKills > 0 
                                                  ? ((weapon.kills / insights.totalKills) * 100).toFixed(1)
                                                  : '0';
                                                return (
                                                  <div key={idx} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      <span className="text-gray-500 truncate">{weapon.weapon}</span>
                                                      {weapon.headshots > 0 && (
                                                        <span className="text-yellow-400 text-[10px]">HS</span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-white font-semibold">{weapon.kills}</span>
                                                      <span className="text-gray-600 text-[10px]">({killPercentage}%)</span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Estatísticas rápidas */}
                                        <div className="border-t border-gray-700 pt-3">
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span className="text-gray-500">Total Kills:</span>
                                              <span className="text-white font-bold ml-2">{insights.totalKills}</span>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">K/D:</span>
                                              <span className="text-white font-bold ml-2">{(player.kdRatio || 0).toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <button
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedPlayersForComparison(prev => prev.filter(id => id !== player.steamID));
                                  } else {
                                    setSelectedPlayersForComparison(prev => [...prev, player.steamID]);
                                  }
                                }}
                                className={`ml-auto px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-orange-500 text-black hover:bg-orange-600'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                              >
                                {isSelected ? '✓ Selecionado' : 'Comparar'}
                              </button>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              player.team === 'CT' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}>
                              {player.team}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-white font-bold">{player.kills}</span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-red-400 font-bold">{player.deaths}</span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-blue-400 font-bold">{player.assists}</span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className={`font-bold ${(player.kdRatio || 0) > 1 ? 'text-green-400' : 'text-red-400'}`}>
                              {(player.kdRatio || (player.deaths > 0 ? player.kills / player.deaths : player.kills)).toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-gray-300">{player.adr ? player.adr.toFixed(1) : 'N/A'}</span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-gray-300">{player.hsRate ? `${player.hsRate.toFixed(1)}%` : 'N/A'}</span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-green-400 font-bold" title={`${player.successfulTrades || 0} trades bem-sucedidos`}>
                              {player.successfulTrades || 0}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="text-red-400 font-bold" title={`${player.failedTrades || 0} vezes presente mas não fez trade`}>
                              {player.failedTrades || 0}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seção de Trades Detalhados */}
              {filteredTradeKills && filteredTradeKills.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">Análise de Trades</h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    <strong>Trades bem-sucedidos:</strong> Quando um aliado (mesmo time) mata o assassino dentro de 8 segundos após a morte de um companheiro de equipe.
                    <br />
                    <strong>Trade falhado:</strong> Ocorre quando um jogador estava presente (dentro de 500 unidades) mas não conseguiu fazer o trade dentro de 8 segundos.
                  </p>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {filteredTradeKills
                      .filter((trade: TradeKill) => trade.failedTrades.length > 0 || trade.tradedBy)
                      .slice(0, 20)
                      .map((trade: TradeKill, idx: number) => (
                        <div 
                          key={idx}
                          className={`bg-black/40 border-2 rounded-2xl p-6 ${
                            trade.tradeType === 'successful' ? 'border-green-500/30' : 'border-red-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                              trade.tradeType === 'successful' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}>
                              {trade.tradeType === 'successful' ? '✓' : '✗'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-white font-semibold">{trade.victim}</span>
                                <span className="text-gray-500">morreu para</span>
                                <span className="text-red-400 font-semibold">{trade.killer}</span>
                                <span className="text-xs text-gray-500">Round {trade.round}</span>
                              </div>
                              
                              {trade.tradedBy ? (
                                <div className="mb-2">
                                  <span className="text-green-400 font-semibold">✓ Trade bem-sucedido por {trade.tradedBy}</span>
                                  {trade.tradeTime && (
                                    <span className="text-xs text-gray-400 ml-2">
                                      (em {trade.tradeTime.toFixed(2)}s)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="mb-2">
                                  <span className="text-red-400 font-semibold">✗ Trade falhado</span>
                                  <span className="text-xs text-gray-400 ml-2">(nenhum aliado matou o assassino em 8s)</span>
                                </div>
                              )}
                              
                              {trade.failedTrades.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <p className="text-xs text-gray-400 mb-2">
                                    Aliados presentes mas não fizeram trade ({trade.failedTrades.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {trade.failedTrades.map((failed: { player: string; playerSteamID: number; distance: number }, fIdx: number) => (
                                      <span 
                                        key={fIdx}
                                        className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs border border-red-500/20"
                                        title={`Aliado presente no momento da morte mas não fez trade`}
                                      >
                                        {failed.player}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Gráfico de K/D por Jogador */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Distribuição de K/D</h3>
                <div className="space-y-4">
                  {(() => {
                    // Pegar top 5, mas garantir que o pior K/D apareça
                    const topPlayers = playersByKDRatio.slice(0, 5);
                    const worstPlayer = playersByKDRatio[playersByKDRatio.length - 1];
                    
                    // Se o pior não está nos top 5, substituir o último dos top 5 pelo pior
                    const playersToShow = worstPlayer && !topPlayers.some(p => p.steamID === worstPlayer.steamID)
                      ? [...topPlayers.slice(0, 4), worstPlayer].sort((a, b) => (b.kdRatio || 0) - (a.kdRatio || 0))
                      : topPlayers;
                    
                    const allKDs = playersByKDRatio.map(p => p.kdRatio || 0);
                    const maxKD = Math.max(...allKDs);
                    const minKD = Math.min(...allKDs);
                    
                    return playersToShow.map((player) => {
                      const kd = player.kdRatio || 0;
                      // Normalizar para largura: se maxKD > 0, usar porcentagem, senão 50%
                      const width = maxKD > 0 ? Math.max(5, (kd / maxKD) * 100) : 50;
                      const isWorst = player.steamID === worstPlayer?.steamID;
                      
                      return (
                        <div key={player.steamID}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-white font-semibold text-sm ${isWorst ? 'text-red-400' : ''}`}>
                              {player.name}
                              {isWorst && <span className="ml-2 text-xs">(Pior K/D)</span>}
                            </span>
                            <span className={`text-sm font-bold ${kd > 1 ? 'text-green-400' : 'text-red-400'}`}>
                              {kd.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${kd > 1 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Estatísticas por Arma */}
              {filteredWeaponStats && filteredWeaponStats.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">🕹️ Estatísticas por Arma</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWeaponStats.map((weapon: WeaponStats, idx: number) => (
                      <div key={idx} className="bg-black/40 rounded-xl p-4 border border-gray-700">
                        <h4 className="text-white font-bold mb-2">{weapon.weapon}</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-300">Kills: <span className="text-green-400 font-bold">{weapon.kills}</span></p>
                          <p className="text-gray-300">Headshots: <span className="text-yellow-400 font-bold">{weapon.headshots}</span></p>
                          <p className="text-gray-300">HS Rate: <span className="text-blue-400 font-bold">
                            {weapon.kills > 0 ? ((weapon.headshots / weapon.kills) * 100).toFixed(1) : 0}%
                          </span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* First Kill */}
              {analysis?.players && analysis.players.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">🧭 First Kill</h3>
                  <p className="text-gray-400 mb-4 text-sm">Primeira kill do round - quando o jogador consegue a primeira eliminação do round</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {filteredPlayers.map(player => {
                      const firstKills = (player.entryFrags || 0); // Total de first kills (não apenas wins)
                      return (
                        <div key={player.steamID} className="bg-black/40 rounded-xl p-4 border border-gray-700">
                          <p className="text-white font-semibold mb-2 text-sm" title={player.name}>
                            {player.name.length > 15 ? `${player.name.substring(0, 12)}...` : player.name}
                          </p>
                          <p className="text-2xl font-bold text-green-400">{firstKills}</p>
                          <p className="text-xs text-gray-400 mt-1">First Kills</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clutches - Apenas vitorias */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">🪖 Clutches</h3>
                <p className="text-gray-400 mb-4 text-sm">Rounds ganhos em desvantagem numérica (1v2, 1v3, 1v4, 1v5)</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playersWithKD
                    .filter(player => 
                      (player.clutch1v2Wins || 0) > 0 || 
                      (player.clutch1v3Wins || 0) > 0 || 
                      (player.clutch1v4Wins || 0) > 0 || 
                      (player.clutch1v5Wins || 0) > 0
                    )
                    .map(player => {
                      const clutch1v2 = player.clutch1v2Wins || 0;
                      const clutch1v3 = player.clutch1v3Wins || 0;
                      const clutch1v4 = player.clutch1v4Wins || 0;
                      const clutch1v5 = player.clutch1v5Wins || 0;
                      const totalClutches = clutch1v2 + clutch1v3 + clutch1v4 + clutch1v5;
                      
                      if (totalClutches === 0) return null;
                      
                      return (
                        <div key={player.steamID} className="bg-black/40 rounded-xl p-4 border border-gray-700">
                          <h4 className="text-white font-bold mb-3">{player.name}</h4>
                          <div className="space-y-2 text-sm">
                            {clutch1v2 > 0 && (
                              <p className="text-gray-300">
                                <span className="text-yellow-400 font-bold">1v2:</span> <span className="text-green-400 font-bold">{clutch1v2}</span>
                              </p>
                            )}
                            {clutch1v3 > 0 && (
                              <p className="text-gray-300">
                                <span className="text-orange-400 font-bold">1v3:</span> <span className="text-green-400 font-bold">{clutch1v3}</span>
                              </p>
                            )}
                            {clutch1v4 > 0 && (
                              <p className="text-gray-300">
                                <span className="text-red-400 font-bold">1v4:</span> <span className="text-green-400 font-bold">{clutch1v4}</span>
                              </p>
                            )}
                            {clutch1v5 > 0 && (
                              <p className="text-gray-300">
                                <span className="text-purple-400 font-bold">1v5:</span> <span className="text-green-400 font-bold">{clutch1v5}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {filteredPlayers.filter(player => 
                    (player.clutch1v2Wins || 0) === 0 && 
                    (player.clutch1v3Wins || 0) === 0 && 
                    (player.clutch1v4Wins || 0) === 0 && 
                    (player.clutch1v5Wins || 0) === 0
                  ).length === filteredPlayers.length && (
                    <div className="col-span-full text-center text-gray-400 py-8">
                      Nenhum clutch bem-sucedido nesta partida
                    </div>
                  )}
                </div>
              </div>


              {/* Consistência e Performance Round-to-Round */}
              {filteredRoundPerformances && filteredRoundPerformances.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">📊 Consistência</h3>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                    <p className="text-white text-sm leading-relaxed">
                      <strong className="text-blue-400">O que é Consistência?</strong>
                      <br />
                      A consistência mede a estabilidade do desempenho round-a-round. Mostra se você mantém bom desempenho tanto em vitórias quanto em derrotas.
                      <br />
                      <strong className="text-green-400">Kills em Vitórias:</strong> Média de eliminações quando seu time vence o round.
                      <br />
                      <strong className="text-red-400">Kills em Derrotas:</strong> Média de eliminações quando seu time perde o round.
                      <br />
                      <strong className="text-blue-400">Score de Consistência:</strong> Quanto maior (0-100), mais consistente você foi durante toda a partida.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {filteredPlayers.map(player => {
                      const performances = filteredRoundPerformances!.filter(rp => rp.playerSteamID === player.steamID);
                      if (performances.length === 0) return null;
                      
                      const wins = performances.filter(rp => rp.wonRound);
                      const losses = performances.filter(rp => !rp.wonRound);
                      
                      return (
                        <div key={player.steamID} className="bg-black/40 rounded-xl p-4 border border-gray-700">
                          <h4 className="text-white font-bold mb-3">{player.name}</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-gray-400">Consistência:</p>
                              <p className="text-lg font-bold text-blue-400">
                                {(player.consistencyScore || 0).toFixed(0)}/100
                              </p>
                            </div>
                            {player.avgKillsWin !== undefined && (
                              <div>
                                <p className="text-gray-400">Kills (Vitórias):</p>
                                <p className="text-green-400 font-bold">{player.avgKillsWin.toFixed(1)}</p>
                              </div>
                            )}
                            {player.avgKillsLoss !== undefined && (
                              <div>
                                <p className="text-gray-400">Kills (Derrotas):</p>
                                <p className="text-red-400 font-bold">{player.avgKillsLoss.toFixed(1)}</p>
                              </div>
                            )}
                          </div>
                          {/* Gráfico simples de performance */}
                          <div className="mt-4 h-8 bg-gray-800 rounded overflow-hidden flex">
                            {performances.slice(0, 10).map((rp: RoundPerformance, idx: number) => (
                              <div
                                key={idx}
                                className={`flex-1 ${rp.wonRound ? 'bg-green-500' : 'bg-red-500'}`}
                                title={`Round ${rp.round}: ${rp.kills}K/${rp.deaths}D`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Erros Críticos */}
              {analysis?.criticalErrors && analysis.criticalErrors.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">⚠️ Erros Críticos</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {analysis.criticalErrors.slice(0, 20).map((error: CriticalError, idx: number) => (
                      <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-bold">⚠️</span>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{error.player}</p>
                            <p className="text-sm text-gray-400">{error.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Round {error.round}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights Automáticos */}
              {filteredHighlights && filteredHighlights.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">⭐ Highlights Automáticos</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredHighlights.map((highlight: Highlight, idx: number) => (
                      <div
                        key={idx}
                        className={`bg-gradient-to-br rounded-xl p-4 border-2 ${
                          highlight.type === 'ace' ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50' :
                          highlight.type === '4k' ? 'from-purple-500/20 to-pink-500/20 border-purple-500/50' :
                          highlight.type === 'clutch_1v3' || highlight.type === 'clutch_1v4' || highlight.type === 'clutch_1v5' ?
                            'from-blue-500/20 to-cyan-500/20 border-blue-500/50' :
                          'from-green-500/20 to-emerald-500/20 border-green-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {highlight.type === 'ace' ? '🔥' : highlight.type === '4k' ? '💜' : highlight.type === '3k' ? '⭐' : '🎯'}
                          </span>
                          <span className="text-white font-bold">{highlight.type.toUpperCase()}</span>
                        </div>
                        <p className="text-white font-semibold">{highlight.player}</p>
                        <p className="text-sm text-gray-300 mt-1">{highlight.description}</p>
                        <p className="text-xs text-gray-400 mt-2">Round {highlight.round}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teamplay */}
              {analysis?.teamPlay && analysis.teamPlay.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">🤝 Análise de Teamplay</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.teamPlay.map((tp: TeamPlay, idx: number) => {
                      const player = playersWithKD.find(p => p.steamID === tp.playerSteamID);
                      if (!player) return null;
                      
                      return (
                        <div key={idx} className="bg-black/40 rounded-xl p-4 border border-gray-700">
                          <h4 className="text-white font-bold mb-3">{player.name}</h4>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-400">
                              Assistências dadas: <span className="text-blue-400 font-bold">{tp.assistsGiven}</span>
                            </p>
                            <p className="text-gray-400">
                              Trades dados: <span className="text-green-400 font-bold">{tp.tradesGiven}</span>
                            </p>
                            <p className="text-gray-400">
                              Trades recebidos: <span className="text-yellow-400 font-bold">{tp.tradesReceived}</span>
                            </p>
                            {tp.mostAssistedPlayer && (
                              <p className="text-xs text-gray-400 mt-2">
                                Mais assistiu: {playersWithKD.find(p => p.steamID === tp.mostAssistedPlayer?.playerSteamID)?.name || 'N/A'}
                                <span className="text-blue-400 ml-1">({tp.mostAssistedPlayer.assists})</span>
                              </p>
                            )}
                            {tp.mostTradedBy && (
                              <p className="text-xs text-gray-400">
                                Mais tradeado por: {playersWithKD.find(p => p.steamID === tp.mostTradedBy?.playerSteamID)?.name || 'N/A'}
                                <span className="text-green-400 ml-1">({tp.mostTradedBy.trades})</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Classificação por Função */}
              {analysis?.playerRoles && analysis.playerRoles.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">🎭 Classificação por Função</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.playerRoles.map((role: PlayerRole, idx: number) => {
                      const player = playersWithKD.find(p => p.steamID === role.playerSteamID);
                      if (!player) return null;
                      
                      return (
                        <div key={idx} className="bg-black/40 rounded-xl p-4 border border-gray-700">
                          <h4 className="text-white font-bold mb-2">{player.name}</h4>
                          <p className={`text-lg font-bold mb-3 ${
                            role.primaryRole === 'Entry Fragger' ? 'text-red-400' :
                            role.primaryRole === 'Support' ? 'text-blue-400' :
                            role.primaryRole === 'Lurker' ? 'text-indigo-400' :
                            role.primaryRole === 'AWPer' ? 'text-yellow-400' :
                            role.primaryRole === 'Rifler' ? 'text-purple-400' :
                            role.primaryRole === 'Anchor' ? 'text-cyan-400' :
                            'text-green-400'
                          }`}>
                            {role.primaryRole}
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-red-400">Entry:</span>
                              <span className="text-white">{role.roles.entry.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Support:</span>
                              <span className="text-white">{role.roles.support.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Lurker:</span>
                              <span className="text-white">{role.roles.lurker.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">AWPer:</span>
                              <span className="text-white">{role.roles.awper.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Rifler:</span>
                              <span className="text-white">{role.roles.rifler.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Anchor:</span>
                              <span className="text-white">{role.roles.anchor.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">IGL:</span>
                              <span className="text-white">{role.roles.igl.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sugestões Inteligentes (IA) */}
              {analysis?.aiSuggestions && analysis.aiSuggestions.length > 0 && (
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-2 border-blue-500/50 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">🤖</span>
                    <h3 className="text-2xl font-bold text-white">Sugestões Inteligentes (IA)</h3>
                  </div>
                  <div className="space-y-3">
                    {analysis.aiSuggestions.map((suggestion: string, idx: number) => (
                      <div key={idx} className="bg-black/40 rounded-xl p-4 border border-blue-500/30">
                        <p className="text-white leading-relaxed">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {/* Tab: Teams */}
          {selectedTab === 'teams' && (
            <div className="animate-fade-in">
            <div className="space-y-8">
              {/* Comparação de Times */}
              <div className="grid lg:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div 
                    key={team.team}
                    className={`bg-gray-900 border-2 rounded-3xl p-8 ${
                      team.team === 'CT' ? 'border-blue-500/50' : 'border-orange-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      {team.team === 'CT' ? (
                        <Shield className="w-8 h-8 text-blue-400" />
                      ) : (
                        <Skull className="w-8 h-8 text-orange-400" />
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {(() => {
                            // Se tiver nomes dos times extraídos, usar eles
                            if (teamNames) {
                              return team.team === 'CT' 
                                ? (teamNames.team1 || team.teamName || 'Counter-Terrorists')
                                : (teamNames.team2 || team.teamName || 'Terrorists');
                            }
                            // Senão, usar teamName ou padrão
                            return team.teamName || (team.team === 'CT' ? 'Counter-Terrorists' : 'Terrorists');
                          })()}
                        </h3>
                        <p className="text-sm text-gray-400">Score: {team.score}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">Total Kills</p>
                        <p className="text-2xl font-black text-white">{team.totalKills}</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">K/D Médio</p>
                        <p className="text-2xl font-black text-green-400">{team.avgKDRatio.toFixed(2)}</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">Bombas Plantadas</p>
                        <p className="text-2xl font-black text-orange-400">{team.bombPlants}</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-4">
                        <p className="text-xs text-gray-400 uppercase mb-1">Bombas Desarmadas</p>
                        <p className="text-2xl font-black text-blue-400">{team.bombDefuses}</p>
                      </div>
                    </div>

                    {/* Desempenho por Zona */}
                    {team.zonePerformance && team.zonePerformance.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-white mb-4">Desempenho por Zona</h4>
                        <div className="space-y-3">
                          {team.zonePerformance.slice(0, 5).map((zone, idx) => (
                            <div key={idx} className="bg-black/40 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold">{zone.zone}</span>
                                <span className="text-sm text-gray-400">{zone.control}% controle</span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${team.team === 'CT' ? 'bg-blue-500' : 'bg-orange-500'}`}
                                  style={{ width: `${zone.control}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                {zone.kills} kills na zona
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Controle: Time {zone.control > 50 
                                  ? (teamNames ? (teamNames.team1 || 'CT') : (teams.find(t => t.team === 'CT')?.teamName || 'CT'))
                                  : (teamNames ? (teamNames.team2 || 'T') : (teams.find(t => t.team === 'T')?.teamName || 'T'))} ({zone.control}%)
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}

          {/* Tab: Rounds */}
          {selectedTab === 'rounds' && (
            <div className="animate-fade-in">
            <div className="space-y-8">
              {/* Gráficos Interativos */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Gráfico de Linha - Evolução Round-to-Round por Time Real */}
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    Evolução do Score por Round
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={(() => {
                      // Obter times reais com seus scores finais
                      const ctTeam = teams.find(t => t.team === 'CT');
                      const tTeam = teams.find(t => t.team === 'T');
                      
                      // Obter nomes dos times (pode ser de teamNames ou teamName dos times)
                      const nameFromCT = teamNames?.team1 || ctTeam?.teamName;
                      const nameFromT = teamNames?.team2 || tTeam?.teamName;
                      
                      // Calcular scores acumulados para ambos os times
                      // Vamos calcular e depois verificar qual nome corresponde a qual score final
                      const chartData = [];
                      let teamCTScore = 0; // Score do time que começa em CT (rounds 1-12)
                      let teamTScore = 0;  // Score do time que começa em T (rounds 1-12)
                      
                      for (let i = 0; i < detailedRounds.length; i++) {
                        const r = detailedRounds[i];
                        
                        // Rounds 1-12: CT = time que começa em CT, T = time que começa em T
                        // Rounds 13+: CT = time que começou em T, T = time que começou em CT
                        if (r.round <= 12) {
                          if (r.winner === 'CT') {
                            teamCTScore++;
                          } else {
                            teamTScore++;
                          }
                        } else {
                          // Após troca de lado
                          if (r.winner === 'CT') {
                            teamTScore++; // CT agora é o time que começou em T
                          } else {
                            teamCTScore++; // T agora é o time que começou em CT
                          }
                        }
                        
                        chartData.push({
                          round: r.round,
                          teamCTScore: teamCTScore,
                          teamTScore: teamTScore,
                        });
                      }
                      
                      // Verificar qual time tem qual score final para atribuir os nomes corretos
                      // O score final do time que começou em CT deve corresponder ao score do ctTeam atual
                      // Mas precisamos verificar qual nome corresponde a qual score
                      
                      // Obter scores finais dos times (do analysis)
                      const ctTeamFinalScore = ctTeam?.score || 0;
                      const tTeamFinalScore = tTeam?.score || 0;
                      
                      // Determinar qual nome corresponde ao time que começou em CT
                      // Comparar scores calculados com scores dos times
                      // Se teamCTScore final = ctTeam.score, então nameFromCT é o time que começou em CT
                      // Caso contrário, pode estar invertido
                      
                      let nameForTeamCT = nameFromCT || 'Time CT';
                      let nameForTeamT = nameFromT || 'Time T';
                      
                      // Se os scores finais não batem, pode ser que os nomes estejam invertidos
                      // Comparar o score final calculado do time que começou em CT com o score do ctTeam
                      // Se não bater, pode ser que team1/team2 estejam invertidos no teamNames
                      if (Math.abs(teamCTScore - ctTeamFinalScore) > Math.abs(teamCTScore - tTeamFinalScore)) {
                        // Os scores não batem, provavelmente os nomes estão invertidos
                        // Inverter os nomes
                        nameForTeamCT = nameFromT || 'Time T';
                        nameForTeamT = nameFromCT || 'Time CT';
                      }
                      
                      // Criar objeto com nomes corretos
                      const dataWithNames = chartData.map(d => {
                        const result: any = { round: d.round };
                        result[nameForTeamCT] = d.teamCTScore;
                        result[nameForTeamT] = d.teamTScore;
                        return result;
                      });
                      
                      return dataWithNames;
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="round" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={(() => {
                          const nameFromCT = teamNames?.team1 || teams.find(t => t.team === 'CT')?.teamName || 'Time CT';
                          const nameFromT = teamNames?.team2 || teams.find(t => t.team === 'T')?.teamName || 'Time T';
                          const ctTeam = teams.find(t => t.team === 'CT');
                          const tTeam = teams.find(t => t.team === 'T');
                          
                          // Calcular scores finais para verificar qual nome usar
                          let teamCTScore = 0;
                          let teamTScore = 0;
                          for (const r of detailedRounds) {
                            if (r.round <= 12) {
                              if (r.winner === 'CT') teamCTScore++;
                              else teamTScore++;
                            } else {
                              if (r.winner === 'CT') teamTScore++;
                              else teamCTScore++;
                            }
                          }
                          
                          // Verificar qual nome corresponde ao time que começou em CT
                          if (Math.abs(teamCTScore - (ctTeam?.score || 0)) > Math.abs(teamCTScore - (tTeam?.score || 0))) {
                            return nameFromT;
                          }
                          return nameFromCT;
                        })()}
                        stroke="#3B82F6" 
                        strokeWidth={2} 
                        dot={{ fill: '#3B82F6', r: 4 }} 
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={(() => {
                          const nameFromCT = teamNames?.team1 || teams.find(t => t.team === 'CT')?.teamName || 'Time CT';
                          const nameFromT = teamNames?.team2 || teams.find(t => t.team === 'T')?.teamName || 'Time T';
                          const ctTeam = teams.find(t => t.team === 'CT');
                          const tTeam = teams.find(t => t.team === 'T');
                          
                          // Calcular scores finais para verificar qual nome usar
                          let teamCTScore = 0;
                          let teamTScore = 0;
                          for (const r of detailedRounds) {
                            if (r.round <= 12) {
                              if (r.winner === 'CT') teamCTScore++;
                              else teamTScore++;
                            } else {
                              if (r.winner === 'CT') teamTScore++;
                              else teamCTScore++;
                            }
                          }
                          
                          // Verificar qual nome corresponde ao time que começou em T
                          if (Math.abs(teamTScore - (tTeam?.score || 0)) > Math.abs(teamTScore - (ctTeam?.score || 0))) {
                            return nameFromCT;
                          }
                          return nameFromT;
                        })()}
                        stroke="#F97316" 
                        strokeWidth={2} 
                        dot={{ fill: '#F97316', r: 4 }} 
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de Pizza - Distribuição de Kills */}
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Distribuição de Kills por Jogador
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={players.slice(0, 10).map(p => ({
                          name: p.name.length > 15 ? `${p.name.substring(0, 12)}...` : p.name,
                          value: p.kills,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {players.slice(0, 10).map((entry, index) => {
                          const colors = ['#3B82F6', '#F97316', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#84CC16', '#6366F1'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>


              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Rounds Detalhados</h3>
                <div className="space-y-4">
                  {detailedRounds.map((round) => (
                    <div 
                      key={round.round}
                      className={`bg-black/40 border-2 rounded-2xl p-6 ${
                        round.winner === 'CT' ? 'border-blue-500/30' : 'border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                          round.winner === 'CT' 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                            : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
                        }`}>
                          R{round.round}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold mr-2 ${
                                round.winner === 'CT' 
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              }`}>
                                {round.winner} venceu
                              </span>
                              {'mvp' in round && round.mvp && (
                                <span className="text-xs text-gray-400">MVP: {round.mvp}</span>
                              )}
                            </div>
                            {round.time > 0 && (
                              <span className="text-xs text-gray-500">
                                {Math.floor(round.time / 60)}:{(round.time % 60).toFixed(0).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-200 mb-3">{round.detail}</p>
                          {round.keyEvents && round.keyEvents.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {round.keyEvents.map((event, idx) => (
                                <span 
                                  key={idx}
                                  className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                                >
                                  {event}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Tab: Heatmap */}
          {selectedTab === 'heatmap' && (
            <div className="animate-fade-in">
            <div className="space-y-8">
              {/* Informações do Mapa */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <Flame className="w-8 h-8 text-orange-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">Mapa da Partida</h3>
                    <p className="text-lg text-gray-400 mt-1">Mapa: <span className="text-white font-semibold">{analysis?.map || 'Desconhecido'}</span></p>
                  </div>
                </div>
              </div>

              {/* Heatmap 2D Interativo - Lazy Loading */}
              {(analysis?.killHeatmap || analysis?.deathHeatmap) && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">🗺️ Radar 2D com Heatmap</h3>
                  <p className="text-gray-400 mb-4 text-sm">
                    Visualização 2D do mapa com pontos de calor mostrando eliminações (verde) e mortes (vermelho).
                  </p>
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Carregando heatmap...</p>
                      </div>
                    </div>
                  }>
                    <Heatmap2DViewer 
                      mapName={analysis?.map || 'unknown'}
                      killHeatmap={analysis?.killHeatmap || []}
                      deathHeatmap={analysis?.deathHeatmap || []}
                      playerSteamID={selectedPlayerFilter !== 'all' ? parseInt(selectedPlayerFilter) : null}
                      killEvents={analysis?.killEventsWithPositions || []}
                    />
                  </Suspense>
                </div>
              )}

              {/* Locais onde mais mata */}
              {analysis?.killHeatmap && analysis.killHeatmap.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">📍 Locais onde mais mata</h3>
                  <p className="text-gray-400 mb-4 text-sm">
                    Mapa de calor mostrando as posições onde mais eliminações foram feitas durante a partida.
                  </p>
                  <div className="bg-black/40 rounded-xl p-4">
                    <p className="text-sm text-gray-400">
                      Total de pontos de kill: <span className="text-green-400 font-bold">{analysis.killHeatmap.length}</span>
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Os pontos mais intensos (verdes) indicam áreas com maior concentração de eliminações.
                    </p>
                  </div>
                </div>
              )}

              {/* Locais onde mais morre */}
              {analysis?.deathHeatmap && analysis.deathHeatmap.length > 0 && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">💀 Locais onde mais morre</h3>
                  <p className="text-gray-400 mb-4 text-sm">
                    Mapa de calor mostrando as posições onde mais mortes ocorreram durante a partida.
                  </p>
                  <div className="bg-black/40 rounded-xl p-4">
                    <p className="text-sm text-gray-400">
                      Total de pontos de morte: <span className="text-red-400 font-bold">{analysis.deathHeatmap.length}</span>
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Analise esses pontos para identificar áreas de risco e melhorar posicionamento.
                    </p>
                  </div>
                </div>
              )}

            </div>
            </div>
          )}



          {/* Tab: Chat RUSH */}
          {selectedTab === 'chat' && (
            <div className="animate-fade-in">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-orange-400" />
                <div>
                  <h3 className="text-2xl font-bold text-white">RUSH Coach</h3>
                  <p className="text-sm text-gray-400">Converse com a IA sobre a análise</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-4 bg-black/50 rounded-2xl mb-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-orange-500/50 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-400 mb-4">👋 Olá! Sou o <span className="text-orange-500 font-bold">RUSH</span>, seu assistente de análise.</p>
                    <p className="text-gray-500 text-sm mb-4">Pergunte sobre performance, estratégias, ou qualquer aspecto da partida!</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {['Como foi minha performance?', 'Quais foram os momentos decisivos?', 'Como melhorar?', 'Análise dos times'].map((q, i) => (
                        <button
                          key={i}
                          onClick={() => setChatInput(q)}
                          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-orange-500 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-black shadow-lg shadow-orange-500/30' 
                          : 'bg-gray-800 border border-gray-700 text-gray-100'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      handleChatSubmit(e);
                    }
                  }}
                  placeholder="Pergunte ao RUSH sobre a análise..."
                  className="flex-1 bg-black text-white border border-gray-700 focus:border-orange-500 rounded-xl px-5 py-3 focus:outline-none transition-all placeholder-gray-500"
                />
                <button 
                  onClick={handleChatSubmit}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black px-6 py-3 rounded-xl font-black shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 transition-all hover:scale-105 glow-orange"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            </div>
          )}

          </div>
          {/* Action Buttons */}
          <div className="mt-12 grid grid-cols-2 gap-6">
            <button 
              onClick={() => setCurrentPage('upload-area')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black py-6 rounded-2xl text-xl font-black shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 transition-all hover:scale-105 glow-orange flex items-center justify-center gap-3"
            >
              <Upload className="w-6 h-6" />
              Nova Análise
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-orange-500 text-white py-6 rounded-2xl text-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-3">
              <Target className="w-6 h-6" />
              Export PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-2xl">Carregando...</div>
    </div>
  );
};

export default CS2ProAnalyzerApp;