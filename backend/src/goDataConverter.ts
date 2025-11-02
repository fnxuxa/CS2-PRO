import { AnalysisData, AnalysisType, PlayerStats, TeamStats, ZonePerformance, DetailedRound } from './types';

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
  targetPlayer?: {
    steamID: number;
    name: string;
    team: string;
    kills: number;
    deaths: number;
    assists: number;
    hsKills: number;
    damage: number;
    adr: number;
    hsRate: number;
    kdRatio: number;
    roundsPlayed: number;
  };
}

/**
 * Determina zona do mapa baseado na posição X,Y,Z
 */
const getMapZone = (x: number, y: number, z: number, mapName: string): string => {
  // Mapeamento básico por coordenadas (pode ser expandido)
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  
  // Zonas genéricas baseadas em coordenadas
  if (z < -150) {
    if (absX < 500 && absY < 500) return 'Site A';
    if (absX < 1000 && absY > 500) return 'Site B';
    return 'Underground';
  }
  
  if (absX < 500 && absY < 500) return 'Mid';
  if (x > 0 && absY < 1000) return 'Long A';
  if (x < 0 && absY < 1000) return 'Long B';
  if (absY > 1000) return 'Spawn';
  
  return 'Unknown';
};

/**
 * Converte o JSON do Go processor para o formato AnalysisData esperado pelo frontend
 */
