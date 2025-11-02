import { AnalysisData, AnalysisType, PlayerStats, TeamStats, ZonePerformance, DetailedRound } from './types';

// Tipos que vêm do Go processor
interface GoMetadata {
  map: string;
  duration: string;
  rounds: number;
  scoreT: number;
  scoreCT: number;
  warmupRounds?: number;  // Número de rounds de aquecimento
  knifeRound?: boolean;   // Se tem round de faca
  source?: string;        // "GC" ou "Valve"
}

interface GoEvent {
  type: string;
  time: number;
  tick: number;
  round: number;
  isWarmup?: boolean;  // Se o evento é de round de aquecimento
  isKnife?: boolean;   // Se o evento é de round de faca
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

  // Filtrar eventos válidos (ignorar warmup e knife rounds)
  // Usar IsWarmup e IsKnife se disponíveis, caso contrário fallback para round > 0
  const validEvents = events.filter(e => {
    if (e.isWarmup === true || e.isKnife === true) {
      return false; // Ignorar warmup e knife rounds
    }
    // Fallback: ignorar round 0 ou negativo
    return e.round > 0;
  });
  
  // VERIFICAR SE É GC (Gamers Club) OU VALVE MM
  const isGC = metadata.source === 'GC';
  
  // ENCONTRAR O ÚLTIMO ROUND REAL NO OUTPUT
  let lastRound = 0;
  validEvents.forEach(e => {
    if (e.round > 0 && !e.isWarmup && !e.isKnife && e.round > lastRound) {
      lastRound = e.round;
    }
  });
  
  // LÓGICA DIFERENTE PARA GC E MM
  let firstOfficialRound: number;
  let officialRounds: Set<number>;
  
  if (isGC) {
    // GC: Partida oficial começa no round 5, contar do round 5 até o fim (pode ter overtime)
    firstOfficialRound = 5;
    officialRounds = new Set<number>();
    for (let r = firstOfficialRound; r <= lastRound; r++) {
      officialRounds.add(r);
    }
    console.log(`[DEBUG GC] Partida GC detectada: contando do round ${firstOfficialRound} até ${lastRound} (${officialRounds.size} rounds)`);
  } else {
    // VALVE MM: Contar TODOS os rounds oficiais desde o início até o fim (pode ter overtime)
    // MM não precisa ignorar rounds iniciais, conta todos os rounds oficiais
    firstOfficialRound = 1;
    officialRounds = new Set<number>();
    for (let r = firstOfficialRound; r <= lastRound; r++) {
      officialRounds.add(r);
    }
    console.log(`[DEBUG MM] Partida Valve MM: contando todos os rounds oficiais do ${firstOfficialRound} até ${lastRound} (${officialRounds.size} rounds)`);
  }
  
  // Filtrar eventos para APENAS os rounds oficiais (GC: do 5 em diante, MM: todos desde o início)
  const officialEvents = validEvents.filter(e => {
    const isInRange = officialRounds.has(e.round);
    const isOfficial = e.round > 0 && !e.isWarmup && !e.isKnife;
    return isInRange && isOfficial;
  });
  
  console.log(`[DEBUG] Rounds oficiais: ${Array.from(officialRounds).sort((a,b) => a-b).slice(0, 10).join(', ')}... (total: ${officialRounds.size} rounds)`);
  console.log(`[DEBUG] Total de eventos oficiais: ${officialEvents.length}`);
  
  // Usar 'officialEvents' como 'last20Events' para manter compatibilidade com código existente
  const last20Events = officialEvents;
  const last20Rounds = officialRounds;
  
  // Separar jogadores por time
  const ctPlayers = players.filter(p => p.team === 'CT');
  const tPlayers = players.filter(p => p.team === 'T');

  // Calcular estatísticas detalhadas para TODOS os jogadores
  // IMPORTANTE: Usar apenas eventos dos últimos 20 rounds oficiais
  const playerStatsMap = new Map<number, PlayerStats>();
  const playerDamageMap = new Map<number, number>(); // Para calcular ADR
  const playerHSKillsMap = new Map<number, number>(); // Para calcular HS rate
  const playerKillsByRound = new Map<number, Set<number>>(); // Jogador -> rounds com kills
  
  // Processar eventos de kill para calcular HS rate e contar rounds válidos (APENAS ÚLTIMOS 20)
  last20Events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      const killerSteamID = event.data.killer?.steamID;
      const isHeadshot = event.data.headshot === true;
      
