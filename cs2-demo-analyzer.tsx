import React, { useState, useEffect } from 'react';
import { Upload, User, Users, MessageSquare, Check, Loader2, TrendingUp, Target, Award, Zap, AlertCircle, ArrowRight, Star, Crown, Sparkles, Send } from 'lucide-react';

const CS2ProAnalyzerApp = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [uploadedDemo, setUploadedDemo] = useState(null);
  const [analysisType, setAnalysisType] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [particles, setParticles] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
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
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedDemo({ name: file.name, size: (file.size / 1024 / 1024).toFixed(2) });
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
    setChatMessages(newMessages);
    
    setTimeout(() => {
      let aiResponse = '';
      const query = chatInput.toLowerCase();
      
      if (query.includes('demo') || query.includes('arquivo')) {
        aiResponse = `📁 **RUSH aqui!** Upload detectado:\n\n✅ Arquivo: ${uploadedDemo?.name}\n✅ Tamanho: ${uploadedDemo?.size}MB\n\n🎯 Posso começar a análise agora? Escolha:\n• Digite "player" para análise individual\n• Digite "team" para análise de time`;
      } else if (query.includes('player') || query.includes('jogador')) {
        aiResponse = `⚡ **Iniciando análise INDIVIDUAL!**\n\nVou processar:\n• K/D, HS%, ADR, Rating 2.0\n• Posicionamento e heatmaps\n• Clutches e utility usage\n\n🔥 Aguarde o processamento...`;
        setTimeout(() => {
          setAnalysisType('player');
          setCurrentPage('select-analysis');
        }, 2000);
      } else if (query.includes('team') || query.includes('time')) {
        aiResponse = `🏆 **Iniciando análise de TIME!**\n\nVou analisar:\n• Economia e controle de sites\n• Trade kills e coordenação\n• Rotações e estratégias\n\n⚡ Aguarde...`;
        setTimeout(() => {
          setAnalysisType('team');
          setCurrentPage('select-analysis');
        }, 2000);
      } else if (query.includes('ajuda') || query.includes('help')) {
        aiResponse = `💬 **RUSH - Seu assistente de análise**\n\n📌 Comandos:\n• "Como funciona?" - Entenda o processo\n• "player" - Análise individual\n• "team" - Análise de time\n• "status" - Ver progresso\n\nFaça upload de uma demo .dem! 🚀`;
      } else {
        aiResponse = `🤖 **RUSH aqui!**\n\nRecebi: "${chatInput}"\n\n${uploadedDemo ? `✅ Demo carregada: ${uploadedDemo.name}\n\nDigite "player" ou "team" para começar!` : '❌ Nenhuma demo carregada.\n\nClique no botão UPLOAD acima!'}`;
      }
      
      setChatMessages([...newMessages, { role: 'ai', text: aiResponse }]);
    }, 800);
    
    setChatInput('');
  };

  const startAnalysis = (type) => {
    setAnalysisType(type);
    setIsProcessing(true);
    setProgress(0);
    setCurrentPage('processing');
    
    setTimeout(() => {
      setIsProcessing(false);
      setAnalysis({
        type,
        map: 'de_ancient',
        duration: '47:23',
        rounds: 28,
        mvp: type === 'player' ? 'dev1ce' : 'Team Liquid',
        rating: type === 'player' ? 1.35 : null,
        score: type === 'team' ? '16-12' : null,
        summary: type === 'player' 
          ? 'Desempenho excepcional com 28 kills, 68.5% HS rate e ADR de 87.3. Controle de spray superior e posicionamento tático acima da média pro-level.'
          : 'Time demonstrou coordenação econômica eficiente (média $1732/round) e controle dominante de sites. Vitória por execução superior e rotações cronometradas.'
      });
      setCurrentPage('results');
    }, 5000);
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
                      <span className="text-gray-400">({uploadedDemo.size}MB)</span>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(e)}
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

          {/* MVP/Winner Card */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-4 border-orange-500 rounded-3xl p-12 mb-10 shadow-2xl shadow-orange-500/30 glow-orange">
            <div className="flex items-start gap-6">
              <Award className="w-20 h-20 text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-white mb-4">
                  {analysisType === 'player' ? 'MVP da Partida' : 'Time Vencedor'}
                </h3>
                <p className="text-6xl font-black text-white mb-6">{analysis.mvp}</p>
                {analysis.rating && (
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-gray-300 text-xl">Rating 2.0:</span>
                    <span className="text-5xl font-black text-green-400">{analysis.rating}</span>
                    <span className="text-sm text-gray-500">(Pro avg: 1.0)</span>
                  </div>
                )}
                {analysis.score && (
                  <p className="text-5xl font-black text-green-400">{analysis.score}</p>
                )}
              </div>
            </div>
          </div>

          {/* Analysis Summary */}
          <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-10 mb-10">
            <div className="flex items-start gap-6">
              <TrendingUp className="w-16 h-16 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="text-3xl font-bold text-white mb-6">Análise da IA</h3>
                <p className="text-gray-300 leading-relaxed text-xl mb-8">{analysis.summary}</p>
                
                {analysisType === 'player' && (
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-black rounded-xl p-6 text-center border-2 border-orange-500/30">
                      <p className="text-4xl font-black text-orange-500 mb-2">68.5%</p>
                      <p className="text-sm text-gray-500">HS Rate</p>
                    </div>
                    <div className="bg-black rounded-xl p-6 text-center border-2 border-green-500/30">
                      <p className="text-4xl font-black text-green-400 mb-2">87.3</p>
                      <p className="text-sm text-gray-500">ADR</p>
                    </div>
                    <div className="bg-black rounded-xl p-6 text-center border-2 border-blue-500/30">
                      <p className="text-4xl font-black text-blue-400 mb-2">76.4%</p>
                      <p className="text-sm text-gray-500">KAST</p>
                    </div>
                  </div>
                )}
              </div>
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