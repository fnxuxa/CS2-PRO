'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Upload, User, Users, MessageSquare, Check, Loader2, TrendingUp, Target, Award, Zap, AlertCircle, ArrowRight, Star, Crown, Sparkles, Send, Flame, Compass, BarChart3, Crosshair, Shield, Skull, TrendingDown } from 'lucide-react';

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
}

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
  const [steamId, setSteamId] = useState<string>('');
  // Estados para a página de resultados (movidos para fora do condicional para evitar problemas de hidratação)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'players' | 'teams' | 'rounds' | 'heatmap' | 'radar' | 'chat'>('overview');
  const [teamComparison, setTeamComparison] = useState<'both' | 'ct' | 't'>('both');

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
      setChatMessages([
        {
          role: 'ai',
          text: `📁 Demo **${uploaded.name}** recebida (${uploaded.sizeMB}MB).

Digite seu **Steam ID64** no campo acima (opcional) para análise focada no seu time, ou deixe em branco para análise geral. Clique em **Iniciar Análise** quando estiver pronto!`,
        },
      ]);
      setJobStatus('queued');
      setCurrentPage('upload-area');
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

    // Usar steamId do estado ou do parâmetro
    const targetSteamId = steamIdInput || steamId || undefined;
    const requestBody: { uploadId: string; steamId?: string } = { uploadId: uploadedDemo.id };
    if (targetSteamId && targetSteamId.trim() !== '') {
      requestBody.steamId = targetSteamId.trim();
    }

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
      <div className="min-h-screen bg-black relative overflow-hidden">
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

                {jobError && (
                  <div className="mt-6 text-sm text-red-400 font-semibold">
                    {jobError}
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
          {jobError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded-2xl mb-10 text-center">
              {jobError}
            </div>
          )}
          <p className="text-center text-gray-400 mb-12 text-xl">
            Demo: <span className="text-white font-semibold">{uploadedDemo?.name}</span>
          </p>
          
          <div className="space-y-8">
            {/* Campo Steam ID */}
            <div className="bg-gray-900/50 border-2 border-gray-800 rounded-2xl p-6">
              <label className="block text-white font-semibold text-lg mb-3">
                Steam ID64 <span className="text-gray-400 text-sm font-normal">(opcional - para análise focada)</span>
              </label>
              <input
                type="text"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="76561198012345678"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
              <p className="text-gray-400 text-sm mt-2">
                Deixe em branco para análise geral da partida, ou digite seu Steam ID64 para análise focada no seu desempenho
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <button
                onClick={() => startAnalysis()}
                className="group bg-gray-900 hover:bg-gradient-to-br hover:from-orange-500/20 hover:to-orange-600/20 border-2 border-gray-800 hover:border-orange-500 rounded-3xl p-12 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-orange-500/30"
              >
                <User className="w-28 h-28 text-orange-500 mx-auto mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-4xl font-black text-white mb-6">Iniciar Análise</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  {steamId ? `Análise focada no seu desempenho (Steam ID: ${steamId})` : 'Análise geral da partida com todos os jogadores'}
                </p>
              </button>

              <div className="bg-gray-900/50 border-2 border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center">
                <Users className="w-28 h-28 text-gray-600 mx-auto mb-6" />
                <h3 className="text-4xl font-black text-gray-600 mb-6">Análise de Time</h3>
                <p className="text-gray-500 text-lg leading-relaxed text-center">
                  Use o Steam ID do líder do time ou deixe em branco para análise geral
                </p>
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
    const teams = analysis.teams || [];
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

    // Ordenar jogadores por diferentes métricas
    const playersByKills = [...players].sort((a, b) => b.kills - a.kills);
    const playersByAssists = [...players].sort((a, b) => b.assists - a.assists);
    const playersByKDRatio = [...players].sort((a, b) => (b.kdRatio || 0) - (a.kdRatio || 0));
    const playersByADR = [...players].filter(p => p.adr).sort((a, b) => (b.adr || 0) - (a.adr || 0));

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
                          <span className="text-gray-400 text-sm font-semibold">{teams.find(t => t.team === 'CT')?.teamName || 'Counter-Terrorists'}</span>
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
                          <span className="text-gray-400 text-sm font-semibold">{teams.find(t => t.team === 'T')?.teamName || 'Terrorists'}</span>
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

            {/* Tabs de Navegação */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
                { id: 'players', label: 'Jogadores', icon: Users },
                { id: 'teams', label: 'Times', icon: Shield },
                { id: 'rounds', label: 'Rounds', icon: Target },
                { id: 'heatmap', label: 'Heatmap', icon: Flame },
                { id: 'radar', label: 'Radar', icon: Compass },
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico de K/D por Jogador */}
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Distribuição de K/D</h3>
                <div className="space-y-4">
                  {playersByKDRatio.slice(0, 5).map((player) => {
                    const kd = player.kdRatio || (player.deaths > 0 ? player.kills / player.deaths : player.kills);
                    const maxKD = Math.max(...playersByKDRatio.map(p => p.kdRatio || (p.deaths > 0 ? p.kills / p.deaths : p.kills)));
                    const width = (kd / maxKD) * 100;
                    
                    return (
                      <div key={player.steamID}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-semibold text-sm">{player.name}</span>
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
                  })}
                </div>
              </div>
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
                          {team.teamName || (team.team === 'CT' ? 'Counter-Terrorists' : 'Terrorists')}
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
                                Controle: {zone.control > 50 ? (teams.find(t => t.team === 'CT')?.teamName || 'CT') : (teams.find(t => t.team === 'T')?.teamName || 'T')} ({zone.control}%)
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
                              {round.mvp && (
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
              <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Heatmap &amp; Posicionamento</h3>
                      <p className="text-sm text-gray-400">Mapa {analysis.map}</p>
                    </div>
                    <Flame className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="relative rounded-2xl overflow-hidden h-96 mb-6 bg-gray-800 flex items-center justify-center">
                    {analysis.heatmapUrl ? (
                      <img
                        src={analysis.heatmapUrl}
                        alt={`Heatmap ${analysis.map}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Flame className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Heatmap visual será gerado em breve</p>
                        <p className="text-sm mt-2">{analysis.heatmapSummary}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-300 leading-relaxed">{analysis.heatmapSummary}</p>
                </div>
                
                <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Crosshair className="w-7 h-7 text-orange-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Hotspots Prioritários</h3>
                      <p className="text-sm text-gray-400">Zonas de maior atividade</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analysis.heatmapHotspots.map((hotspot, index) => (
                      <div key={index} className="bg-black/40 border border-gray-800 rounded-2xl px-4 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold">{hotspot.zone}</span>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                            hotspot.pressure === 'Alta' 
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : hotspot.pressure === 'Média'
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              : 'bg-green-500/20 text-green-400 border-green-500/30'
                          }`}>
                            {hotspot.pressure}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-2 leading-relaxed">{hotspot.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Radar */}
          {selectedTab === 'radar' && (
            <div className="space-y-8">
              <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                  <Compass className="w-8 h-8 text-cyan-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">Radar &amp; Rotação</h3>
                    <p className="text-sm text-gray-400">Momentos chave e movimentação no mapa</p>
                  </div>
                </div>
                
                {/* Explicação sobre Radar e Rotação */}
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/30 rounded-2xl p-6 mb-6">
                  <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span>ℹ️</span>
                    O que é Radar & Rotação?
                  </h4>
                  <div className="space-y-3 text-gray-300">
                    <p>
                      <strong className="text-cyan-400">Radar:</strong> São snapshots do posicionamento dos jogadores em momentos importantes da partida (início e fim de rounds, após kills importantes). 
                      Mostra onde cada jogador estava no mapa naquele momento.
                    </p>
                    <p>
                      <strong className="text-cyan-400">Rotação:</strong> Refere-se à movimentação estratégica dos jogadores entre as áreas do mapa. 
                      Por exemplo, quando um time CT precisa se mover do bomb site A para o B após uma jogada dos Terroristas, isso é uma "rotação". 
                      Esta seção ajuda a entender como os times se reposicionaram durante a partida.
                    </p>
                    <p className="text-sm text-gray-400 mt-3">
                      💡 Cada card mostra o posicionamento dos jogadores, o round, o tempo do jogo e a fase do round (início, meio ou fim).
                    </p>
                  </div>
                </div>
                
                {analysis.radarMoments && analysis.radarMoments.length > 0 ? (
                  <div className="space-y-6">
                    {analysis.radarMoments.map((moment, idx) => (
                      <div key={moment.tick || idx} className="bg-black/40 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider mr-3">Round {moment.callout?.replace('Round ', '') || 'N/A'}</span>
                            <span className="text-xs text-gray-500">{moment.clock}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            moment.phase === 'início' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : moment.phase === 'meio'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {moment.phase}
                          </span>
                        </div>
                        
                        <p className="text-white font-bold text-lg mb-4">{moment.highlight}</p>
                        
                        {moment.players && moment.players.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-400 mb-3">Jogadores presentes:</p>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {moment.players.map((player, pIdx) => (
                                <div 
                                  key={`${moment.tick}-${player.name}-${pIdx}`} 
                                  className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2"
                                >
                                  <span className={`w-3 h-3 rounded-full ${player.role === 'ct' ? 'bg-blue-400' : 'bg-orange-400'}`}></span>
                                  <span className="text-white font-semibold text-sm truncate max-w-[150px]" title={player.name}>
                                    {player.name.length > 20 ? `${player.name.substring(0, 17)}...` : player.name}
                                  </span>
                                  <span className="text-gray-500 text-xs ml-auto whitespace-nowrap">{player.action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Compass className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhum momento de radar disponível</p>
                  </div>
                )}
              </div>
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