      if (killerSteamID) {
        // Contar headshots
        if (isHeadshot) {
          playerHSKillsMap.set(killerSteamID, (playerHSKillsMap.get(killerSteamID) || 0) + 1);
        }
        
        // Registrar round com kill para contar rounds jogados
        if (!playerKillsByRound.has(killerSteamID)) {
          playerKillsByRound.set(killerSteamID, new Set());
        }
        playerKillsByRound.get(killerSteamID)!.add(event.round);
      }
    }
  });

  // Nota: O Go processor não retorna eventos de PlayerHurt no JSON
  // O dano só está disponível para targetPlayer via findPlayerAnalysis
  // Vamos usar uma estimativa baseada em kills para outros jogadores

  // Contar rounds válidos (oficiais)
  // GC: todos do round 5 em diante | MM: últimos 20
  const validRounds = last20Rounds.size;
  
  // Recalcular kills e deaths apenas dos últimos 20 rounds oficiais
  const playerKillsMap = new Map<number, number>();
  const playerDeathsMap = new Map<number, number>();
  const playerAssistsMap = new Map<number, number>();
  
  last20Events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      const killerSteamID = event.data.killer?.steamID;
      const victimSteamID = event.data.victim?.steamID;
      
      // IGNORAR MORTES SEM KILLER (suicídios: queda, explosão própria, etc.) - não conta como death
      // Em CS2, suicídios não contam nas estatísticas oficiais
      if (!killerSteamID || killerSteamID === 0) {
        return; // Pular suicídio (sem killer)
      }
      
      // IGNORAR SELF-KILLS (killer matou a si mesmo) - não conta como kill nem death
      if (killerSteamID && victimSteamID && killerSteamID === victimSteamID) {
        return; // Pular self-kill
      }
      
      // IGNORAR TEAM-KILLS (mesmo time) - não conta como kill nem death
      if (killerSteamID && victimSteamID) {
        const killerPlayer = players.find(p => p.steamID === killerSteamID);
        const victimPlayer = players.find(p => p.steamID === victimSteamID);
        if (killerPlayer && victimPlayer && killerPlayer.team === victimPlayer.team) {
          return; // Pular team-kill
        }
      }
      
      if (killerSteamID) {
        playerKillsMap.set(killerSteamID, (playerKillsMap.get(killerSteamID) || 0) + 1);
      }
      if (victimSteamID) {
        playerDeathsMap.set(victimSteamID, (playerDeathsMap.get(victimSteamID) || 0) + 1);
      }
      // Contar assists também
      const assisterSteamID = event.data.assister ? 
        (typeof event.data.assister === 'object' && event.data.assister !== null && 'steamID' in event.data.assister
          ? (event.data.assister as any).steamID
          : null)
        : null;
      // Assist pode vir como string (nome) ou objeto, vamos procurar pelo nome no playerMap
      if (event.data.assister && typeof event.data.assister === 'string' && event.data.assister.trim() !== '') {
        const assisterName = event.data.assister;
        const assisterPlayer = players.find(p => p.name === assisterName);
        if (assisterPlayer) {
          playerAssistsMap.set(assisterPlayer.steamID, (playerAssistsMap.get(assisterPlayer.steamID) || 0) + 1);
        }
      }
    }
  });

  players.forEach(p => {
    // Usar kills, deaths e assists recalculados APENAS dos últimos 20 rounds oficiais
    const kills = playerKillsMap.get(p.steamID) || 0;
    const deaths = playerDeathsMap.get(p.steamID) || 0; // Recontar apenas dos últimos 20
    const assists = playerAssistsMap.get(p.steamID) || 0; // Recontar apenas dos últimos 20
    const kdRatio = deaths > 0 ? kills / deaths : kills;
    
    // Damage: usar do targetPlayer se disponível, senão estimar baseado em kills
    let totalDamage = 0;
    if (goData.targetPlayer && goData.targetPlayer.steamID === p.steamID) {
      totalDamage = goData.targetPlayer.damage || 0;
    } else {
      // Estimativa: média de ~75 de dano por kill (considerando dano não letal)
      totalDamage = kills * 75;
    }
    
    const hsKills = playerHSKillsMap.get(p.steamID) || 0;
    const roundsWithKills = playerKillsByRound.get(p.steamID)?.size || 0;
    const roundsPlayed = roundsWithKills > 0 ? roundsWithKills : validRounds; // Estimativa se não tiver kills
    
    // Calcular ADR (dano médio por round)
    const adr = roundsPlayed > 0 ? totalDamage / roundsPlayed : 0;
    
    // Calcular HS rate (percentual de headshots)
    const hsRate = kills > 0 ? (hsKills / kills) * 100 : 0;
    
    // Se tiver targetPlayer com dados mais precisos, usar eles
    if (goData.targetPlayer && goData.targetPlayer.steamID === p.steamID) {
      const tp = goData.targetPlayer;
      playerStatsMap.set(p.steamID, {
        steamID: p.steamID,
        name: p.name,
        team: p.team as 'CT' | 'T',
        kills,
        deaths,
        assists,
        adr: tp.adr || adr,
        hsRate: tp.hsRate || hsRate,
        kdRatio: tp.kdRatio || kdRatio,
        damage: tp.damage || totalDamage,
        roundsPlayed: tp.roundsPlayed || roundsPlayed,
      });
    } else {
      playerStatsMap.set(p.steamID, {
        steamID: p.steamID,
        name: p.name,
        team: p.team as 'CT' | 'T',
        kills,
        deaths,
        assists,
        adr,
        hsRate,
        kdRatio,
        damage: totalDamage,
        roundsPlayed,
      });
    }
  });

  const allPlayerStats = Array.from(playerStatsMap.values());

  // Encontrar MVP de cada time (jogador com melhor K/D em cada lado)
  const ctMVP = ctPlayers.length > 0 
    ? allPlayerStats
        .filter(p => p.team === 'CT')
        .reduce((max, p) => (p.kdRatio || 0) > (max.kdRatio || 0) ? p : max, allPlayerStats.find(p => p.team === 'CT') || allPlayerStats[0])
    : null;
  
  const tMVP = tPlayers.length > 0
    ? allPlayerStats
        .filter(p => p.team === 'T')
        .reduce((max, p) => (p.kdRatio || 0) > (max.kdRatio || 0) ? p : max, allPlayerStats.find(p => p.team === 'T') || allPlayerStats[0])
    : null;

  // Calcular toppers
  const mostKills = allPlayerStats.reduce((max, p) => p.kills > max.kills ? p : max, allPlayerStats[0] || allPlayerStats[0]);
  const mostAssists = allPlayerStats.reduce((max, p) => p.assists > max.assists ? p : max, allPlayerStats[0] || allPlayerStats[0]);
  const mostDeaths = allPlayerStats.reduce((max, p) => p.deaths > max.deaths ? p : max, allPlayerStats[0] || allPlayerStats[0]);
  const mostDamage = allPlayerStats.reduce((max, p) => (p.adr || 0) > (max.adr || 0) ? p : max, allPlayerStats[0] || allPlayerStats[0]);
  const bestKDRatio = allPlayerStats.reduce((max, p) => (p.kdRatio || 0) > (max.kdRatio || 0) ? p : max, allPlayerStats[0] || allPlayerStats[0]);

  // Análise por zonas do mapa (usando apenas kills dos últimos 20 rounds oficiais)
  const zoneStats: Map<string, { kills: number; deaths: number; team: 'CT' | 'T' }[]> = new Map();
  
  last20Events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      const killerPos = event.data.killer?.position;
      const victimPos = event.data.victim?.position;
      
      if (killerPos && victimPos) {
        const zone = getMapZone(killerPos.x, killerPos.y, killerPos.z, metadata.map);
        const killerSteamID = event.data.killer?.steamID;
        const killerTeam = killerSteamID 
          ? (allPlayerStats.find(p => p.steamID === killerSteamID)?.team || 'CT') 
          : 'CT';
        
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

  // Calcular controle por zona baseado em kills de cada time na zona
  const zonePerformance: ZonePerformance[] = Array.from(zoneStats.entries()).map(([zone, teamStats]) => {
    const ctStats = teamStats.find(s => s.team === 'CT') || { kills: 0, deaths: 0, team: 'CT' as const };
    const tStats = teamStats.find(s => s.team === 'T') || { kills: 0, deaths: 0, team: 'T' as const };
    const totalKills = ctStats.kills + tStats.kills;
    // Controle baseado em qual time tem mais kills na zona
    // CT control = (kills CT / total kills) * 100
    const control = totalKills > 0 ? (ctStats.kills / totalKills) * 100 : 50;
    
    return {
      zone,
      kills: Math.max(ctStats.kills, tStats.kills), // Maior número de kills na zona
      deaths: Math.max(ctStats.deaths, tStats.deaths),
      control: Math.round(control), // Percentual de controle de CT (0-100)
    };
  });

  // Calcular kills totais apenas dos últimos 20 rounds oficiais
  const validKills = last20Events.filter(e => e.type === 'kill');
  const ctTotalKills = Array.from(playerKillsMap.entries())
    .filter(([steamID]) => ctPlayers.some(p => p.steamID === steamID))
    .reduce((sum, [, kills]) => sum + kills, 0);
  const ctTotalDeaths = ctPlayers.reduce((sum, p) => sum + (playerDeathsMap.get(p.steamID) || 0), 0);
  const tTotalKills = Array.from(playerKillsMap.entries())
    .filter(([steamID]) => tPlayers.some(p => p.steamID === steamID))
    .reduce((sum, [, kills]) => sum + kills, 0);
  const tTotalDeaths = tPlayers.reduce((sum, p) => sum + (playerDeathsMap.get(p.steamID) || 0), 0);

  // Calcular ADR médio por time
  const ctAvgADR = ctPlayers.length > 0
    ? ctPlayers.reduce((sum, p) => {
        const stats = allPlayerStats.find(s => s.steamID === p.steamID);
        return sum + (stats?.adr || 0);
      }, 0) / ctPlayers.length
    : 0;
  
  const tAvgADR = tPlayers.length > 0
    ? tPlayers.reduce((sum, p) => {
        const stats = allPlayerStats.find(s => s.steamID === p.steamID);
        return sum + (stats?.adr || 0);
      }, 0) / tPlayers.length
    : 0;

  const bombEvents = last20Events.filter(e => e.type.startsWith('bomb_'));
  const ctBombDefuses = bombEvents.filter(e => e.type === 'bomb_defused').length;
  const tBombPlants = bombEvents.filter(e => e.type === 'bomb_planted').length;

  // Nome dos times baseado no MVP de cada lado
  const ctTeamName = ctMVP ? ctMVP.name : 'Counter-Terrorists';
  const tTeamName = tMVP ? tMVP.name : 'Terrorists';

  const teams: TeamStats[] = [
    {
      team: 'CT',
      teamName: ctTeamName,
      score: metadata.scoreCT,
      totalKills: ctTotalKills,
      totalDeaths: ctTotalDeaths,
      avgKDRatio: ctTotalDeaths > 0 ? ctTotalKills / ctTotalDeaths : ctTotalKills,
      avgADR: ctAvgADR,
      bombPlants: 0,
      bombDefuses: ctBombDefuses,
      zonePerformance: zonePerformance.filter(z => z.control > 50),
    },
    {
      team: 'T',
      teamName: tTeamName,
      score: metadata.scoreT,
      totalKills: tTotalKills,
      totalDeaths: tTotalDeaths,
      avgKDRatio: tTotalDeaths > 0 ? tTotalKills / tTotalDeaths : tTotalKills,
      avgADR: tAvgADR,
      bombPlants: tBombPlants,
      bombDefuses: 0,
      zonePerformance: zonePerformance.filter(z => z.control <= 50),
    },
  ];

  // Gerar rounds detalhados (apenas dos últimos 20 rounds oficiais)
  const roundEvents: Map<number, GoEvent[]> = new Map();
  last20Events.forEach(e => {
    if (e.round > 0 && last20Rounds.has(e.round)) {
      if (!roundEvents.has(e.round)) {
        roundEvents.set(e.round, []);
      }
      roundEvents.get(e.round)!.push(e);
    }
  });

  // Normalizar numeração dos rounds para começar em 1 (apenas visual)
  // Para GC: se começa no round 5, o primeiro round será exibido como R1
  // Para MM: já começa em 1, então não precisa ajustar
  const roundOffset = firstOfficialRound - 1; // Se primeiro é 5, offset é 4
  
  const detailedRounds: DetailedRound[] = last20Events
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
      keyEvents.push(`${kills} eliminações`);
      
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
      
      // Calcular round normalizado para exibição (começar em 1)
      const displayRound = roundNum - roundOffset;
      
      let detail = `Round ${displayRound}: `;
      if (reason === 16) detail += 'Bomba explodiu';
      else if (reason === 8) detail += 'Bomba desarmada';
      else if (reason === 1) detail += 'Terroristas eliminados';
      else if (reason === 7) detail += 'CTs eliminados';
      else detail += 'Finalizado';
      
      detail += ` • ${keyEvents.join(', ')}`;

      return {
        round: displayRound, // Usar round normalizado para exibição
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
      
      // Identificar qual time controla a zona
      const controllingTeam = zonePerf && zonePerf.control > 50 ? ctTeamName : tTeamName;
      
      return {
        zone,
        pressure,
        note: `${activity} eventos registrados${zonePerf ? ` • Controle: ${controllingTeam} (${zonePerf.control}%)` : ''}`,
      };
    });

  // Radar moments melhorados (apenas dos últimos 20 rounds)
  const radarMoments = goData.radarReplay
    ? goData.radarReplay
        .filter((snapshot: any) => snapshot.players && snapshot.players.length > 0 && snapshot.round > 0 && last20Rounds.has(snapshot.round))
        .slice(0, 10)
        .map((snapshot: any) => {
          const roundEventsList = roundEvents.get(snapshot.round) || [];
          const latestKill = roundEventsList.filter((e: any) => e.type === 'kill').pop();
          
          // Normalizar round para exibição (começar em 1)
          const displayRound = snapshot.round - roundOffset;
          
          let highlight = 'Posicionamento';
          let callout = '';
          
          if (latestKill) {
            highlight = `Kill: ${latestKill.data?.killer?.name || 'Unknown'} eliminou ${latestKill.data?.victim?.name || 'Unknown'}`;
            callout = `Round ${displayRound}`;
          } else if (roundEventsList.some((e: any) => e.type === 'bomb_planted')) {
            highlight = 'Bomba plantada';
            callout = `Round ${displayRound}`;
          } else {
            callout = `Round ${displayRound}`;
          }

          const minutes = Math.floor(snapshot.time / 60);
          const seconds = Math.floor(snapshot.time % 60);
          // Usar round normalizado para calcular fase
          const normalizedRound = snapshot.round - roundOffset;
          const totalRounds = last20Rounds.size;
          const phase = normalizedRound <= totalRounds / 3 ? 'início' as const : 
                       normalizedRound <= totalRounds * 2 / 3 ? 'meio' as const : 'final' as const;

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

  // Round highlights melhorados (apenas dos últimos 20 rounds)
  const roundHighlights = detailedRounds
    .filter(r => r.keyEvents.length > 2 || r.winner !== (metadata.scoreCT > metadata.scoreT ? 'CT' : 'T'))
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
  keyFindings.push(`⚔️ ${validKills.length} eliminações no total (${validRounds} rounds válidos)`);
  keyFindings.push(`💣 ${tBombPlants} bomba(s) plantada(s), ${ctBombDefuses} desarmada(s)`);
  keyFindings.push(`📊 Resultado: ${metadata.scoreCT}-${metadata.scoreT} (${metadata.scoreCT > metadata.scoreT ? ctTeamName : tTeamName} venceu)`);
  
  if (mostKills) {
    keyFindings.push(`🔫 Mais kills: ${mostKills.name} (${mostKills.kills})`);
  }
  if (mostAssists) {
    keyFindings.push(`🤝 Mais assists: ${mostAssists.name} (${mostAssists.assists})`);
  }
  if (mostDeaths) {
    keyFindings.push(`💀 Mais mortes: ${mostDeaths.name} (${mostDeaths.deaths})`);
  }

  // Recomendações melhoradas
  const recommendations: string[] = [];
  if (teams[0].avgKDRatio < teams[1].avgKDRatio) {
    recommendations.push(`${teams[0].teamName} precisa melhorar controle de duplas e trocas`);
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
    ${validRounds} rounds válidos disputados, resultado final: ${metadata.scoreCT}-${metadata.scoreT}. 
    ${validKills.length} eliminações registradas. 
    ${teams.find(t => t.team === 'T')?.bombPlants || 0} bombas plantadas e ${teams.find(t => t.team === 'CT')?.bombDefuses || 0} desarmadas.`;

  return {
    type,
    map: metadata.map || 'unknown',
    duration: metadata.duration,
    rounds: validRounds,
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
        `Total de rounds válidos: ${validRounds}`,
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
      mostDeaths,
      mostDamage,
      bestKDRatio,
    },
    detailedRounds,
    // Campos de warmup/knife detection
    warmupRounds: metadata.warmupRounds,
    knifeRound: metadata.knifeRound,
    source: metadata.source,
  };
};
