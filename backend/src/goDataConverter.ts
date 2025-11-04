import { AnalysisData, AnalysisType, PlayerStats, TeamStats, ZonePerformance, DetailedRound, TradeKill, EntryFrag, ClutchSituation, WeaponStats, RoundPerformance, CriticalError, Highlight, TeamPlay, PlayerRole } from './types';

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

  // CORREÇÃO: Contar TODOS os eventos primeiro, depois filtrar
  // Isso garante que não perdemos nenhum evento válido
  const allEvents = events.filter(e => e.round > 0); // Remover apenas round 0 ou negativo
  
  // VERIFICAR SE É GC (Gamers Club) OU VALVE MM
  // Usar metadata.source se disponível, senão detectar baseado em warmupRounds
  let isGC = metadata.source === 'GC';
  if (!metadata.source && metadata.warmupRounds && metadata.warmupRounds >= 4) {
    isGC = true; // GC geralmente tem 4 rounds de warmup
    console.log(`[DEBUG] Detectado como GC baseado em ${metadata.warmupRounds} rounds de warmup`);
  }
  console.log(`[DEBUG] Tipo de partida: ${isGC ? 'GC (Gamers Club)' : 'Valve MM'} - Source: ${metadata.source || 'N/A'}`);
  
  // ENCONTRAR O ÚLTIMO ROUND REAL NO OUTPUT (considerando todos os eventos)
  let lastRound = 0;
  allEvents.forEach(e => {
    if (e.round > 0 && e.round > lastRound) {
      lastRound = e.round;
    }
  });
  
  // GC: Ignorar primeiros 4 rounds (aquecimento), começar do round 5
  // MM: Usar todos os rounds oficiais desde o início
  let firstOfficialRound: number;
  const officialRounds = new Set<number>();
  
  if (isGC) {
    // GC: rounds 5 em diante são oficiais
    firstOfficialRound = 5;
    for (let r = firstOfficialRound; r <= lastRound; r++) {
      officialRounds.add(r);
    }
    console.log(`[DEBUG GC] Partida GC: ignorando rounds 1-4 (aquecimento), contando do round ${firstOfficialRound} até ${lastRound} (${officialRounds.size} rounds)`);
  } else {
    // MM: todos os rounds oficiais desde o início
    firstOfficialRound = 1;
    for (let r = firstOfficialRound; r <= lastRound; r++) {
      officialRounds.add(r);
    }
    console.log(`[DEBUG MM] Partida Valve MM: contando todos os rounds oficiais do ${firstOfficialRound} até ${lastRound} (${officialRounds.size} rounds)`);
  }
  
  // Filtrar eventos para TODOS os rounds oficiais
  // IMPORTANTE: A lógica do Go já marca eventos com IsWarmup/IsKnife corretamente
  // Para GC: rounds 1-4 são sempre warmup (ignorados no Go)
  // Para MM: eventos com IsWarmup=true são warmup
  // Vamos confiar nas flags IsWarmup/IsKnife do evento E verificar a lista de rounds oficiais
  const officialEvents = allEvents.filter(e => {
    // PRIMEIRO: Se o evento tem flags explícitas de warmup/knife, respeitar SEMPRE
    if (e.isWarmup === true || e.isKnife === true) {
      return false; // Ignorar eventos explicitamente marcados como warmup/knife
    }
    
    // SEGUNDO: Verificar se o round está na lista de rounds oficiais
    // Para GC: rounds 1-4 não estão na lista (são warmup)
    // Para MM: todos os rounds oficiais estão na lista
    if (!officialRounds.has(e.round)) {
      return false; // Round não é oficial (warmup ou após último round)
    }
    
    // Se chegou aqui, é um evento de round oficial sem flags de warmup/knife
    return true;
  });
  
  console.log(`[DEBUG] Total de eventos: ${events.length}, Eventos após filtro de rounds oficiais: ${officialEvents.length}`);
  console.log(`[DEBUG] Kills em todos os eventos: ${events.filter(e => e.type === 'kill').length}, Kills em rounds oficiais: ${officialEvents.filter(e => e.type === 'kill').length}`);
  
  // Usar todos os rounds oficiais (não apenas últimos 20)
  const last20Events = officialEvents; // Mantém nome para compatibilidade
  const last20Rounds = officialRounds; // Todos os rounds oficiais
  
  // Separar jogadores por time
  const ctPlayers = players.filter(p => p.team === 'CT');
  const tPlayers = players.filter(p => p.team === 'T');

  // Calcular estatísticas detalhadas para TODOS os jogadores
  // IMPORTANTE: Usar TODOS os eventos dos rounds oficiais (não apenas últimos 20)
  const playerStatsMap = new Map<number, PlayerStats>();
  const playerDamageMap = new Map<number, number>(); // Para calcular ADR
  const playerHSKillsMap = new Map<number, number>(); // Para calcular HS rate
  const playerKillsByRound = new Map<number, Set<number>>(); // Jogador -> rounds com kills
  
  // Processar eventos de kill para calcular HS rate e contar rounds válidos (TODOS OS ROUNDS OFICIAIS)
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
  // GC: todos do round 5 em diante | MM: todos os rounds oficiais
  const validRounds = last20Rounds.size;
  
  // Recalcular kills e deaths de TODOS os rounds oficiais
  const playerKillsMap = new Map<number, number>();
  const playerDeathsMap = new Map<number, number>();
  const playerAssistsMap = new Map<number, number>();
  
  // Contar todas as kills primeiro para debug
  const totalKillEvents = last20Events.filter(e => e.type === 'kill').length;
  let processedKills = 0;
  let skippedKills = 0;
  let skippedSuicides = 0;
  let skippedSelfKills = 0;
  let skippedTeamKills = 0;
  let missingPlayers = 0;
  
  // Criar mapa rápido de players por SteamID para melhor performance
  const playersBySteamID = new Map<number, typeof players[0]>();
  players.forEach(p => {
    playersBySteamID.set(p.steamID, p);
  });
  
  // IMPORTANTE: Coletar todos os SteamIDs que aparecem em eventos de kill
  // para verificar se há players que aparecem em kills mas não estão no array
  const allKillerSteamIDs = new Set<number>();
  const allVictimSteamIDs = new Set<number>();
  last20Events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      if (event.data.killer?.steamID) {
        allKillerSteamIDs.add(event.data.killer.steamID);
      }
      if (event.data.victim?.steamID) {
        allVictimSteamIDs.add(event.data.victim.steamID);
      }
    }
  });
  
  // Verificar se há players em eventos que não estão no array de players
  const missingKillerSteamIDs = Array.from(allKillerSteamIDs).filter(id => !playersBySteamID.has(id));
  const missingVictimSteamIDs = Array.from(allVictimSteamIDs).filter(id => !playersBySteamID.has(id));
  
  if (missingKillerSteamIDs.length > 0 || missingVictimSteamIDs.length > 0) {
    console.warn(`[DEBUG WARNING] ⚠️ Players em eventos de kill que não estão no array de players:`);
    if (missingKillerSteamIDs.length > 0) {
      console.warn(`[DEBUG WARNING]   - Killers faltando: ${missingKillerSteamIDs.length} SteamIDs`);
      missingKillerSteamIDs.slice(0, 5).forEach(id => {
        const killEvent = last20Events.find(e => e.type === 'kill' && e.data?.killer?.steamID === id);
        console.warn(`[DEBUG WARNING]     SteamID ${id}: ${killEvent?.data?.killer?.name || 'Unknown'}`);
      });
    }
    if (missingVictimSteamIDs.length > 0) {
      console.warn(`[DEBUG WARNING]   - Victims faltando: ${missingVictimSteamIDs.length} SteamIDs`);
      missingVictimSteamIDs.slice(0, 5).forEach(id => {
        const killEvent = last20Events.find(e => e.type === 'kill' && e.data?.victim?.steamID === id);
        console.warn(`[DEBUG WARNING]     SteamID ${id}: ${killEvent?.data?.victim?.name || 'Unknown'}`);
      });
    }
    console.warn(`[DEBUG WARNING] ⚠️ Esses kills serão contados como válidos (não podem ser verificados como team-kills)`);
  }
  
  console.log(`[DEBUG] Players disponíveis: ${players.length} (CT: ${players.filter(p => p.team === 'CT').length}, T: ${players.filter(p => p.team === 'T').length})`);
  console.log(`[DEBUG] SteamIDs únicos em kills: ${allKillerSteamIDs.size} killers, ${allVictimSteamIDs.size} victims`);
  
  last20Events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      const killerSteamID = event.data.killer?.steamID;
      const victimSteamID = event.data.victim?.steamID;
      const killerName = event.data.killer?.name || 'Unknown';
      const victimName = event.data.victim?.name || 'Unknown';
      
      // IGNORAR MORTES SEM KILLER (suicídios: queda, explosão própria, etc.) - não conta como death
      // Em CS2, suicídios não contam nas estatísticas oficiais
      if (!killerSteamID || killerSteamID === 0) {
        skippedSuicides++;
        skippedKills++;
        return; // Pular suicídio (sem killer)
      }
      
      // IGNORAR SELF-KILLS (killer matou a si mesmo) - não conta como kill nem death
      if (killerSteamID && victimSteamID && killerSteamID === victimSteamID) {
        skippedSelfKills++;
        skippedKills++;
        return; // Pular self-kill
      }
      
      // IGNORAR TEAM-KILLS (mesmo time) - não conta como kill nem death
      // IMPORTANTE: Usar o time do evento (mais confiável) OU o time do player no array
      // O time no evento reflete o time atual do player no momento da kill
      if (killerSteamID && victimSteamID && killerSteamID !== victimSteamID) {
        // PRIMEIRO: Tentar usar o time diretamente do evento (mais confiável)
        const killerTeamFromEvent = event.data.killer?.team;
        const victimTeamFromEvent = event.data.victim?.team;
        
        // Se ambos os times estão no evento e são iguais, é team-kill
        if (killerTeamFromEvent && victimTeamFromEvent && killerTeamFromEvent === victimTeamFromEvent) {
          skippedTeamKills++;
          skippedKills++;
          return; // Pular team-kill
        }
        
        // SEGUNDO: Se não tiver time no evento, usar o array de players (fallback)
        const killerPlayer = playersBySteamID.get(killerSteamID);
        const victimPlayer = playersBySteamID.get(victimSteamID);
        
        if (killerPlayer && victimPlayer) {
          // Se os times no array são iguais, é team-kill
          if (killerPlayer.team === victimPlayer.team) {
            skippedTeamKills++;
            skippedKills++;
            return; // Pular team-kill
          }
        } else {
          // Se algum player não foi encontrado, contar como kill válida
          missingPlayers++;
        }
      }
      
      // Esta é uma kill válida - contar
      processedKills++;
      
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
  
  // Log de debug detalhado para verificar contagem de kills
  console.log(`[DEBUG] ========== RESUMO DE KILLS ==========`);
  console.log(`[DEBUG] Total de eventos de kill em rounds oficiais: ${totalKillEvents}`);
  console.log(`[DEBUG] Kills processadas (válidas): ${processedKills}`);
  console.log(`[DEBUG] Kills ignoradas (total): ${skippedKills}`);
  console.log(`[DEBUG]   - Suicídios: ${skippedSuicides}`);
  console.log(`[DEBUG]   - Self-kills: ${skippedSelfKills}`);
  console.log(`[DEBUG]   - Team-kills: ${skippedTeamKills}`);
  console.log(`[DEBUG] Kills com players não encontrados (contadas como válidas): ${missingPlayers}`);
  console.log(`[DEBUG] Total de kills por jogador:`, Array.from(playerKillsMap.entries()).reduce((sum, [, kills]) => sum + kills, 0));
  console.log(`[DEBUG] Total de deaths por jogador:`, Array.from(playerDeathsMap.entries()).reduce((sum, [, deaths]) => sum + deaths, 0));
  console.log(`[DEBUG] Verificação: ${processedKills} + ${skippedKills} = ${processedKills + skippedKills} (deve ser igual a ${totalKillEvents})`);
  
  // Verificar se há discrepância
  if (processedKills + skippedKills !== totalKillEvents) {
    console.warn(`[DEBUG WARNING] ⚠️ Discrepância na contagem: ${processedKills} + ${skippedKills} = ${processedKills + skippedKills}, mas total de eventos é ${totalKillEvents}`);
    console.warn(`[DEBUG WARNING] Diferença: ${Math.abs((processedKills + skippedKills) - totalKillEvents)} kills não foram processadas!`);
  } else {
    console.log(`[DEBUG] ✅ Contagem correta: todos os eventos foram processados`);
  }
  
  // Log detalhado dos players e seus times
  console.log(`[DEBUG] Total de players no array: ${players.length}`);
  players.forEach(p => {
    const kills = playerKillsMap.get(p.steamID) || 0;
    const deaths = playerDeathsMap.get(p.steamID) || 0;
    const kdr = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toString();
    console.log(`[DEBUG PLAYER] ${p.name.padEnd(20)} (${p.team}) - K: ${kills.toString().padStart(3)} D: ${deaths.toString().padStart(3)} KDR: ${kdr}`);
  });
  console.log(`[DEBUG] ====================================`);

  // ==================== CALCULAR ESTATÍSTICAS AVANÇADAS ====================
  
  // 1. TRADES: Aliado mata quem matou seu aliado dentro de 8 segundos
  const tradeKills: TradeKill[] = [];
  const playerSuccessfulTradesMap = new Map<number, number>();
  const playerFailedTradesMap = new Map<number, number>();
  const playerTradeKillsMap = new Map<number, TradeKill[]>();
  
  // Processar kills em ordem cronológica por round
  const killsByRound = new Map<number, Array<{ event: GoEvent; killerSteamID: number; victimSteamID: number; killerTeam: string; victimTeam: string; time: number }>>();
  
  officialEvents.forEach(event => {
    if (event.type === 'kill' && event.data?.killer && event.data?.victim) {
      const killerSteamID = event.data.killer.steamID;
      const victimSteamID = event.data.victim.steamID;
      const killerTeam = event.data.killer.team || playersBySteamID.get(killerSteamID)?.team || 'CT';
      const victimTeam = event.data.victim.team || playersBySteamID.get(victimSteamID)?.team || 'CT';
      
      if (killerSteamID && victimSteamID && killerSteamID !== victimSteamID && killerTeam !== victimTeam) {
        if (!killsByRound.has(event.round)) {
          killsByRound.set(event.round, []);
        }
        killsByRound.get(event.round)!.push({
          event,
          killerSteamID,
          victimSteamID,
          killerTeam,
          victimTeam,
          time: event.time,
        });
      }
    }
  });
  
  // Para cada kill, verificar se houve trade dentro de 8 segundos
  killsByRound.forEach((kills, round) => {
    kills.forEach((kill, index) => {
      const { victimSteamID, killerSteamID, killerTeam, time } = kill;
      
      // Encontrar aliados do victim que estavam vivos
      const victimTeam = playersBySteamID.get(victimSteamID)?.team || 'CT';
      const victimAllies = players.filter(p => p.team === victimTeam && p.steamID !== victimSteamID);
      
      // Procurar kills dos aliados nos próximos 8 segundos (ou até o final do round)
      let tradeFound = false;
      let tradeKill: any = null;
      const failedTrades: Array<{ player: string; playerSteamID: number; distance: number }> = [];
      
      // Verificar kills subsequentes no mesmo round
      const subsequentKills = kills.slice(index + 1);
      for (const nextKill of subsequentKills) {
        const timeDiff = nextKill.time - time;
        if (timeDiff > 8) break; // Mais de 8 segundos
        
        // Se um aliado matou o killer, é trade bem-sucedida
        if (nextKill.victimSteamID === killerSteamID && nextKill.killerSteamID !== killerSteamID) {
          const trader = playersBySteamID.get(nextKill.killerSteamID);
          if (trader && trader.team === victimTeam) {
            tradeFound = true;
            tradeKill = {
              round,
              time: nextKill.time,
              victimSteamID,
              victimName: playersBySteamID.get(victimSteamID)?.name || 'Unknown',
              victim: playersBySteamID.get(victimSteamID)?.name || 'Unknown', // Para compatibilidade com frontend
              killedBySteamID: killerSteamID,
              killedByName: playersBySteamID.get(killerSteamID)?.name || 'Unknown',
              killer: playersBySteamID.get(killerSteamID)?.name || 'Unknown', // Para compatibilidade com frontend
              tradedBy: trader.name,
              tradedBySteamID: trader.steamID,
              tradeTime: timeDiff,
              failedTrades: [],
              tradeType: 'successful' as const,
            };
            
            playerSuccessfulTradesMap.set(trader.steamID, (playerSuccessfulTradesMap.get(trader.steamID) || 0) + 1);
            
            if (!playerTradeKillsMap.has(trader.steamID)) {
              playerTradeKillsMap.set(trader.steamID, []);
            }
            playerTradeKillsMap.get(trader.steamID)!.push(tradeKill);
            
            break;
          }
        }
      }
      
      // Se não encontrou trade, verificar aliados que estavam presentes mas não mataram
      if (!tradeFound) {
        // Procurar aliados que estavam vivos e próximos (simplificado)
        victimAllies.forEach(ally => {
          // Verificar se o aliado estava vivo no momento da kill
          // Se não matou o killer nos próximos 8 segundos, é trade falhada
          const allyKillsAfter = kills.slice(index + 1).filter(k => 
            k.killerSteamID === ally.steamID && (k.time - time) <= 8
          );
          
          if (allyKillsAfter.length === 0) {
            // Aliado estava presente mas não fez trade (estimativa de distância)
            failedTrades.push({
              player: ally.name,
              playerSteamID: ally.steamID,
              distance: 500, // Estimativa
            });
            
            playerFailedTradesMap.set(ally.steamID, (playerFailedTradesMap.get(ally.steamID) || 0) + 1);
          }
        });
        
        if (failedTrades.length > 0) {
          tradeKill = {
            round,
            time,
            victimSteamID,
            victimName: playersBySteamID.get(victimSteamID)?.name || 'Unknown',
            victim: playersBySteamID.get(victimSteamID)?.name || 'Unknown', // Para compatibilidade com frontend
            killedBySteamID: killerSteamID,
            killedByName: playersBySteamID.get(killerSteamID)?.name || 'Unknown',
            killer: playersBySteamID.get(killerSteamID)?.name || 'Unknown', // Para compatibilidade com frontend
            failedTrades,
            tradeType: 'failed' as const,
          };
        }
      }
      
      if (tradeKill) {
        tradeKills.push(tradeKill);
      }
    });
  });
  
  // 2. FIRST KILL / ENTRY FRAGS: Primeira kill do round (só 1 por round)
  const entryFrags: EntryFrag[] = [];
  const roundFirstKills = new Map<number, { killerSteamID: number; victimSteamID: number; time: number }>();
  const playerEntryFragsMap = new Map<number, number>();
  const playerEntryFragWinsMap = new Map<number, number>();
  const playerEntryFragLossesMap = new Map<number, number>();
  
  killsByRound.forEach((kills, round) => {
    if (kills.length === 0) return;
    
    // Primeira kill do round (ordenar por tempo)
    const sortedKills = [...kills].sort((a, b) => a.time - b.time);
    const firstKill = sortedKills[0];
    
    if (firstKill) {
      roundFirstKills.set(round, {
        killerSteamID: firstKill.killerSteamID,
        victimSteamID: firstKill.victimSteamID,
        time: firstKill.time,
      });
      
      playerEntryFragsMap.set(firstKill.killerSteamID, (playerEntryFragsMap.get(firstKill.killerSteamID) || 0) + 1);
      
      // Verificar se o time do killer ganhou o round
      const roundEndEvent = officialEvents.find(e => e.type === 'round_end' && e.round === round);
      const roundWinner = roundEndEvent?.data?.winner || 'CT';
      const killerTeam = playersBySteamID.get(firstKill.killerSteamID)?.team || 'CT';
      
      if (roundWinner === killerTeam) {
        playerEntryFragWinsMap.set(firstKill.killerSteamID, (playerEntryFragWinsMap.get(firstKill.killerSteamID) || 0) + 1);
      } else {
        playerEntryFragLossesMap.set(firstKill.killerSteamID, (playerEntryFragLossesMap.get(firstKill.killerSteamID) || 0) + 1);
      }
      
      entryFrags.push({
        round,
        time: firstKill.time,
        playerSteamID: firstKill.killerSteamID,
        playerName: playersBySteamID.get(firstKill.killerSteamID)?.name || 'Unknown',
        killedSteamID: firstKill.victimSteamID,
        killedName: playersBySteamID.get(firstKill.victimSteamID)?.name || 'Unknown',
        wonRound: roundWinner === killerTeam,
      });
    }
  });
  
  // 3. CLUTCHES: Situações 1vX
  const clutchSituations: ClutchSituation[] = [];
  const playerClutchMap = new Map<number, ClutchSituation[]>();
  
  // Para cada round, rastrear players vivos por time
  const roundAlivePlayers = new Map<number, { ct: number; t: number; players: Map<number, { team: string; alive: boolean }> }>();
  
  killsByRound.forEach((kills, round) => {
    if (!roundAlivePlayers.has(round)) {
      roundAlivePlayers.set(round, { ct: 5, t: 5, players: new Map() });
    }
    const roundState = roundAlivePlayers.get(round)!;
    
    // Inicializar todos os players como vivos
    players.forEach(p => {
      if (!roundState.players.has(p.steamID)) {
        roundState.players.set(p.steamID, { team: p.team, alive: true });
      }
    });
    
    // Processar kills do round
    kills.forEach(kill => {
      const victim = roundState.players.get(kill.victimSteamID);
      if (victim && victim.alive) {
        victim.alive = false;
        if (victim.team === 'CT') roundState.ct--;
        else roundState.t--;
      }
    });
    
    // Verificar clutch situations (1v2, 1v3, 1v4, 1v5)
    const ctAlive = roundState.ct;
    const tAlive = roundState.t;
    
    // Encontrar o player que fez clutch
    const alivePlayers = Array.from(roundState.players.entries())
      .filter(([_, state]) => state.alive)
      .map(([steamID, state]) => ({ steamID, team: state.team }));
    
    alivePlayers.forEach(clutchPlayer => {
      const enemiesAlive = clutchPlayer.team === 'CT' ? tAlive : ctAlive;
      const teammatesAlive = clutchPlayer.team === 'CT' ? ctAlive - 1 : tAlive - 1;
      
      if (teammatesAlive === 0 && enemiesAlive >= 2 && enemiesAlive <= 5) {
        const situation = `1v${enemiesAlive}` as '1v2' | '1v3' | '1v4' | '1v5';
        
        // Verificar se ganhou o round
        const roundEndEvent = officialEvents.find(e => e.type === 'round_end' && e.round === round);
        const roundWinner = roundEndEvent?.data?.winner || 'CT';
        const won = roundWinner === clutchPlayer.team;
        
        const clutch: ClutchSituation = {
          round,
          playerSteamID: clutchPlayer.steamID,
          playerName: playersBySteamID.get(clutchPlayer.steamID)?.name || 'Unknown',
          situation,
          won,
          enemiesAlive,
          teammatesAlive: 0,
        };
        
        clutchSituations.push(clutch);
        
        if (!playerClutchMap.has(clutchPlayer.steamID)) {
          playerClutchMap.set(clutchPlayer.steamID, []);
        }
        playerClutchMap.get(clutchPlayer.steamID)!.push(clutch);
      }
    });
  });
  
  // 4. WEAPON STATS: Kills por arma
  const weaponStatsMap = new Map<string, { kills: number; headshots: number; damage: number }>();
  const playerWeaponStatsMap = new Map<number, Map<string, { kills: number; headshots: number; damage: number }>>();
  
  officialEvents.forEach(event => {
    if (event.type === 'kill' && event.data?.killer && event.data?.weapon) {
      const weapon = event.data.weapon as string;
      const killerSteamID = event.data.killer.steamID;
      const isHeadshot = event.data.headshot === true || event.data.headshot === 'true';
      const damage = event.data.damage || 100; // Assumir 100 se não tiver
      
      if (!weaponStatsMap.has(weapon)) {
        weaponStatsMap.set(weapon, { kills: 0, headshots: 0, damage: 0 });
      }
      const stats = weaponStatsMap.get(weapon)!;
      stats.kills++;
      if (isHeadshot) stats.headshots++;
      stats.damage += damage;
      
      if (!playerWeaponStatsMap.has(killerSteamID)) {
        playerWeaponStatsMap.set(killerSteamID, new Map());
      }
      const playerWeapons = playerWeaponStatsMap.get(killerSteamID)!;
      if (!playerWeapons.has(weapon)) {
        playerWeapons.set(weapon, { kills: 0, headshots: 0, damage: 0 });
      }
      const playerWeaponStats = playerWeapons.get(weapon)!;
      playerWeaponStats.kills++;
      if (isHeadshot) playerWeaponStats.headshots++;
      playerWeaponStats.damage += damage;
    }
  });
  
  const globalWeaponStats: WeaponStats[] = Array.from(weaponStatsMap.entries()).map(([weapon, stats]) => ({
    weapon,
    kills: stats.kills,
    headshots: stats.headshots,
    damage: stats.damage,
  }));
  
  // 5. KILL TIMINGS: Tempo médio até primeira kill do round
  const playerFirstKillTimes: Map<number, number[]> = new Map();
  
  killsByRound.forEach((kills, round) => {
    const roundStartTime = officialEvents.find(e => e.type === 'round_start' && e.round === round)?.time || 0;
    
    kills.forEach(kill => {
      const timeDiff = kill.time - roundStartTime;
      if (!playerFirstKillTimes.has(kill.killerSteamID)) {
        playerFirstKillTimes.set(kill.killerSteamID, []);
      }
      playerFirstKillTimes.get(kill.killerSteamID)!.push(timeDiff);
    });
  });
  
  // 6. ROUND PERFORMANCES: Performance por round
  const roundPerformances: RoundPerformance[] = [];
  const playerRoundStats = new Map<number, Array<{ round: number; kills: number; deaths: number; assists: number; wonRound: boolean }>>();
  
  killsByRound.forEach((kills, round) => {
    const roundEndEvent = officialEvents.find(e => e.type === 'round_end' && e.round === round);
    const roundWinner = roundEndEvent?.data?.winner || 'CT';
    
    const roundKills = new Map<number, number>();
    const roundDeaths = new Map<number, number>();
    const roundAssists = new Map<number, number>();
    
    kills.forEach(kill => {
      roundKills.set(kill.killerSteamID, (roundKills.get(kill.killerSteamID) || 0) + 1);
      roundDeaths.set(kill.victimSteamID, (roundDeaths.get(kill.victimSteamID) || 0) + 1);
      
      // Assists (simplificado - procurar por eventos de assist próximos)
      // TODO: Melhorar detecção de assists
    });
    
    players.forEach(player => {
      const kills = roundKills.get(player.steamID) || 0;
      const deaths = roundDeaths.get(player.steamID) || 0;
      const assists = roundAssists.get(player.steamID) || 0;
      const playerTeam = player.team;
      const wonRound = roundWinner === playerTeam;
      
      const performance: RoundPerformance = {
        round,
        playerSteamID: player.steamID,
        kills,
        deaths,
        assists,
        wonRound,
      };
      
      roundPerformances.push(performance);
      
      if (!playerRoundStats.has(player.steamID)) {
        playerRoundStats.set(player.steamID, []);
      }
      playerRoundStats.get(player.steamID)!.push(performance);
    });
  });
  
  // 7. CRITICAL ERRORS, HIGHLIGHTS, TEAMPLAY, PLAYER ROLES, AI SUGGESTIONS
  // (Implementação simplificada - pode ser expandida)
  const criticalErrors: CriticalError[] = [];
  const highlights: Highlight[] = [];
  
  // Highlights: Multi-kills e clutches
  killsByRound.forEach((kills, round) => {
    const playerKillCount = new Map<number, number>();
    kills.forEach(kill => {
      playerKillCount.set(kill.killerSteamID, (playerKillCount.get(kill.killerSteamID) || 0) + 1);
    });
    
    playerKillCount.forEach((killCount, playerSteamID) => {
      const playerName = playersBySteamID.get(playerSteamID)?.name || 'Unknown';
      if (killCount >= 5) {
        highlights.push({
          round,
          player: playerName,
          playerSteamID,
          type: 'ace',
          description: `${playerName} fez ACE (5 kills) no round ${round}`,
        });
      } else if (killCount === 4) {
        highlights.push({
          round,
          player: playerName,
          playerSteamID,
          type: '4k',
          description: `${playerName} fez 4K no round ${round}`,
        });
      } else if (killCount === 3) {
        highlights.push({
          round,
          player: playerName,
          playerSteamID,
          type: '3k',
          description: `${playerName} fez 3K no round ${round}`,
        });
      }
    });
    
    // Clutch highlights
    const roundClutches = clutchSituations.filter(c => c.round === round && c.won);
    roundClutches.forEach(clutch => {
      highlights.push({
        round,
        player: clutch.playerName,
        playerSteamID: clutch.playerSteamID,
        type: `clutch_${clutch.situation}` as any,
        description: `${clutch.playerName} ganhou ${clutch.situation} no round ${round}`,
      });
    });
  });
  
  // Teamplay: Assists e trades dados/recebidos
  const teamPlay: TeamPlay[] = players.map(player => {
    const assistsGiven = playerAssistsMap.get(player.steamID) || 0;
    const tradesGiven = playerSuccessfulTradesMap.get(player.steamID) || 0;
    const tradesReceived = tradeKills.filter(t => t.tradedBySteamID === player.steamID).length;
    
    // TODO: Calcular mostAssistedPlayer e mostTradedBy
    return {
      playerSteamID: player.steamID,
      assistsGiven,
      tradesGiven,
      tradesReceived,
    };
  });
  
  // Player Roles: Classificação simplificada baseada em estatísticas
  const playerRoles: PlayerRole[] = players.map(player => {
    const entryFrags = playerEntryFragsMap.get(player.steamID) || 0;
    const assists = playerAssistsMap.get(player.steamID) || 0;
    const tradesGiven = playerSuccessfulTradesMap.get(player.steamID) || 0;
    const clutches = playerClutchMap.get(player.steamID)?.length || 0;
    
    // Scores simplificados para cada role
    const entryScore = entryFrags * 10;
    const supportScore = assists * 5 + tradesGiven * 3;
    const lurkerScore = clutches * 5;
    const awperScore = 0; // TODO: Detectar uso de AWP
    const riflerScore = (playerKillsMap.get(player.steamID) || 0) * 2;
    const anchorScore = 0; // TODO: Detectar posições de anchor
    const iglScore = 0; // TODO: Detectar IGL baseado em comandos
    
    const roles = {
      entry: entryScore,
      support: supportScore,
      lurker: lurkerScore,
      awper: awperScore,
      rifler: riflerScore,
      anchor: anchorScore,
      igl: iglScore,
    };
    
    const primaryRole = Object.entries(roles).reduce((max, [role, score]) => 
      score > max[1] ? [role, score] : max, ['rifler', 0]
    )[0];
    
    return {
      playerSteamID: player.steamID,
      primaryRole: primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1),
      roles,
    };
  });
  
  // ==================== FIM DAS ESTATÍSTICAS AVANÇADAS ====================

  players.forEach(p => {
    // Usar kills, deaths e assists recalculados de TODOS os rounds oficiais
    const kills = playerKillsMap.get(p.steamID) || 0;
    const deaths = playerDeathsMap.get(p.steamID) || 0; // Recontar de TODOS os rounds oficiais
    const assists = playerAssistsMap.get(p.steamID) || 0; // Recontar de TODOS os rounds oficiais
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
    
    // Estatísticas avançadas
    const successfulTrades = playerSuccessfulTradesMap.get(p.steamID) || 0;
    const failedTrades = playerFailedTradesMap.get(p.steamID) || 0;
    const tradeKillsForPlayer = playerTradeKillsMap.get(p.steamID) || [];
    const entryFragsCount = playerEntryFragsMap.get(p.steamID) || 0;
    const entryFragWins = playerEntryFragWinsMap.get(p.steamID) || 0;
    const entryFragLosses = playerEntryFragLossesMap.get(p.steamID) || 0;
    const clutches = playerClutchMap.get(p.steamID) || [];
    const clutch1v1Wins = clutches.filter(c => c.situation === '1v1' && c.won).length;
    const clutch1v1Losses = clutches.filter(c => c.situation === '1v1' && !c.won).length;
    const clutch1v2Wins = clutches.filter(c => c.situation === '1v2' && c.won).length;
    const clutch1v2Losses = clutches.filter(c => c.situation === '1v2' && !c.won).length;
    const clutch1v3Wins = clutches.filter(c => c.situation === '1v3' && c.won).length;
    const clutch1v3Losses = clutches.filter(c => c.situation === '1v3' && !c.won).length;
    const clutch1v4Wins = clutches.filter(c => c.situation === '1v4' && c.won).length;
    const clutch1v4Losses = clutches.filter(c => c.situation === '1v4' && !c.won).length;
    const clutch1v5Wins = clutches.filter(c => c.situation === '1v5' && c.won).length;
    const clutch1v5Losses = clutches.filter(c => c.situation === '1v5' && !c.won).length;
    const clutch1v1Winrate = (clutch1v1Wins + clutch1v1Losses) > 0 ? (clutch1v1Wins / (clutch1v1Wins + clutch1v1Losses)) * 100 : 0;
    const clutch1v2Rate = (clutch1v2Wins + clutch1v2Losses) > 0 ? (clutch1v2Wins / (clutch1v2Wins + clutch1v2Losses)) * 100 : 0;
    const clutch1v3Rate = (clutch1v3Wins + clutch1v3Losses) > 0 ? (clutch1v3Wins / (clutch1v3Wins + clutch1v3Losses)) * 100 : 0;
    
    // Kill Timings
    const firstKillTimes = playerFirstKillTimes.get(p.steamID) || [];
    const firstKillTiming = firstKillTimes.length > 0 
      ? firstKillTimes.reduce((sum, t) => sum + t, 0) / firstKillTimes.length 
      : undefined;
    
    // Round Performance
    const playerRounds = playerRoundStats.get(p.steamID) || [];
    const wins = playerRounds.filter(r => r.wonRound);
    const losses = playerRounds.filter(r => !r.wonRound);
    const avgKillsWin = wins.length > 0 ? wins.reduce((sum, r) => sum + r.kills, 0) / wins.length : undefined;
    const avgKillsLoss = losses.length > 0 ? losses.reduce((sum, r) => sum + r.kills, 0) / losses.length : undefined;
    const consistencyScore = playerRounds.length > 0 
      ? Math.min(100, Math.max(0, (wins.length / playerRounds.length) * 100 + (avgKillsWin || 0) * 10 - (avgKillsLoss || 0) * 5))
      : undefined;
    
    // Weapon Stats
    const weaponStats = playerWeaponStatsMap.get(p.steamID);
    const weaponStatsArray: WeaponStats[] = weaponStats 
      ? Array.from(weaponStats.entries()).map(([weapon, stats]) => ({
          weapon,
          kills: stats.kills,
          headshots: stats.headshots,
          damage: stats.damage,
        }))
      : [];
    
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
        // Estatísticas avançadas
        successfulTrades,
        failedTrades,
        tradeKills: tradeKillsForPlayer,
        entryFrags: entryFragsCount,
        entryFragWins,
        entryFragLosses,
        clutch1v1Wins,
        clutch1v1Losses,
        clutch1v2Wins,
        clutch1v2Losses,
        clutch1v3Wins,
        clutch1v3Losses,
        clutch1v4Wins,
        clutch1v4Losses,
        clutch1v5Wins,
        clutch1v5Losses,
        clutch1v1Winrate,
        clutch1v2Rate,
        clutch1v3Rate,
        firstKillTiming,
        consistencyScore,
        avgKillsWin,
        avgKillsLoss,
        weaponStats: weaponStatsArray.length > 0 ? weaponStatsArray : undefined,
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
        // Estatísticas avançadas
        successfulTrades,
        failedTrades,
        tradeKills: tradeKillsForPlayer,
        entryFrags: entryFragsCount,
        entryFragWins,
        entryFragLosses,
        clutch1v1Wins,
        clutch1v1Losses,
        clutch1v2Wins,
        clutch1v2Losses,
        clutch1v3Wins,
        clutch1v3Losses,
        clutch1v4Wins,
        clutch1v4Losses,
        clutch1v5Wins,
        clutch1v5Losses,
        clutch1v1Winrate,
        clutch1v2Rate,
        clutch1v3Rate,
        firstKillTiming,
        consistencyScore,
        avgKillsWin,
        avgKillsLoss,
        weaponStats: weaponStatsArray.length > 0 ? weaponStatsArray : undefined,
      });
    }
  });

  const allPlayerStats = Array.from(playerStatsMap.values());

  // AI Suggestions: Gerar sugestões básicas (após allPlayerStats estar disponível)
  const aiSuggestions: string[] = [];
  const avgKDRatio = allPlayerStats.length > 0 
    ? allPlayerStats.reduce((sum, p) => sum + (p.kdRatio || 0), 0) / allPlayerStats.length 
    : 0;
  if (avgKDRatio < 1) {
    aiSuggestions.push('Time precisa melhorar a precisão e posicionamento. Foque em crossfires e trades.');
  }
  const avgTrades = players.length > 0 
    ? Array.from(playerSuccessfulTradesMap.values()).reduce((sum, t) => sum + t, 0) / players.length 
    : 0;
  if (avgTrades < 2) {
    aiSuggestions.push('Trades estão baixas. Melhore o timing de apoio aos aliados após mortes.');
  }
  const totalEntryFrags = Array.from(playerEntryFragsMap.values()).reduce((sum, e) => sum + e, 0);
  if (totalEntryFrags < officialRounds.size * 0.3) {
    aiSuggestions.push('First kills estão baixas. Considere estratégias mais agressivas de entrada.');
  }

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

  // Análise por zonas do mapa (usando kills de TODOS os rounds oficiais)
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

  // Calcular kills totais de TODOS os rounds oficiais
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

  // Gerar rounds detalhados (todos os rounds oficiais)
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
  // GC: round 5 vira round 1, round 6 vira round 2, etc.
  // MM: já começa em 1, então offset é 0
  const roundOffset = isGC ? firstOfficialRound - 1 : 0;
  
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

  // Radar moments removidos - replay de demo foi desabilitado

  // Processar heatmap de kills e deaths
  const killHeatmapMap = new Map<string, { x: number; y: number; z: number; count: number }>();
  const deathHeatmapMap = new Map<string, { x: number; y: number; z: number; count: number }>();

  // Processar eventos de kill para criar heatmap
  last20Events.forEach(event => {
    if (event.type === 'kill' && event.data) {
      const killerPos = event.data.killer?.position;
      const victimPos = event.data.victim?.position;

      // Heatmap de kills (verde)
      if (killerPos && killerPos.x !== undefined && killerPos.y !== undefined) {
        // Agrupar por coordenadas aproximadas (precisão de 50 unidades)
        const keyX = Math.round(killerPos.x / 50) * 50;
        const keyY = Math.round(killerPos.y / 50) * 50;
        const keyZ = Math.round((killerPos.z || 0) / 50) * 50;
        const key = `${keyX},${keyY},${keyZ}`;

        const existing = killHeatmapMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          killHeatmapMap.set(key, { x: keyX, y: keyY, z: keyZ, count: 1 });
        }
      }

      // Heatmap de deaths (vermelho)
      if (victimPos && victimPos.x !== undefined && victimPos.y !== undefined) {
        // Agrupar por coordenadas aproximadas (precisão de 50 unidades)
        const keyX = Math.round(victimPos.x / 50) * 50;
        const keyY = Math.round(victimPos.y / 50) * 50;
        const keyZ = Math.round((victimPos.z || 0) / 50) * 50;
        const key = `${keyX},${keyY},${keyZ}`;

        const existing = deathHeatmapMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          deathHeatmapMap.set(key, { x: keyX, y: keyY, z: keyZ, count: 1 });
        }
      }
    }
  });

  const killHeatmap = Array.from(killHeatmapMap.values());
  const deathHeatmap = Array.from(deathHeatmapMap.values());

  // Criar lista de eventos de kill com posições para filtro no frontend
  const killEventsWithPositions = last20Events
    .filter(e => e.type === 'kill' && e.data)
    .map(event => ({
      round: event.round,
      time: event.time,
      killerSteamID: event.data?.killer?.steamID || 0,
      killerName: event.data?.killer?.name || '',
      killerPosition: event.data?.killer?.position || null,
      victimSteamID: event.data?.victim?.steamID || 0,
      victimName: event.data?.victim?.name || '',
      victimPosition: event.data?.victim?.position || null,
    }));

  // Round highlights melhorados (todos os rounds oficiais)
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
    // Heatmap de kills e deaths
    killHeatmap,
    deathHeatmap,
    // Eventos de kill com posições para filtro
    killEventsWithPositions,
    // Estatísticas avançadas
    tradeKills,
    entryFrags,
    clutchSituations,
    weaponStats: globalWeaponStats,
    killTimings: Array.from(playerFirstKillTimes.entries()).map(([playerSteamID, times]) => {
      const player = playersBySteamID.get(playerSteamID);
      return {
        playerSteamID,
        playerName: player?.name || 'Unknown',
        averageTime: times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0,
      };
    }),
    roundPerformances,
    criticalErrors,
    highlights,
    teamPlay,
    playerRoles,
    aiSuggestions,
  };
};
