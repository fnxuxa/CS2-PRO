import { AnalysisData } from './types';

// Interface para dados brutos do Go
interface GoAnalysis {
  metadata: any;
  events: any[];
  players: any[];
  summary: any;
  heatmap: any;
  radarReplay?: any[];
  targetPlayer?: any;
}

/**
 * Gera insights inteligentes baseados nos dados reais do Go processor
 */
export const generateAIInsights = (
  userMessage: string,
  goData: GoAnalysis,
  analysisData: AnalysisData
): string | null => {
  const lower = userMessage.toLowerCase();

  // Análise de performance individual
  if (lower.includes('performance') || lower.includes('desempenho') || lower.includes('como foi')) {
    if (goData.targetPlayer) {
      const tp = goData.targetPlayer;
      const adr = tp.adr?.toFixed(1) || 'N/A';
      const hsRate = tp.hsRate?.toFixed(1) || '0';
      const kd = tp.kdRatio?.toFixed(2) || '0';
      
      return `🎯 **Análise da sua performance:**

📊 Estatísticas:
• K/D Ratio: ${kd}
• ADR: ${adr}
• Headshot Rate: ${hsRate}%
• Kills: ${tp.kills} | Deaths: ${tp.deaths} | Assists: ${tp.assists}

${tp.recommendations && tp.recommendations.length > 0 
  ? `\n💡 Recomendações:\n${tp.recommendations.map((r: string) => `• ${r}`).join('\n')}`
  : '\n💡 Continue focado em melhorar posicionamento e comunicação com o time!'}`;
    }

    // Análise geral do time
    const topPlayer = goData.players.sort((a, b) => {
      const aKD = a.deaths > 0 ? a.kills / a.deaths : a.kills;
      const bKD = b.deaths > 0 ? b.kills / b.deaths : b.kills;
      return bKD - aKD;
    })[0];

    if (topPlayer) {
      return `🏆 **Performance da Partida:**

MVP: ${goData.summary.mvp} (Rating: ${goData.summary.rating.toFixed(2)})

Top Player: ${topPlayer.name}
• ${topPlayer.kills}K / ${topPlayer.deaths}D / ${topPlayer.assists}A
• Time: ${topPlayer.team}`;
    }
  }

  // Análise de eventos importantes
  if (lower.includes('evento') || lower.includes('momento') || lower.includes('round') && lower.includes('importante')) {
    const kills = goData.events.filter((e: any) => e.type === 'kill').length;
    const bombPlanted = goData.events.filter((e: any) => e.type === 'bomb_planted').length;
    const bombDefused = goData.events.filter((e: any) => e.type === 'bomb_defused').length;
    const bombExploded = goData.events.filter((e: any) => e.type === 'bomb_exploded').length;

    return `⚔️ **Eventos Importantes:**

• ${kills} eliminações no total
• ${bombPlanted} bomba(s) plantada(s)
• ${bombDefused} bomba(s) desarmada(s)
• ${bombExploded} bomba(s) explodida(s)

Use "radar" para ver momentos específicos ou "heatmap" para zonas de atividade.`;
  }

  // Análise de mapas e estratégia
  if (lower.includes('mapa') || lower.includes('estrategia') || lower.includes('tatic')) {
    const map = goData.metadata.map || 'desconhecido';
    const score = `${goData.metadata.scoreCT}-${goData.metadata.scoreT}`;
    
    return `🗺️ **Análise do Mapa: ${map.toUpperCase()}**

Resultado: ${score}
Duração: ${goData.metadata.duration}
Rounds: ${goData.metadata.rounds}

${goData.heatmap?.points?.length > 0 
  ? `\n🔥 ${goData.heatmap.points.length} pontos de atividade registrados no heatmap.\nVeja zonas de risco e combate com "heatmap".`
  : '\nUse "heatmap" para ver zonas de maior atividade.'}`;
  }

  // Análise de economia
  if (lower.includes('economia') || lower.includes('dinheiro') || lower.includes('economy')) {
    const rounds = goData.metadata.rounds;
    const bombPlanted = goData.events.filter((e: any) => e.type === 'bomb_planted').length;
    const winRate = goData.metadata.scoreCT + goData.metadata.scoreT > 0 
      ? ((goData.metadata.scoreCT / rounds) * 100).toFixed(1)
      : '50';

    return `💰 **Análise Econômica:**

Partida de ${rounds} rounds com ${bombPlanted} plantio(s) de bomba.

Dica: Revise os rounds onde a bomba foi plantada mas não convertida - oportunidades perdidas de economia.`;
  }

  // Perguntas gerais - usar dados do Go
  if (lower.includes('resumo') || lower.includes('geral') || lower.includes('visao geral')) {
    const totalEvents = goData.events.length;
    const kills = goData.events.filter((e: any) => e.type === 'kill').length;
    const players = goData.players.length;

    return `📊 **Visão Geral da Partida:**

• ${totalEvents} eventos processados
• ${kills} eliminações
• ${players} jogadores
• ${goData.metadata.rounds} rounds
• Resultado: ${goData.metadata.scoreCT}-${goData.metadata.scoreT}

Para mais detalhes, pergunte sobre: "performance", "heatmap", "radar", "economia", ou "recomendações".`;
  }

  // Se não encontrou padrão específico, retornar null para usar resposta padrão
  return null;
};

