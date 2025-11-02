import { AnalysisData, AnalysisType } from './types';

// Tipos que vêm do Go processor
interface GoMetadata {
  map: string;
  duration: string;
  rounds: number;
  scoreT: number;
  scoreCT: number;
}

interface GoEvent {
  type: string;
  time: number;
  tick: number;
  round: number;
  data?: any;
}

interface GoPlayer {
  steamID: number;
  name: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
}

interface GoHeatmapPoint {
  x: number;
  y: number;
  z: number;
  intensity: number;
  type: string;
}

interface GoAnalysis {
  metadata: GoMetadata;
  events: GoEvent[];
  players: GoPlayer[];
  summary: {
    mvp: string;
    rating: number;
  };
  heatmap: {
    map: string;
    points: GoHeatmapPoint[];
  };
  radarReplay?: any[];
  targetPlayer?: any;
}

/**
 * Converte o JSON do Go processor para o formato AnalysisData esperado pelo frontend
 */
export const convertGoDataToAnalysisData = (goData: GoAnalysis, type: AnalysisType = 'player'): AnalysisData => {
  const { metadata, events, players, summary, heatmap } = goData;

  // Calcular estatísticas dos jogadores
  const totalKills = players.reduce((sum, p) => sum + p.kills, 0);
  const totalDeaths = players.reduce((sum, p) => sum + p.deaths, 0);
  const avgKDRatio = totalDeaths > 0 ? totalKills / totalDeaths : 0;

  // Extrair eventos de bomba
  const bombEvents = events.filter(e => e.type.startsWith('bomb_'));
  const bombPlantedCount = bombEvents.filter(e => e.type === 'bomb_planted').length;
  const bombDefusedCount = bombEvents.filter(e => e.type === 'bomb_defused').length;
  const bombExplodedCount = bombEvents.filter(e => e.type === 'bomb_exploded').length;

  // Gerar heatmap hotspots baseado nos pontos mais intensos
  const heatmapHotspots = heatmap.points
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10)
    .map(point => {
      let zone = 'Desconhecida';
      if (point.type === 'kill') zone = 'Zona de Combate';
      else if (point.type === 'death') zone = 'Zona de Risco';
      else if (point.type === 'bomb_planted') zone = 'Site de Bomba';
      else if (point.type === 'bomb_exploded') zone = 'Explosão de Bomba';

      return {
        zone,
        pressure: point.intensity > 5 ? 'Alta' as const : point.intensity > 2 ? 'Média' as const : 'Baixa' as const,
        note: `${point.intensity} eventos registrados`,
      };
    });

  // Gerar radar moments dos eventos importantes
  const radarMoments = events
    .filter(e => ['kill', 'bomb_planted', 'bomb_defused', 'round_start'].includes(e.type))
    .slice(0, 20)
    .map(event => {
      let highlight = '';
      let callout = '';
      const phase = event.round <= metadata.rounds / 3 ? 'início' as const : 
                    event.round <= metadata.rounds * 2 / 3 ? 'meio' as const : 'final' as const;

      if (event.type === 'kill') {
        highlight = `Kill registrado`;
        callout = `Round ${event.round}`;
      } else if (event.type === 'bomb_planted') {
        highlight = 'Bomba plantada';
        callout = `Round ${event.round}`;
      } else if (event.type === 'bomb_defused') {
        highlight = 'Bomba desarmada';
        callout = `Round ${event.round}`;
      } else {
        highlight = 'Início do round';
        callout = `Round ${event.round}`;
      }

      const minutes = Math.floor(event.time / 60);
      const seconds = Math.floor(event.time % 60);

      return {
        tick: event.tick,
        clock: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        phase,
        callout,
        highlight,
        players: [] as any[], // Será preenchido com dados do radarReplay se disponível
      };
    });

  // Gerar round highlights
  const roundHighlights = events
    .filter(e => e.type === 'round_end')
    .slice(0, 5)
    .map(event => ({
      round: event.round,
      result: event.data?.winner === 'CT' ? 'Vitória CT' : 'Vitória T',
      detail: `Round ${event.round} finalizado`,
    }));

  // Gerar key findings
  const keyFindings: string[] = [];
  if (summary.mvp && summary.mvp !== 'N/A') {
    keyFindings.push(`MVP da partida: ${summary.mvp} com rating ${summary.rating.toFixed(2)}`);
  }
  if (bombPlantedCount > 0) {
    keyFindings.push(`${bombPlantedCount} bomba(s) plantada(s)`);
  }
  if (bombDefusedCount > 0) {
    keyFindings.push(`${bombDefusedCount} bomba(s) desarmada(s)`);
  }
  if (metadata.scoreT > metadata.scoreCT) {
    keyFindings.push(`Terroristas venceram ${metadata.scoreT}-${metadata.scoreCT}`);
  } else if (metadata.scoreCT > metadata.scoreT) {
    keyFindings.push(`Counter-Terrorists venceram ${metadata.scoreCT}-${metadata.scoreT}`);
  }
  
  keyFindings.push(`${totalKills} kills no total`);
  keyFindings.push(`K/D médio: ${avgKDRatio.toFixed(2)}`);

  // Gerar recomendações baseadas nos dados
  const recommendations: string[] = [];
  if (avgKDRatio < 1.0) {
    recommendations.push('Melhorar posicionamento e evitar mortes desnecessárias');
  }
  if (bombDefusedCount === 0 && bombPlantedCount > 0) {
    recommendations.push('Praticar defusas - nenhuma bomba foi desarmada');
  }
  recommendations.push('Revisar heatmap para identificar zonas de risco');
  recommendations.push('Analisar radar replay para entender movimentação');

  // Calcular economia (simulado baseado em rounds)
  const totalRounds = metadata.rounds;
  const economyStrength = totalRounds > 15 ? 'Economia estável' : 'Economia flutuante';

  // Gerar player metrics
  const topPlayer = players.sort((a, b) => {
    const kda = (k: number, d: number, a: number) => d > 0 ? (k + a * 0.5) / d : k + a;
    return kda(b.kills, b.deaths, b.assists) - kda(a.kills, a.deaths, a.assists);
  })[0];

  const playerMetrics = topPlayer ? [
    {
      label: 'K/D',
      value: topPlayer.deaths > 0 ? (topPlayer.kills / topPlayer.deaths).toFixed(2) : topPlayer.kills.toString(),
      description: `${topPlayer.name}`,
      trend: 'up' as const,
    },
    {
      label: 'Kills',
      value: topPlayer.kills.toString(),
      description: `Total de eliminações`,
      trend: 'up' as const,
    },
    {
      label: 'Assists',
      value: topPlayer.assists.toString(),
      description: `Total de assistências`,
      trend: 'neutral' as const,
    },
  ] : [];

  // Gerar summary
  const summaryText = `Partida no mapa ${metadata.map || 'desconhecido'} com duração de ${metadata.duration}. 
    ${metadata.rounds} rounds disputados, resultado final: ${metadata.scoreT}-${metadata.scoreCT}. 
    ${totalKills} kills registrados ao longo da partida.`;

  return {
    type,
    map: metadata.map || 'unknown',
    duration: metadata.duration,
    rounds: metadata.rounds,
    mvp: summary.mvp || 'N/A',
    rating: summary.rating,
    score: `${metadata.scoreCT}-${metadata.scoreT}`,
    summary: summaryText,
    keyFindings,
    heatmapUrl: '', // Será gerado no frontend se necessário
    heatmapSummary: `${heatmap.points.length} pontos de atividade registrados no heatmap`,
    heatmapHotspots,
    playerMetrics: type === 'player' ? playerMetrics : undefined,
    teamMetrics: type === 'team' ? playerMetrics : undefined,
    radarMoments,
    roundHighlights,
    recommendations,
    economy: {
      averageSpend: 3500, // Valor estimado
      economyStrength,
      swings: [
        `Total de rounds: ${metadata.rounds}`,
        `Bombas plantadas: ${bombPlantedCount}`,
        `Bombas desarmadas: ${bombDefusedCount}`,
      ],
    },
  };
};

