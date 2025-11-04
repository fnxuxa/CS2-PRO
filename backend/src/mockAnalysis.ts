import { AnalysisData, AnalysisType } from './types';

export const buildMockAnalysis = (type: AnalysisType): AnalysisData => {
  if (type === 'player') {
    return {
      type,
      map: 'de_ancient',
      duration: '47:23',
      rounds: 28,
      mvp: 'dev1ce',
      rating: 1.35,
      summary:
        'Desempenho excepcional com 28 kills, 68.5% HS rate e ADR de 87.3. Controle de spray preciso, timings agressivos em A Main e conversões críticas em retakes.',
      keyFindings: [
        'Dominou a região A Main em 78% dos rounds CT, garantindo vantagem numérica cedo.',
        'Converteu 4 de 5 situações de clutch em rounds decisivos, salvando economia dupla.',
        'Gerou 31 HP de dano utilitário por round — acima da média Pro League (+12).',
      ],
      heatmapUrl: 'https://i.imgur.com/3MoH8wl.png',
      heatmapSummary:
        'Concentração alta na transição A Main → A Site. Movimentação em “L” para contestar Default e apoiar retakes pelo CT Spawn.',
      heatmapHotspots: [
        { zone: 'A Main', pressure: 'Alta', note: '68% das eliminações iniciais vieram desta região.' },
        { zone: 'Canal B', pressure: 'Média', note: 'Utilizada apenas em rounds de rotação (14% do tempo).' },
        { zone: 'CT Spawn', pressure: 'Alta', note: 'Posicionamento seguro pós-plant com cobertura cruzada.' },
      ],
      playerMetrics: [
        { label: 'HS%', value: '68.5%', description: 'Top 5% ESL Pro League', trend: 'up' },
        { label: 'ADR', value: '87.3', description: '+12 vs média global', trend: 'up' },
        { label: 'Clutch', value: '80%', description: '4 clutches convertidos', trend: 'up' },
        { label: 'Utility', value: '17.8s', description: 'Tempo médio de cegueira gerada', trend: 'up' },
      ],
      roundHighlights: [
        { round: 8, result: 'Clutch 1v3', detail: 'Spray transfer em Stairs seguido de defuse com 1.4s restantes.' },
        { round: 14, result: 'Triple kill de MP9', detail: 'Domínio A Main eco forçado garante reset econômico.' },
        { round: 22, result: 'Assistência decisiva', detail: 'Flash pop em B garante entry dupla para fechar mapa.' },
      ],
      recommendations: [
        'Trabalhar pré-aim nos retakes B: 5 mortes seguidas entrando pelo CT Spawn contra lurkers.',
        'Ajustar cadência de granadas defensivas: média de 28s — antecipar quando os T jogam default lento.',
        'Rever posicionamentos pós-plant no bomb A: 3 rounds perdidos com vantagem numérica.',
      ],
      economy: {
        averageSpend: 4275,
        economyStrength: 'Alto controle econômico, sem resets duplos durante o lado CT.',
        swings: [
          'Round 10: eco forçada convertida graças ao clutch 1v2.',
          'Round 21: clutch 1v3 salvou arma e evitou reset total.',
        ],
      },
    };
  }

  return {
    type,
    map: 'de_ancient',
    duration: '47:23',
    rounds: 28,
    mvp: 'Team Liquid',
    score: '16-12',
    summary:
      'Time demonstrou coordenação econômica eficiente, controle dominante de espaços e mid-round calls sólidos para virar o placar de 6-9 para 16-12.',
    keyFindings: [
      'Controle de meio garantido em 71% dos rounds Terrorista com execução smoke wall consistente.',
      'Tempo médio de trade-kill em 2.7s — acima do benchmark tier-1 (3.5s).',
      'Retakes B venceram 60% das tentativas graças a utility coordenada.',
    ],
    heatmapUrl: 'https://i.imgur.com/o7kVv7Z.png',
    heatmapSummary:
      'Pressão constante na região de Meio para dividir atenção CT e isolar duelos em A. Defesa forte no retake B com crossfires complexos.',
    heatmapHotspots: [
      { zone: 'Meio Superior', pressure: 'Alta', note: 'Executado em 18 de 28 rounds.' },
      { zone: 'Bomb B', pressure: 'Alta', note: 'Pós-plant com 3 camadas de cobertura.' },
      { zone: 'A Main', pressure: 'Média', note: 'Usado como lurk atrasado por YEKINDAR.' },
    ],
    teamMetrics: [
      { label: 'Trade Kill', value: '2.7s', description: 'Tempo médio de resposta', trend: 'up' },
      { label: 'Execuções', value: '78%', description: 'Sucesso em executes preparados', trend: 'up' },
      { label: 'Retakes', value: '60%', description: 'Vitórias em situações desfavoráveis', trend: 'up' },
      { label: 'First Kill', value: '+6', description: 'Saldo de entry frags no mapa', trend: 'up' },
    ],
    roundHighlights: [
      { round: 5, result: 'Força CT vence', detail: 'Stack em B com crossfire perfeito neutraliza execução rápida.' },
      { round: 13, result: 'Execução A sem perdas', detail: 'Utilidade sincronizada remove ângulos CT em 9 segundos.' },
      { round: 24, result: 'Retake 3x5 convertido', detail: 'Uso duplo de HE em default garante defuse com 1.9s.' },
    ],
    recommendations: [
      'Refinar resposta a execuções rápidas no bomb B — 4 derrotas consecutivas sem contestação inicial.',
      'Melhorar coordenação de utility no pós-plant: flashes atrasadas custaram 2 rounds apertados.',
      'Desenhar mid-round calls alternativas quando perder controle de meio para evitar previsibilidade.',
    ],
    economy: {
      averageSpend: 3950,
      economyStrength: 'Gestão sólida — apenas um reset econômico profundo em 28 rounds.',
      swings: [
        'Round 7: força T conectada com SG, garantindo vantagem econômica até o fim do half.',
        'Round 20: call de full save permitiu dupla AWP nos rounds finais.',
      ],
    },
  };
};
