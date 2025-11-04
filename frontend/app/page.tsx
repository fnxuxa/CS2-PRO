'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Upload, User, Users, MessageSquare, Check, Loader2, TrendingUp, Target, Award, Zap, AlertCircle, ArrowRight, Star, Crown, Sparkles, Send, Flame, Compass, BarChart3, Crosshair, Shield, Skull, TrendingDown, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

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
  killEventsWithPositions?: Array<{ killer?: { steamID?: number; position?: { x: number; y: number; z: number } }; victim?: { steamID?: number; position?: { x: number; y: number; z: number } } }>;
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
  killEvents?: Array<{ killer?: { steamID?: number; position?: { x: number; y: number; z: number } }; victim?: { steamID?: number; position?: { x: number; y: number; z: number } } }>; // Eventos de kill para filtrar
}

const Heatmap2DViewer: React.FC<Heatmap2DViewerProps> = ({ mapName, killHeatmap, deathHeatmap, playerSteamID, killEvents }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const radarImageRef = React.useRef<HTMLImageElement | null>(null);
  const [showKills, setShowKills] = React.useState(true);
  const [showDeaths, setShowDeaths] = React.useState(true);
  const [radarLoaded, setRadarLoaded] = React.useState(false);
  
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
      if (event.victimSteamID === playerSteamID && event.victimPosition) {
        const pos = event.victimPosition;
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

  // Coordenadas de referência para diferentes mapas (baseado em coordenadas reais do CS2)
  // Esses valores são aproximações baseadas nos bounds dos mapas
  const mapBounds: Record<string, { minX: number; maxX: number; minY: number; maxY: number; originX: number; originY: number; scale: number }> = {
    'de_mirage': { minX: -3230, maxX: 1912, minY: -3400, maxY: 1682, originX: -3230, originY: 1682, scale: 1024 },
    'de_dust2': { minX: -2476, maxX: 2476, minY: -3239, maxY: 3239, originX: -2476, originY: 3239, scale: 1024 },
    'de_inferno': { minX: -2087, maxX: 2230, minY: -2194, maxY: 2700, originX: -2087, originY: 2700, scale: 1024 },
    'de_ancient': { minX: -2951, maxX: 2338, minY: -3364, maxY: 1990, originX: -2951, originY: 1990, scale: 1024 },
    'de_vertigo': { minX: -3168, maxX: 3168, minY: -2304, maxY: 4032, originX: -3168, originY: 4032, scale: 1024 },
    'de_anubis': { minX: -2856, maxX: 2856, minY: -2856, maxY: 2856, originX: -2856, originY: 2856, scale: 1024 },
    'de_overpass': { minX: -4831, maxX: 4831, minY: -3071, maxY: 3071, originX: -4831, originY: 3071, scale: 1024 },
    'de_nuke': { minX: -3456, maxX: 3456, minY: -2496, maxY: 3456, originX: -3456, originY: 3456, scale: 1024 },
  };

  const bounds = mapBounds[mapName] || { minX: -3000, maxX: 3000, minY: -3000, maxY: 3000, originX: -3000, originY: 3000, scale: 1024 };

  // Mapeamento de nomes de mapas para arquivos de radar disponíveis no repositório
  // Baseado em: https://github.com/markus-wa/demoinfocs-golang/tree/master/examples/_assets/radar
  const mapToRadarFiles: Record<string, string[]> = {
    'de_mirage': ['de_mirage_radar_psd.png'],
    'de_dust2': ['de_dust2_radar_psd.png'],
    'de_inferno': ['de_inferno_radar_psd.png'],
    'de_ancient': ['de_ancient_radar_psd.png'],
    'de_vertigo': ['de_vertigo_radar_psd.png'],
    'de_anubis': ['de_anubis_radar_psd.png'],
    'de_overpass': ['de_overpass_radar_psd.png'],
    'de_nuke': ['de_nuke_radar_psd.png'],
    'de_cache': ['de_cache_radar_psd.png'],
    'de_train': ['de_train_radar_psd.png'],
    'de_cbble': ['de_cbble_radar_psd.png'],
  };

  // Função para normalizar nome do mapa e encontrar arquivo correspondente
  const findRadarFile = (map: string): string[] => {
    const normalizedMap = map.toLowerCase().trim();
    
    // Tentar encontrar mapeamento direto
    if (mapToRadarFiles[normalizedMap]) {
      return mapToRadarFiles[normalizedMap];
    }
    
    // Tentar extrair nome base (ex: "de_inferno" -> "inferno")
    const baseName = normalizedMap.replace(/^de_/, '');
    
    // Gerar possíveis nomes de arquivo baseado nos padrões encontrados
    const possibleNames = [
      `${normalizedMap}_radar_psd.png`,
      `de_${baseName}_radar_psd.png`,
      `${baseName}_radar_psd.png`,
    ];
    
    return possibleNames;
  };

  // Carregar imagem de radar dos assets do demoinfocs-golang (GitHub)
  React.useEffect(() => {
    // Resetar estado ao mudar o mapa
    setRadarLoaded(false);
    radarImageRef.current = null;
    
    if (!mapName || mapName === 'unknown') {
      console.warn('⚠️ Nome do mapa não identificado:', mapName);
      return;
    }
    
    console.log('🔍 Tentando carregar radar para mapa:', mapName);
    
    // Encontrar possíveis nomes de arquivo
    const possibleFileNames = findRadarFile(mapName);
    console.log('📋 Possíveis arquivos:', possibleFileNames);
    
    const baseUrl = 'https://raw.githubusercontent.com/markus-wa/demoinfocs-golang/master/examples/_assets/radar/';
    
    let currentIndex = 0;
    const img = new Image();
    
    // Tentar sem CORS primeiro (pode funcionar para GitHub raw)
    // Se precisar, mudaremos para 'anonymous' depois
    img.crossOrigin = null;
    
    const tryNextFile = () => {
      if (currentIndex >= possibleFileNames.length) {
        // Todas as tentativas falharam
        console.warn(`❌ Não foi possível carregar radar para ${mapName}. Tentativas:`, possibleFileNames);
        
        // Fallback: tentar saiko.tech
        console.log('🔄 Tentando fallback saiko.tech...');
        const fallbackUrl = `https://radar-overviews.csgo.saiko.tech/${mapName}/radar.png`;
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        
        fallbackImg.onload = () => {
          console.log('✅ Radar carregado do saiko.tech:', mapName);
          radarImageRef.current = fallbackImg;
          setRadarLoaded(true);
        };
        
        fallbackImg.onerror = () => {
          console.warn(`❌ Fallback saiko.tech também falhou para ${mapName}`);
        };
        
        fallbackImg.src = fallbackUrl;
        return;
      }
      
      const fileName = possibleFileNames[currentIndex];
      const radarUrl = `${baseUrl}${fileName}`;
      console.log(`🔄 Tentativa ${currentIndex + 1}/${possibleFileNames.length}: ${radarUrl}`);
      
      img.onload = () => {
        console.log(`✅ Radar carregado com sucesso: ${fileName} para mapa ${mapName}`);
        radarImageRef.current = img;
        setRadarLoaded(true);
      };
      
      img.onerror = (e) => {
        console.warn(`⚠️ Falha ao carregar: ${radarUrl}`);
        currentIndex++;
        tryNextFile();
      };
      
      img.src = radarUrl;
    };
    
    tryNextFile();
  }, [mapName]);

  // Função para converter coordenadas 3D do CS2 para 2D do canvas
  // Baseado no sistema de coordenadas do Source Engine: X=leste/oeste, Y=norte/sul, Z=altura
  // Os radares do CS2 geralmente têm o norte no topo e oeste à esquerda
  const worldToCanvas = (x: number, y: number, width: number, height: number) => {
    const originX = bounds.originX || bounds.minX;
    const originY = bounds.originY || bounds.maxY;
    
    // Normalizar coordenadas: converter de coordenadas do mundo para 0-1
    // Usar coordenadas ORIGINAIS (X e Y) sem trocar, como vem do GitHub radar
    // X: leste (positivo) = direita no radar
    const normalizedX = (x - originX) / (bounds.maxX - bounds.minX);
    
    // Y: norte (positivo em CS2) = topo no radar (precisa inverter porque canvas Y cresce para baixo)
    const normalizedY = (originY - y) / (bounds.maxY - bounds.minY);
    
    // Retornar coordenadas do canvas (0,0 = topo esquerdo)
    return {
      x: normalizedX * width,
      y: normalizedY * height,
    };
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = 1024; // Tamanho padrão dos radares CS2
    const height = canvas.height = 1024;

    // Limpar canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Desenhar imagem de radar de fundo se disponível
    if (radarImageRef.current && radarLoaded) {
      try {
        // Desenhar a imagem completa no canvas
        ctx.drawImage(radarImageRef.current, 0, 0, width, height);
        console.log('✅ Imagem de radar desenhada no canvas');
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
    const displayKillHeatmap = filteredKillHeatmap;
    const displayDeathHeatmap = filteredDeathHeatmap;
    
    // Calcular máximos para normalização
    let maxKills = 0;
    let maxDeaths = 0;
    if (showKills && displayKillHeatmap.length > 0) {
      maxKills = Math.max(...displayKillHeatmap.map(p => p.count));
    }
    if (showDeaths && displayDeathHeatmap.length > 0) {
      maxDeaths = Math.max(...displayDeathHeatmap.map(p => p.count));
    }
    
    const blurRadius = 25; // Raio menor para heatmap mais compacto e preciso
    const intensityMultiplier = 1.2; // Multiplicador de intensidade reduzido
    
    // Desenhar kills (verde) com gradiente radial suave
    if (showKills && maxKills > 0) {
      displayKillHeatmap.forEach(point => {
        const pos = worldToCanvas(point.x, point.y, width, height);
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
        const pos = worldToCanvas(point.x, point.y, width, height);
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
        const pos = worldToCanvas(point.x, point.y, width, height);
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
        const pos = worldToCanvas(point.x, point.y, width, height);
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

  }, [filteredKillHeatmap, filteredDeathHeatmap, showKills, showDeaths, mapName, radarLoaded]);

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
            <span className="ml-2 text-green-400">✓ Radar carregado</span>
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
              <div className="inline-flex items-center gap-2 bg-red-500/20 border-2 border-red-500 rounded-full px-6 py-2 mb-8 animate-pulse">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-black text-sm tracking-wider">⚠️ PARE DE JOGAR NO ESCURO</span>
              </div>
              
              <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
                Você Está <span className="text-orange-500 animate-pulse inline-block">Perdendo</span><br/>
                <span className="text-5xl md:text-6xl">Por Falta de Análise</span>
              </h2>
              
              <p className="text-2xl md:text-3xl text-gray-200 mb-10 max-w-4xl mx-auto drop-shadow-lg font-medium">
                Enquanto você joga no <span className="line-through text-gray-500">feeling</span>, seus adversários usam 
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

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-orange-500 rounded-full flex justify-center p-2">
              <div className="w-1 h-3 bg-orange-500 rounded-full animate-pulse"></div>
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
                Upload → Escolha Análise (Player/Team) → IA Processa → Chat Ilimitado para Dúvidas
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
                { icon: Target, title: 'Escolha: Player ou Team', desc: 'Análise individual profunda OU estratégia de time completa.', delay: '0.15s' },
                { icon: MessageSquare, title: 'Chat IA Ilimitado', desc: 'Pergunte qualquer coisa. A IA responde como um coach profissional.', delay: '0.3s' }
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
                  <p className="text-xl text-gray-400 mb-8">Arraste ou clique para selecionar arquivo .dem</p>
                  
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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-gray-900 border-2 border-orange-500/30 rounded-3xl p-12 text-center shadow-2xl shadow-orange-500/20">
          <div className="relative w-28 h-28 mx-auto mb-10">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full animate-pulse shadow-2xl shadow-orange-500/50"></div>
            <Loader2 className="relative w-28 h-28 text-black animate-spin" />
          </div>
          
          <h3 className="text-4xl font-black text-white mb-6">Processando Demo</h3>
          <p className="text-gray-400 mb-10 text-xl">
            IA analisando <span className="text-orange-500 font-bold">{uploadedDemo?.name}</span>
          </p>
          <p className="text-sm text-gray-500 mb-8 uppercase tracking-[0.3em]">
            Status: {
              jobStatus === 'idle' ? 'Aguardando' :
              jobStatus === 'queued' ? 'Na fila' :
              jobStatus === 'processing' ? 'Processando' :
              jobStatus === 'completed' ? 'Concluído' :
              'Falhou'
            }
          </p>
          
          <div className="bg-black rounded-full h-4 overflow-hidden mb-10 shadow-inner">
            <div 
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-full shadow-lg shadow-orange-500/50 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <ul className="space-y-4 text-left">
            <li className={`flex items-center text-lg ${progress > 20 ? 'text-green-400' : 'text-gray-600'}`}>
              {progress > 20 ? <Check className="w-6 h-6 mr-3" /> : <div className="w-6 h-6 mr-3 border-2 border-gray-700 rounded-full"></div>}
              Parsing demo file
            </li>
            <li className={`flex items-center text-lg ${progress > 40 ? 'text-green-400' : progress > 20 ? 'text-orange-500' : 'text-gray-600'}`}>
              {progress > 40 ? <Check className="w-6 h-6 mr-3" /> : progress > 20 ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <div className="w-6 h-6 mr-3 border-2 border-gray-700 rounded-full"></div>}
              Extraindo eventos
            </li>
            <li className={`flex items-center text-lg ${progress > 70 ? 'text-green-400' : progress > 40 ? 'text-orange-500' : 'text-gray-600'}`}>
              {progress > 70 ? <Check className="w-6 h-6 mr-3" /> : progress > 40 ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <div className="w-6 h-6 mr-3 border-2 border-gray-700 rounded-full"></div>}
              Calculando estatísticas avançadas
            </li>
            <li className={`flex items-center text-lg ${progress > 90 ? 'text-green-400' : progress > 70 ? 'text-orange-500' : 'text-gray-600'}`}>
              {progress > 90 ? <Check className="w-6 h-6 mr-3" /> : progress > 70 ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <div className="w-6 h-6 mr-3 border-2 border-gray-700 rounded-full"></div>}
              Gerando relatório com IA
            </li>
          </ul>
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
            <div className="flex gap-2 overflow-x-auto pb-2">
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
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                    selectedTab === id
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-black shadow-lg shadow-orange-500/50'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo das Tabs */}
          {selectedTab === 'overview' && (
            <div className="space-y-8">
              {/* MVP e Top Performers */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-4 border-orange-500 rounded-3xl p-8 shadow-2xl shadow-orange-500/30">
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
                    <div className="bg-gray-900 border-2 border-gray-800 rounded-2xl p-6">
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
                    
                    <div className="bg-gray-900 border-2 border-gray-800 rounded-2xl p-6">
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

              {/* Tabela de Jogadores */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Estatísticas dos Jogadores</h3>
                
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
                      {playersByKills.map((player, idx) => (
                        <tr key={player.steamID} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 font-bold">#{idx + 1}</span>
                              <span className="text-white font-semibold truncate max-w-[200px]" title={player.name}>
                                {player.name.length > 25 ? `${player.name.substring(0, 22)}...` : player.name}
                              </span>
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
                      ))}
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
                    {filteredWeaponStats.slice(0, 9).map((weapon: WeaponStats, idx: number) => (
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
                      const firstKills = (player.entryFragWins || 0);
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
                            role.primaryRole === 'Lurker' ? 'text-purple-400' :
                            role.primaryRole === 'AWPer' ? 'text-yellow-400' :
                            role.primaryRole === 'Rifler' ? 'text-orange-400' :
                            role.primaryRole === 'Anchor' ? 'text-cyan-400' :
                            'text-green-400'
                          }`}>
                            {role.primaryRole}
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Entry:</span>
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
          )}

          {/* Tab: Teams */}
          {selectedTab === 'teams' && (
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
          )}

          {/* Tab: Rounds */}
          {selectedTab === 'rounds' && (
            <div className="space-y-8">
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
          )}

          {/* Tab: Heatmap */}
          {selectedTab === 'heatmap' && (
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

              {/* Heatmap 2D Interativo */}
              {(analysis?.killHeatmap || analysis?.deathHeatmap) && (
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6">🗺️ Radar 2D com Heatmap</h3>
                  <p className="text-gray-400 mb-4 text-sm">
                    Visualização 2D do mapa com pontos de calor mostrando eliminações (verde) e mortes (vermelho).
                  </p>
                  <Heatmap2DViewer 
                    mapName={analysis?.map || 'unknown'}
                    killHeatmap={analysis?.killHeatmap || []}
                    deathHeatmap={analysis?.deathHeatmap || []}
                    playerSteamID={selectedPlayerFilter !== 'all' ? parseInt(selectedPlayerFilter) : null}
                    killEvents={analysis?.killEventsWithPositions || []}
                  />
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
          )}



          {/* Tab: Chat RUSH */}
          {selectedTab === 'chat' && (
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
          )}

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