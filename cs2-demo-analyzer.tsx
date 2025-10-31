import React, { useState, useEffect, useMemo } from 'react';
import { Upload, User, Users, MessageSquare, Check, Loader2, TrendingUp, Target, Award, Zap, AlertCircle, ArrowRight, Star, Crown, Sparkles, Send, Flame, Compass, BarChart3, Crosshair } from 'lucide-react';

type View = 'landing' | 'upload-area' | 'select-analysis' | 'processing' | 'results';
type Trend = 'up' | 'down' | 'neutral';
type AnalysisType = 'player' | 'team' | null;

interface UploadedDemo {
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
  action: string;
}

interface RadarMoment {
  tick: number;
  clock: string;
  phase: 'início' | 'meio' | 'final';
  callout: string;
  highlight: string;
  players: RadarPlayer[];
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

const buildMockAnalysis = (type: 'player' | 'team'): AnalysisData => {
  if (type === 'player') {
    return {
      type,
      map: 'de_ancient',
      duration: '47:23',
      rounds: 28,
      mvp: 'dev1ce',
      rating: 1.35,
      summary: 'Desempenho excepcional com 28 kills, 68.5% HS rate e ADR de 87.3. Controle de spray preciso, timings agressivos em A Main e conversões críticas em retakes.',
      keyFindings: [
        'Dominou a região A Main em 78% dos rounds CT, garantindo vantagem numérica cedo.',
        'Converteu 4 de 5 situações de clutch em rounds decisivos, salvando economia dupla.',
        'Gerou 31 HP de dano utilitário por round — acima da média Pro League (+12).',
      ],
      heatmapUrl: 'https://i.imgur.com/3MoH8wl.png',
      heatmapSummary: 'Concentração alta na transição A Main → A Site. Movimentação em “L” para contestar Default e apoiar retakes pelo CT Spawn.',
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
      radarMoments: [
        {
          tick: 12450,
          clock: '1:17',
          phase: 'meio',
          callout: 'A Main',
          highlight: 'Avanço sincronizado gera double kill abrindo espaço para retake.',
          players: [
            { name: 'dev1ce', role: 'ct', x: 0.63, y: 0.41, action: 'peek dry' },
            { name: 'blameF', role: 'ct', x: 0.58, y: 0.39, action: 'trade instantâneo' },
            { name: 'cadiaN', role: 't', x: 0.66, y: 0.45, action: 'entry frag' },
            { name: 'jabbi', role: 't', x: 0.69, y: 0.46, action: 'flash suporte' },
          ],
        },
        {
          tick: 18740,
          clock: '0:28',
          phase: 'final',
          callout: 'Bomb A',
          highlight: 'Post-plant em triângulo impede defuse: crossfire perfeito com AWPer.',
          players: [
            { name: 'dev1ce', role: 't', x: 0.52, y: 0.33, action: 'cover default' },
            { name: 'device', role: 't', x: 0.49, y: 0.36, action: 'smoke line-up' },
            { name: 'k0nfig', role: 'ct', x: 0.54, y: 0.28, action: 'mola para defuse' },
            { name: 'stavn', role: 'ct', x: 0.57, y: 0.32, action: 'swing late' },
          ],
        },
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
    summary: 'Time demonstrou coordenação econômica eficiente, controle dominante de espaços e mid-round calls sólidos para virar o placar de 6-9 para 16-12.',
    keyFindings: [
      'Controle de meio garantido em 71% dos rounds Terrorista com execução smoke wall consistente.',
      'Tempo médio de trade-kill em 2.7s — acima do benchmark tier-1 (3.5s).',
      'Retakes B venceram 60% das tentativas graças a utility coordenada.',
    ],
    heatmapUrl: 'https://i.imgur.com/o7kVv7Z.png',
    heatmapSummary: 'Pressão constante na região de Meio para dividir atenção CT e isolar duelos em A. Defesa forte no retake B com crossfires complexos.',
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
    radarMoments: [
      {
        tick: 11320,
        clock: '1:24',
        phase: 'início',
        callout: 'Meio',
        highlight: 'Execução smoke wall abre caminho para controle de Conector em 7 segundos.',
        players: [
          { name: 'YEKINDAR', role: 't', x: 0.61, y: 0.46, action: 'entry dry' },
          { name: 'NAF', role: 't', x: 0.58, y: 0.49, action: 'mola deep' },
          { name: 'Rain', role: 'ct', x: 0.64, y: 0.38, action: 'fogo recuo' },
          { name: 'Broky', role: 'ct', x: 0.67, y: 0.35, action: 'AWP hold' },
        ],
      },
      {
        tick: 19840,
        clock: '0:21',
        phase: 'final',
        callout: 'Bomb B',
        highlight: 'Retake CT com dupla flash e molotov forcejando os T para o aberto.',
        players: [
          { name: 'oSee', role: 'ct', x: 0.47, y: 0.27, action: 'flash retake' },
          { name: 'EliGE', role: 'ct', x: 0.51, y: 0.29, action: 'spray control' },
          { name: 'Twistzz', role: 't', x: 0.45, y: 0.32, action: 'cover default' },
          { name: 'Ropz', role: 't', x: 0.42, y: 0.34, action: 'lurk stairs' },
        ],
      },
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

const simulateAnalysis = (type: 'player' | 'team'): Promise<AnalysisData> =>
  new Promise((resolve) => {
    const duration = 3600 + Math.random() * 1500;
    setTimeout(() => resolve(buildMockAnalysis(type)), duration);
  });

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

const CS2ProAnalyzerApp = () => {
  const [currentPage, setCurrentPage] = useState<View>('landing');
  const [uploadedDemo, setUploadedDemo] = useState<UploadedDemo | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [particles, setParticles] = useState<Particle[]>(createParticles);
  const [progress, setProgress] = useState(0);

  const metrics = useMemo<MetricCard[]>(() => {
    if (!analysis) return [];
    return analysis.playerMetrics ?? analysis.teamMetrics ?? [];
  }, [analysis]);

  useEffect(() => {
    setParticles(createParticles());
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
    }
  }, [uploadedDemo]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = parseFloat((file.size / 1024 / 1024).toFixed(2));
    setUploadedDemo({ name: file.name, sizeMB });
    setAnalysis(null);
    setAnalysisType(null);
    setChatMessages([]);
    setCurrentPage('upload-area');
  };

  const generateRushResponse = (message: string): string => {
    const lower = message.toLowerCase();

    if (!uploadedDemo) {
      return '❌ Nenhuma demo carregada. Clique em **UPLOAD** para enviar um arquivo .dem e destravar a análise.';
    }

    if (lower.includes('status')) {
      if (isProcessing) {
        const stage = progress < 30
          ? 'fazendo parsing inicial'
          : progress < 60
            ? 'extraindo eventos-chave'
            : progress < 90
              ? 'calculando estatísticas avançadas'
              : 'gerando relatório final com IA';
        return `⏱️ Processando **${uploadedDemo.name}** • ${progress}% completo.\n\nEtapa atual: ${stage}.`;
      }

      if (analysis) {
        const mode = analysis.type === 'player' ? 'Análise individual pronta! ✅' : 'Análise de time pronta! ✅';
        return `${mode}\nAbra a seção de resultados para revisar heatmap, radar e recomendações personalizadas.`;
      }

      if (!analysisType) {
        return '📥 Demo carregada, aguardando você escolher o foco: digite **"player"** ou **"team"** para começar a processar.';
      }

      return '🚦 Análise ainda não iniciada. Clique no cartão correspondente ou peça "start" para começar o processamento.';
    }

    if (lower.includes('ajuda') || lower.includes('help')) {
      return '💬 **RUSH - coach IA**\n\nComandos úteis:\n• "player" ou "team" → escolher foco da análise\n• "status" → verificar progresso\n• "heatmap", "radar", "economia", "recomendações" → detalhes após a análise\n• "como funciona" → ver o fluxo completo';
    }

    if (!analysis && !isProcessing) {
      if (lower.includes('como funciona') || lower.includes('funciona')) {
        return '📌 Fluxo: 1) Faça upload da demo. 2) Escolha análise **player** ou **team**. 3) IA processa eventos, gera heatmap e radar 2D. 4) RUSH responde com insights, gráficos e plano de treino.';
      }

      if (lower.includes('player') || lower.includes('jogador')) {
        return '⚡ Perfeito! Preparei o modo **Análise Individual**. Clique no cartão correspondente para iniciar quando quiser.';
      }

      if (lower.includes('team') || lower.includes('time')) {
        return '🏆 Vamos analisar a equipe inteira. Clique no cartão **Análise de Time** para começar o processamento.';
      }
    }

    if (analysis) {
      if (lower.includes('heatmap')) {
        const hotspots = analysis.heatmapHotspots
          .map(zone => `• ${zone.zone}: ${zone.note}`)
          .join('\n');
        return `🔥 Heatmap pronto!\n\n${analysis.heatmapSummary}\n\nHotspots relevantes:\n${hotspots}`;
      }

      if (lower.includes('radar') || lower.includes('rotac') || lower.includes('replay')) {
        const moment = analysis.radarMoments[0];
        if (moment) {
          const players = moment.players
            .map(player => `• ${player.name} (${player.role.toUpperCase()}): ${player.action}`)
            .join('\n');
          return `🗺️ Radar 2D destaca: ${moment.highlight}\n\nCallout: ${moment.callout} • Tempo: ${moment.clock}\n${players}`;
        }
      }

      if (lower.includes('econom')) {
        const swings = analysis.economy.swings.map(item => `• ${item}`).join('\n');
        return `💰 Economia sob controle: gasto médio **$${analysis.economy.averageSpend.toLocaleString('pt-BR')}**. ${analysis.economy.economyStrength}\n\nPontos-chave:\n${swings}`;
      }

      if (lower.includes('recom') || lower.includes('melhor') || lower.includes('improve')) {
        const recs = analysis.recommendations.map(item => `• ${item}`).join('\n');
        return `🎯 Prioridades de treino:\n${recs}`;
      }

      if (lower.includes('round')) {
        const highlight = analysis.roundHighlights[0];
        if (highlight) {
          return `📆 Round ${highlight.round}: ${highlight.result}\n${highlight.detail}`;
        }
      }

      const findings = analysis.keyFindings.map(item => `• ${item}`).join('\n');
      return `📊 Resumo rápido:\n${analysis.summary}\n\nPrincipais achados:\n${findings}`;
    }

    if (isProcessing) {
      return `🚀 Ainda processando **${uploadedDemo.name}**. Progresso atual: ${progress}%. Vou avisar quando terminar!`;
    }

    if (lower.includes('player') || lower.includes('jogador')) {
      return '⚡ Modo jogador selecionado. Vá para a próxima tela e inicie a análise quando estiver pronto.';
    }

    if (lower.includes('team') || lower.includes('time')) {
      return '🏆 Modo time configurado. É só iniciar a análise para ver coordenação, economia e execuções.';
    }

    if (lower.includes('demo') || lower.includes('arquivo')) {
      return `📁 Upload detectado:\n✅ Arquivo: ${uploadedDemo.name}\n✅ Tamanho: ${uploadedDemo.sizeMB}MB\n\nAgora escolha **"player"** ou **"team"**.`;
    }

    return `🤖 RUSH aqui! Demo carregada: **${uploadedDemo.name}** (${uploadedDemo.sizeMB}MB).\nDigite **"player"** ou **"team"** para começarmos, ou pergunte "como funciona" para saber mais.`;
  };

  const handleChatSubmit = (
    event?:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    event?.preventDefault();
    if (!chatInput.trim()) return;

    const message = chatInput.trim();
    const lower = message.toLowerCase();

    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatInput('');

    if ((lower.includes('player') || lower.includes('jogador')) && uploadedDemo) {
      setTimeout(() => {
        setAnalysisType('player');
        setCurrentPage('select-analysis');
      }, 400);
    }

    if ((lower.includes('team') || lower.includes('time')) && uploadedDemo) {
      setTimeout(() => {
        setAnalysisType('team');
        setCurrentPage('select-analysis');
      }, 400);
    }

    const response = generateRushResponse(message);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 500);
  };

  const startAnalysis = async (type: 'player' | 'team') => {
    setAnalysisType(type);
    setIsProcessing(true);
    setProgress(0);
    setAnalysis(null);
    setCurrentPage('processing');

    try {
      const result = await simulateAnalysis(type);
      setAnalysis(result);
      setProgress(100);
      setCurrentPage('results');
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: '⚠️ Ocorreu um erro ao processar a demo. Tente novamente em instantes.' }
      ]);
      setCurrentPage('upload-area');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==================== LANDING PAGE ====================
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Particles Background */}
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
          .glow-orange { animation: pulse-glow 2.5s ease-in-out infinite; }
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
            backgroundImage: 'url(https://i.imgur.com/Uwe1QQA.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
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
        {/* Particles */}
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
          .glow-orange { animation: pulse-glow 2.5s ease-in-out infinite; }
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
                  <div className="bg-black/50 border border-orange-500/30 rounded-xl p-6 mt-8 animate-scale-in">
                    <div className="flex items-center justify-center gap-3">
                      <Check className="w-6 h-6 text-green-400" />
                      <span className="text-white font-bold">{uploadedDemo.name}</span>
                      <span className="text-gray-400">({uploadedDemo.sizeMB}MB)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RUSH Chat - Fixed Bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-gray-900/95 to-transparent z-50">
            <div className="max-w-4xl mx-auto px-6 pb-6 pt-8">
              <div className="bg-gray-900 border-2 border-orange-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/20">
                
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-b border-orange-500/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/50 animate-pulse">
                      <Zap className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">RUSH</h3>
                      <p className="text-xs text-orange-400 font-semibold">Assistente IA • Online</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="h-64 overflow-y-auto p-4 bg-black/50">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-orange-500/50 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-400 mb-4">👋 Olá! Sou o <span className="text-orange-500 font-bold">RUSH</span>, seu assistente de análise.</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {['Como funciona?', 'Ajuda', 'Status'].map((q, i) => (
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
                <div className="p-4 border-t border-gray-800 bg-gray-900">
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
                      placeholder="Digite sua mensagem para RUSH..."
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SELECT ANALYSIS PAGE ====================
  if (currentPage === 'select-analysis') {
    return (
      <div className="min-h-screen bg-black py-12 px-6 flex items-center justify-center">
        <div className="max-w-5xl w-full">
          <h2 className="text-5xl font-black text-white text-center mb-4">
            Escolha o Tipo de <span className="text-orange-500">Análise</span>
          </h2>
          <p className="text-center text-gray-400 mb-12 text-xl">
            Demo: <span className="text-white font-semibold">{uploadedDemo?.name}</span>
          </p>
          
          <div className="grid md:grid-cols-2 gap-10">
            <button
              onClick={() => startAnalysis('player')}
              className="group bg-gray-900 hover:bg-gradient-to-br hover:from-orange-500/20 hover:to-orange-600/20 border-2 border-gray-800 hover:border-orange-500 rounded-3xl p-12 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-orange-500/30"
            >
              <User className="w-28 h-28 text-orange-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-4xl font-black text-white mb-6">Análise Individual</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                K/D, HS%, ADR, Rating 2.0, posicionamento, clutches, utility usage e comparação com pros
              </p>
            </button>

            <button
              onClick={() => startAnalysis('team')}
              className="group bg-gray-900 hover:bg-gradient-to-br hover:from-orange-500/20 hover:to-orange-600/20 border-2 border-gray-800 hover:border-orange-500 rounded-3xl p-12 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-orange-500/30"
            >
              <Users className="w-28 h-28 text-orange-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-4xl font-black text-white mb-6">Análise de Time</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Economia, controle de sites, coordenação, trade kills, execuções e pontos fracos coletivos
              </p>
            </button>
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
    return (
      <div className="min-h-screen bg-black py-12 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="bg-gray-900 border-2 border-gray-800 rounded-2xl p-8 mb-10">
            <button 
              onClick={() => setCurrentPage('upload-area')}
              className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors group"
            >
              <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
            <h2 className="text-5xl font-black text-white mb-4">
              Relatório de <span className="text-orange-500">Análise</span>
            </h2>
            <p className="text-gray-400 text-xl">
              {uploadedDemo?.name} • {analysis.map} • {analysis.duration} • {analysis.rounds} rounds
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-4 border-orange-500 rounded-3xl p-10 shadow-2xl shadow-orange-500/30 glow-orange">
              <div className="flex items-center gap-4 mb-6">
                <Award className="w-16 h-16 text-orange-500" />
                <div>
                  <h3 className="text-3xl font-bold text-white">
                    {analysis.type === 'player' ? 'MVP da Partida' : 'Equipe em Destaque'}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.35em] text-orange-200 mt-1">
                    {analysis.map.toUpperCase()} • {analysis.duration}
                  </p>
                </div>
              </div>
              <p className="text-5xl font-black text-white mb-4">{analysis.mvp}</p>
              <p className="text-gray-100 leading-relaxed mb-6">{analysis.summary}</p>
              <div className="grid grid-cols-2 gap-4 text-gray-200">
                <div className="bg-black/40 border border-orange-500/30 rounded-2xl px-4 py-3">
                  <p className="text-xs uppercase text-gray-400 tracking-[0.3em] mb-1">Rounds</p>
                  <p className="text-xl font-bold text-white">{analysis.rounds}</p>
                </div>
                {analysis.score && (
                  <div className="bg-black/40 border border-orange-500/30 rounded-2xl px-4 py-3">
                    <p className="text-xs uppercase text-gray-400 tracking-[0.3em] mb-1">Placar Final</p>
                    <p className="text-xl font-bold text-green-400">{analysis.score}</p>
                  </div>
                )}
                {analysis.rating && (
                  <div className="bg-black/40 border border-orange-500/30 rounded-2xl px-4 py-3 col-span-2">
                    <p className="text-xs uppercase text-gray-400 tracking-[0.3em] mb-1">Rating 2.0</p>
                    <p className="text-3xl font-black text-green-400">{analysis.rating}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-10 h-10 text-blue-400" />
                <div>
                  <h3 className="text-2xl font-bold text-white">Principais Achados</h3>
                  <p className="text-sm text-gray-400">Insights priorizados pela IA</p>
                </div>
              </div>
              <ul className="space-y-4">
                {analysis.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-orange-500 text-2xl leading-none">•</span>
                    <p className="text-gray-200 leading-relaxed">{finding}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {metrics.length > 0 && (
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-10 mb-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-white">Métricas-Chave</h3>
                  <p className="text-sm text-gray-400">
                    {analysis.type === 'player' ? 'Performance individual' : 'Sinergia de equipe'}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <BarChart3 className="w-7 h-7 text-black" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                {metrics.map((metric, index) => {
                  const trend = trendCopy[metric.trend];
                  return (
                    <div
                      key={index}
                      className="bg-black/60 border border-gray-800 hover:border-orange-500/40 rounded-2xl p-6 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-white">{metric.label}</h4>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${trendBadgeClasses[metric.trend]}`}
                        >
                          {trend.icon} {trend.label}
                        </span>
                      </div>
                      <p className="text-4xl font-black text-orange-500 mb-2">{metric.value}</p>
                      <p className="text-sm text-gray-400 leading-relaxed">{metric.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-[2fr,1fr] gap-8 mb-10">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Heatmap &amp; Posicionamento</h3>
                  <p className="text-sm text-gray-400">Mapa {analysis.map}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Flame className="w-6 h-6 text-black" />
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden h-72 mb-6">
                <img
                  src={analysis.heatmapUrl}
                  alt={`Heatmap ${analysis.map}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-black/60 text-orange-300 px-3 py-1 rounded-full text-xs uppercase tracking-[0.35em]">
                  Heatmap
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">{analysis.heatmapSummary}</p>
            </div>
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Crosshair className="w-7 h-7 text-orange-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Hotspots Prioritários</h3>
                  <p className="text-sm text-gray-400">Zonas que pedem revisão</p>
                </div>
              </div>
              <ul className="space-y-4">
                {analysis.heatmapHotspots.map((hotspot, index) => (
                  <li key={index} className="bg-black/40 border border-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">{hotspot.zone}</span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${pressureBadgeClasses[hotspot.pressure]}`}>
                        {hotspot.pressure}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2 leading-relaxed">{hotspot.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Compass className="w-7 h-7 text-cyan-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Radar &amp; Rotação</h3>
                  <p className="text-sm text-gray-400">Momentos chave do mapa</p>
                </div>
              </div>
              <div className="space-y-5">
                {analysis.radarMoments.map(moment => (
                  <div key={moment.tick} className="bg-black/40 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-[0.3em] mb-3">
                      <span>{moment.clock}</span>
                      <span>{moment.callout}</span>
                    </div>
                    <p className="text-white font-semibold mb-4">{moment.highlight}</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                      {moment.players.map(player => (
                        <div key={`${moment.tick}-${player.name}`} className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${player.role === 'ct' ? 'bg-blue-400' : 'bg-orange-400'}`}></span>
                          <span className="font-semibold text-white">{player.name}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{player.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-7 h-7 text-yellow-300" />
                <div>
                  <h3 className="text-xl font-bold text-white">Rounds Decisivos</h3>
                  <p className="text-sm text-gray-400">Lances que mudaram o jogo</p>
                </div>
              </div>
              <div className="space-y-5">
                {analysis.roundHighlights.map(highlight => (
                  <div key={highlight.round} className="flex items-start gap-4 bg-black/40 border border-gray-800 rounded-2xl p-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-orange-500/30">
                      R{highlight.round}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg mb-1">{highlight.result}</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{highlight.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-7 h-7 text-green-300" />
                <div>
                  <h3 className="text-xl font-bold text-white">Economia</h3>
                  <p className="text-sm text-gray-400">Fluxo financeiro ao longo do mapa</p>
                </div>
              </div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-2">Gasto médio</p>
              <p className="text-4xl font-black text-white mb-4">${analysis.economy.averageSpend.toLocaleString('pt-BR')}</p>
              <p className="text-gray-300 leading-relaxed">{analysis.economy.economyStrength}</p>
              <div className="mt-6 space-y-3">
                {analysis.economy.swings.map((swing, index) => (
                  <div key={index} className="flex items-start gap-3 text-gray-300">
                    <span className="text-orange-400 font-bold mt-1">•</span>
                    <p className="leading-relaxed">{swing}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-orange-500/15 border-2 border-orange-500/40 rounded-3xl p-8 shadow-2xl shadow-orange-500/20">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-7 h-7 text-orange-200" />
                <div>
                  <h3 className="text-2xl font-bold text-white">Plano de Ação RUSH</h3>
                  <p className="text-sm text-orange-100">Foque nessas melhorias primeiro</p>
                </div>
              </div>
              <ul className="space-y-4 text-gray-100">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-orange-300 font-black">{index + 1}.</span>
                    <p className="leading-relaxed">{rec}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-6">
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