export const convertGoDataToAnalysisData = (goData: GoAnalysis, type: AnalysisType = 'player'): AnalysisData => {
  const { metadata, events, players, summary, heatmap } = goData;

  // Separar jogadores por time
  const ctPlayers = players.filter(p => p.team === 'CT');
  const tPlayers = players.filter(p => p.team === 'T');

  // Calcular estatísticas dos jogadores com dados do targetPlayer se disponível
  const playerStatsMap = new Map<number, PlayerStats>();
  
  players.forEach(p => {
    const kdRatio = p.deaths > 0 ? p.kills / p.deaths : p.kills;
    playerStatsMap.set(p.steamID, {
      steamID: p.steamID,
      name: p.name,
      team: p.team as 'CT' | 'T',
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kdRatio,
    });
  });

  // Se tiver targetPlayer com dados detalhados, usar eles
  if (goData.targetPlayer) {
    const tp = goData.targetPlayer;
    const existing = playerStatsMap.get(tp.steamID);
    if (existing) {
      playerStatsMap.set(tp.steamID, {
        ...existing,
        adr: tp.adr,
        hsRate: tp.hsRate,
        kdRatio: tp.kdRatio,
        damage: tp.damage,
        roundsPlayed: tp.roundsPlayed,
      });
    }
  }

  const allPlayerStats = Array.from(playerStatsMap.values());

  // Calcular toppers
  const mostKills = allPlayerStats.reduce((max, p) => p.kills > max.kills ? p : max, allPlayerStats[0] || allPlayerStats[0]);
  const mostAssists = allPlayerStats.reduce((max, p) => p.assists > max.assists ? p : max, allPlayerStats[0] || allPlayerStats[0]);
  const mostDamage = goData.targetPlayer 
    ? allPlayerStats.find(p => p.steamID === goData.targetPlayer!.steamID) || allPlayerStats[0]
    : allPlayerStats[0];
  const bestKDRatio = allPlayerStats.reduce((max, p) => (p.kdRatio || 0) > (max.kdRatio || 0) ? p : max, allPlayerStats[0] || allPlayerStats[0]);

  // Análise por zonas do mapa
  const zoneStats: Map<string, { kills: number; deaths: number; team: 'CT' | 'T' }[]> = new Map();
  
  events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      const killerPos = event.data.killer?.position;
      const victimPos = event.data.victim?.position;
      
      if (killerPos && victimPos) {
        const zone = getMapZone(killerPos.x, killerPos.y, killerPos.z, metadata.map);
        const killerTeam = event.data.killer?.name ? 
          (allPlayerStats.find(p => p.name === event.data.killer.name)?.team || 'CT') : 'CT';
        
        if (!zoneStats.has(zone)) {
          zoneStats.set(zone, []);
        }
        const stats = zoneStats.get(zone)!;
        const teamStat = stats.find(s => s.team === killerTeam);
        if (teamStat) {
          teamStat.kills++;
        } else {
          stats.push({ kills: 1, deaths: 0, team: killerTeam as 'CT' | 'T' });
        }
      }
    }
  });

  // Calcular controle por zona
  const zonePerformance: ZonePerformance[] = Array.from(zoneStats.entries()).map(([zone, teamStats]) => {
    const ctStats = teamStats.find(s => s.team === 'CT') || { kills: 0, deaths: 0, team: 'CT' as const };
    const tStats = teamStats.find(s => s.team === 'T') || { kills: 0, deaths: 0, team: 'T' as const };
    const totalKills = ctStats.kills + tStats.kills;
    const control = totalKills > 0 ? (ctStats.kills / totalKills) * 100 : 50;
    
    return {
      zone,
      kills: Math.max(ctStats.kills, tStats.kills),
      deaths: Math.max(ctStats.deaths, tStats.deaths),
      control: Math.round(control),
    };
  });

  // Estatísticas dos times
  const ctTotalKills = ctPlayers.reduce((sum, p) => sum + p.kills, 0);
  const ctTotalDeaths = ctPlayers.reduce((sum, p) => sum + p.deaths, 0);
  const tTotalKills = tPlayers.reduce((sum, p) => sum + p.kills, 0);
  const tTotalDeaths = tPlayers.reduce((sum, p) => sum + p.deaths, 0);

  const bombEvents = events.filter(e => e.type.startsWith('bomb_'));
  const ctBombDefuses = bombEvents.filter(e => e.type === 'bomb_defused').length;
  const tBombPlants = bombEvents.filter(e => e.type === 'bomb_planted').length;

  const teams: TeamStats[] = [
    {
      team: 'CT',
      score: metadata.scoreCT,
      totalKills: ctTotalKills,
      totalDeaths: ctTotalDeaths,
      avgKDRatio: ctTotalDeaths > 0 ? ctTotalKills / ctTotalDeaths : ctTotalKills,
      avgADR: 0, // Será calculado se tiver dados de dano
      bombPlants: 0,
      bombDefuses: ctBombDefuses,
      zonePerformance: zonePerformance.filter(z => z.control > 50),
    },
    {
      team: 'T',
      score: metadata.scoreT,
      totalKills: tTotalKills,
      totalDeaths: tTotalDeaths,
      avgKDRatio: tTotalDeaths > 0 ? tTotalKills / tTotalDeaths : tTotalKills,
      avgADR: 0,
      bombPlants: tBombPlants,
      bombDefuses: 0,
      zonePerformance: zonePerformance.filter(z => z.control <= 50),
    },
  ];

  // Gerar rounds detalhados
  const roundEvents: Map<number, GoEvent[]> = new Map();
  events.forEach(e => {
    if (e.round > 0) {
      if (!roundEvents.has(e.round)) {
        roundEvents.set(e.round, []);
      }
      roundEvents.get(e.round)!.push(e);
    }
  });

  const detailedRounds: DetailedRound[] = events
    .filter(e => e.type === 'round_end')
    .map(event => {
      const roundNum = event.round;
      const roundEventsList = roundEvents.get(roundNum) || [];
      
      const kills = roundEventsList.filter(e => e.type === 'kill').length;
      const bombPlanted = roundEventsList.some(e => e.type === 'bomb_planted');
      const bombDefused = roundEventsList.some(e => e.type === 'bomb_defused');
      
      const keyEvents: string[] = [];
      if (bombPlanted) keyEvents.push('Bomba plantada');
      if (bombDefused) keyEvents.push('Bomba desarmada');
      keyEvents.push(`${kills} eliminação${kills !== 1 ? 'ões' : ''}`);
      
      // Encontrar MVP do round (mais kills)
      const roundKills = roundEventsList.filter(e => e.type === 'kill');
      const playerKillCount: Map<string, number> = new Map();
      roundKills.forEach(e => {
        if (e.data?.killer?.name) {
          playerKillCount.set(e.data.killer.name, (playerKillCount.get(e.data.killer.name) || 0) + 1);
        }
      });
      const roundMVP = Array.from(playerKillCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

      const winner = event.data?.winner || 'CT';
      const reason = event.data?.reason || 0;
      
      let detail = `Round ${roundNum}: `;
      if (reason === 16) detail += 'Bomba explodiu';
      else if (reason === 8) detail += 'Bomba desarmada';
      else if (reason === 1) detail += 'Terroristas eliminados';
      else if (reason === 7) detail += 'CTs eliminados';
      else detail += 'Finalizado';
      
      detail += ` • ${keyEvents.join(', ')}`;

      return {
        round: roundNum,
        winner: winner as 'CT' | 'T',
        reason,
        time: event.time,
        keyEvents,
        mvp: roundMVP,
        detail,
      };
    })
    .sort((a, b) => a.round - b.round);

  // Hotspots melhorados baseados em zonas com mais atividade
  const zoneActivity: Map<string, number> = new Map();
  heatmap.points.forEach(point => {
    const zone = getMapZone(point.x, point.y, point.z, metadata.map);
    zoneActivity.set(zone, (zoneActivity.get(zone) || 0) + point.intensity);
  });

  const heatmapHotspots = Array.from(zoneActivity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([zone, activity]) => {
      const zonePerf = zonePerformance.find(z => z.zone === zone);
      let pressure: 'Alta' | 'Média' | 'Baixa' = activity > 20 ? 'Alta' : activity > 10 ? 'Média' : 'Baixa';
      
      return {
        zone,
        pressure,
        note: `${activity} eventos registrados${zonePerf ? ` • Controle: ${zonePerf.control > 50 ? 'CT' : 'T'} (${zonePerf.control}%)` : ''}`,
      };
    });

  // Radar moments melhorados
  const radarMoments = goData.radarReplay
    ? goData.radarReplay
        .filter((snapshot: any) => snapshot.players && snapshot.players.length > 0)
        .slice(0, 10)
        .map((snapshot: any) => {
          const roundEventsList = roundEvents.get(snapshot.round) || [];
          const latestKill = roundEventsList.filter((e: any) => e.type === 'kill').pop();
          
          let highlight = 'Posicionamento';
          let callout = '';
          
          if (latestKill) {
            highlight = `Kill: ${latestKill.data?.killer?.name || 'Unknown'} eliminou ${latestKill.data?.victim?.name || 'Unknown'}`;
            callout = `Round ${snapshot.round}`;
          } else if (roundEventsList.some((e: any) => e.type === 'bomb_planted')) {
            highlight = 'Bomba plantada';
            callout = `Round ${snapshot.round}`;
          } else {
            callout = `Round ${snapshot.round}`;
          }

          const minutes = Math.floor(snapshot.time / 60);
          const seconds = Math.floor(snapshot.time % 60);
          const phase = snapshot.round <= metadata.rounds / 3 ? 'início' as const : 
                       snapshot.round <= metadata.rounds * 2 / 3 ? 'meio' as const : 'final' as const;

          return {
            tick: snapshot.tick,
            clock: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            phase,
            callout,
            highlight,
            players: snapshot.players.slice(0, 6).map((p: any) => ({
              name: p.name,
              role: p.team === 'CT' ? 'ct' as const : 't' as const,
              x: p.position?.x || 0,
              y: p.position?.y || 0,
              action: p.isAlive ? `Vivo (${p.health}HP)` : 'Morto',
            })),
          };
        })
    : [];

  // Round highlights melhorados
  const roundHighlights = detailedRounds
    .filter(r => r.keyEvents.length > 2 || r.winner !== metadata.scoreCT > metadata.scoreT ? 'CT' : 'T')
    .slice(0, 8)
    .map(r => ({
      round: r.round,
      result: `${r.winner} venceu`,
      detail: r.detail,
    }));

  // Key findings melhorados
  const keyFindings: string[] = [];
  if (summary.mvp && summary.mvp !== 'N/A') {
    keyFindings.push(`🏆 MVP: ${summary.mvp} (Rating ${summary.rating.toFixed(2)})`);
  }
  keyFindings.push(`⚔️ ${events.filter(e => e.type === 'kill').length} eliminações no total`);
  keyFindings.push(`💣 ${tBombPlants} bomba(s) plantada(s), ${ctBombDefuses} desarmada(s)`);
  keyFindings.push(`📊 Resultado: ${metadata.scoreCT}-${metadata.scoreT} (${metadata.scoreCT > metadata.scoreT ? 'CT' : 'T'} venceu)`);
  
  if (mostKills) {
    keyFindings.push(`🔫 Mais kills: ${mostKills.name} (${mostKills.kills})`);
  }
  if (mostAssists) {
    keyFindings.push(`🤝 Mais assists: ${mostAssists.name} (${mostAssists.assists})`);
  }

  // Recomendações melhoradas
  const recommendations: string[] = [];
  if (teams[0].avgKDRatio < teams[1].avgKDRatio) {
    recommendations.push('Time CT precisa melhorar controle de duplas e trocas');
  }
  if (tBombPlants > ctBombDefuses * 2) {
    recommendations.push('Focar em retakes e defusas - muitas bombas plantadas sem conversão');
  }
  if (zonePerformance.some(z => z.control < 30 || z.control > 70)) {
    recommendations.push('Melhorar controle de zonas intermediárias - dominância desequilibrada');
  }
  recommendations.push('Revisar heatmap para identificar pontos de maior pressão');
  recommendations.push('Analisar rounds decisivos para entender padrões de jogo');

  // Player metrics
  const topPlayer = allPlayerStats.sort((a, b) => {
    const kda = (k: number, d: number, a: number) => d > 0 ? (k + a * 0.5) / d : k + a;
    return kda(b.kills, b.deaths, b.assists) - kda(a.kills, a.deaths, a.assists);
  })[0];

  const playerMetrics = topPlayer ? [
    {
      label: 'K/D',
      value: topPlayer.kdRatio?.toFixed(2) || (topPlayer.deaths > 0 ? (topPlayer.kills / topPlayer.deaths).toFixed(2) : topPlayer.kills.toString()),
      description: `${topPlayer.name}`,
      trend: (topPlayer.kdRatio || 1) > 1 ? 'up' as const : 'down' as const,
    },
    {
      label: 'Kills',
      value: mostKills.kills.toString(),
      description: `${mostKills.name}`,
      trend: 'up' as const,
    },
    {
      label: 'Assists',
      value: mostAssists.assists.toString(),
      description: `${mostAssists.name}`,
      trend: 'up' as const,
    },
    {
      label: 'ADR',
      value: mostDamage.adr ? mostDamage.adr.toFixed(1) : 'N/A',
      description: mostDamage.name,
      trend: 'up' as const,
    },
  ] : [];

  // Summary
  const summaryText = `Partida no mapa ${metadata.map || 'desconhecido'} com duração de ${metadata.duration}. 
    ${metadata.rounds} rounds disputados, resultado final: ${metadata.scoreCT}-${metadata.scoreT}. 
    ${events.filter(e => e.type === 'kill').length} eliminações registradas. 
    ${teams.find(t => t.team === 'T')?.bombPlants || 0} bombas plantadas e ${teams.find(t => t.team === 'CT')?.bombDefuses || 0} desarmadas.`;

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
    heatmapUrl: '',
    heatmapSummary: `${heatmap.points.length} pontos de atividade em ${zoneActivity.size} zonas do mapa`,
    heatmapHotspots,
    playerMetrics: type === 'player' ? playerMetrics : undefined,
    teamMetrics: type === 'team' ? playerMetrics : undefined,
    radarMoments,
    roundHighlights,
    recommendations,
    economy: {
      averageSpend: 3500,
      economyStrength: metadata.rounds > 15 ? 'Economia estável ao longo da partida' : 'Economia flutuante',
      swings: [
        `Total de rounds: ${metadata.rounds}`,
        `Bombas plantadas: ${tBombPlants}`,
        `Bombas desarmadas: ${ctBombDefuses}`,
      ],
    },
    // Novos campos
    players: allPlayerStats,
    teams,
    topPerformers: {
      mostKills,
      mostAssists,
      mostDamage,
      bestKDRatio,
    },
    detailedRounds,
  };
};
