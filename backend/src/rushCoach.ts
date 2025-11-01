import { AnalysisJob, UploadInfo } from './types';

const stageMessages = [
  'fazendo parsing inicial',
  'extraindo eventos-chave',
  'calculando estatísticas avançadas',
  'gerando relatório final com IA',
];

const getStageByProgress = (progress: number) => {
  if (progress < 25) return stageMessages[0];
  if (progress < 50) return stageMessages[1];
  if (progress < 85) return stageMessages[2];
  return stageMessages[3];
};

interface RushContext {
  message: string;
  upload?: UploadInfo;
  job?: AnalysisJob;
}

export const generateRushResponse = ({ message, upload, job }: RushContext): string => {
  const lower = message.toLowerCase();

  if (!upload) {
    return '❌ Nenhuma demo carregada ainda. Clique em **UPLOAD** e selecione um arquivo `.dem` para começar.';
  }

  if (lower.includes('status')) {
    if (!job) {
      return '📥 Demo recebida! Agora escolha **"player"** ou **"team"** para iniciar a análise.';
    }

    if (job.status === 'processing') {
      const stage = getStageByProgress(job.progress);
      return `⏱️ Processando **${upload.originalName}** • ${job.progress}% completo.

Etapa atual: ${stage}.`;
    }

    if (job.status === 'failed') {
      return `⚠️ A análise falhou: ${job.error ?? 'motivo desconhecido.'} Tente reenviar a demo ou contate o suporte.`;
    }

    if (job.status === 'completed' && job.analysis) {
      return '✅ Análise pronta! Abra o painel de resultados para revisar heatmap, radar 2D e plano de ação.';
    }

    return '🚦 A análise ainda não foi iniciada. Clique em **Análise Individual** ou **Análise de Time** para começar.';
  }

  if (lower.includes('ajuda') || lower.includes('help')) {
    return `💬 **RUSH - coach IA**

Use um dos comandos:
• "player" → iniciar análise individual
• "team" → iniciar análise de time
• "status" → ver progresso
• "heatmap", "radar", "economia", "recomendações" → detalhes após finalizar
• "como funciona" → entender o fluxo completo`;
  }

  if (!job) {
    if (lower.includes('como funciona') || lower.includes('funciona')) {
      return '📌 Fluxo: 1) Faça upload da demo. 2) Escolha **player** ou **team**. 3) Deixe a IA processar eventos, gerar heatmap e radar. 4) Converse comigo para virar os insights em treino.';
    }

    if (lower.includes('player') || lower.includes('jogador')) {
      return '⚡ Bastam alguns cliques! Selecione o cartão de **Análise Individual** para processar o jogador principal.';
    }

    if (lower.includes('team') || lower.includes('time')) {
      return '🏆 Vamos nessa! Clique em **Análise de Time** para avaliar coordenação, economia e execuções.';
    }

    if (lower.includes('heatmap') || lower.includes('radar')) {
      return '🔥 Assim que a análise terminar, libero heatmap detalhado e radar 2D com os momentos chave.';
    }

    return `🤖 RUSH aqui! Demo carregada: **${upload.originalName}** (${upload.sizeMB}MB).
Escolha **"player"** ou **"team"** quando quiser iniciar o processamento.`;
  }

  if (job.status === 'processing') {
    return `🚀 Ainda processando **${upload.originalName}**. Progresso atual: ${job.progress}%.`;
  }

  if (job.status === 'failed') {
    return `⚠️ Tivemos um problema com essa análise: ${job.error ?? 'motivo desconhecido.'}.
Envie novamente ou use outra demo.`;
  }

  const analysis = job.analysis;

  if (!analysis) {
    return '⚠️ A análise final ainda não está disponível. Atualize a página ou tente novamente em alguns segundos.';
  }

  if (lower.includes('heatmap')) {
    const hotspots = analysis.heatmapHotspots
      .map(zone => `• ${zone.zone}: ${zone.note}`)
      .join('\n');
    return `🔥 Heatmap pronto!

${analysis.heatmapSummary}

Hotspots relevantes:
${hotspots}`;
  }

  if (lower.includes('radar') || lower.includes('rotac') || lower.includes('replay')) {
    const moment = analysis.radarMoments[0];
    if (moment) {
      const players = moment.players
        .map(player => `• ${player.name} (${player.role.toUpperCase()}): ${player.action}`)
        .join('\n');
      return `🗺️ Radar 2D destaca: ${moment.highlight}

Callout: ${moment.callout} • Tempo: ${moment.clock}
${players}`;
    }
    return '🗺️ Radar 2D pronto! Explore os momentos chave na aba correspondente.';
  }

  if (lower.includes('econom')) {
    const swings = analysis.economy.swings.map(item => `• ${item}`).join('\n');
    return `💰 Economia sob controle: gasto médio **$${analysis.economy.averageSpend.toLocaleString('pt-BR')}**. ${analysis.economy.economyStrength}

Pontos-chave:
${swings}`;
  }

  if (lower.includes('recom') || lower.includes('melhor') || lower.includes('improve')) {
    const recs = analysis.recommendations.map(item => `• ${item}`).join('\n');
    return `🎯 Prioridades de treino:
${recs}`;
  }

  if (lower.includes('round')) {
    const highlight = analysis.roundHighlights[0];
    if (highlight) {
      return `📆 Round ${highlight.round}: ${highlight.result}
${highlight.detail}`;
    }
  }

  const findings = analysis.keyFindings.map(item => `• ${item}`).join('\n');
  return `📊 Resumo rápido:
${analysis.summary}

Principais achados:
${findings}`;
};
