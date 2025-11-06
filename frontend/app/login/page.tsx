'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Target, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [loadingDev, setLoadingDev] = React.useState(false);

  const handleSteamLogin = () => {
    setLoading(true);
    // Redirecionar para autenticação Steam
    window.location.href = '/api/auth/steam';
  };

  useEffect(() => {
    // Verificar se já está autenticado
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ 
          backgroundImage: 'url(https://images7.alphacoders.com/107/thumb-1920-1071432.png)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 25px rgba(249, 115, 22, 0.5), 0 0 50px rgba(249, 115, 22, 0.3);
          }
          50% { 
            box-shadow: 0 0 45px rgba(249, 115, 22, 0.7), 0 0 90px rgba(249, 115, 22, 0.4);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .glow-orange {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.3), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 animate-scale-in">
          {/* Logo */}
          <div className="text-center animate-slide-up">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/50 hover:scale-110 hover:rotate-3 transition-all duration-300">
                <Target className="w-10 h-10 text-black" />
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight">
                CS2<span className="text-orange-500">PRO</span>
              </h1>
            </div>
            <p className="text-xl text-gray-300 font-semibold">Análise Profissional de Partidas</p>
          </div>

          {/* Login Card */}
          <div className="bg-black/60 backdrop-blur-sm border-2 border-orange-500/30 rounded-3xl p-8 shadow-2xl shadow-orange-500/20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-3xl font-black text-white mb-8 text-center">Entrar</h2>
            
            <div className="space-y-4">
              {/* Botão Steam */}
              <button
                onClick={handleSteamLogin}
                disabled={loading || loadingDev}
                className="relative w-full bg-gradient-to-br from-black via-gray-900 to-black hover:from-black hover:via-black hover:to-black border-2 border-orange-500/60 hover:border-orange-500 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 text-white font-black py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden hover:scale-105"
                style={{
                  boxShadow: '0 0 20px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity shimmer"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
                <span className="relative z-10 flex items-center gap-3">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-6 w-6 text-orange-500" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-7 h-7 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 1c6.065 0 11 4.935 11 11s-4.935 11-11 11S1 18.065 1 12 5.935 1 12 1z"/>
                        <path d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5S16.136 4.5 12 4.5zm0 1c3.584 0 6.5 2.916 6.5 6.5S15.584 18.5 12 18.5 5.5 15.584 5.5 12 8.416 5.5 12 5.5z"/>
                        <path d="M12 8.5c-1.933 0-3.5 1.567-3.5 3.5s1.567 3.5 3.5 3.5 3.5-1.567 3.5-3.5S13.933 8.5 12 8.5zm0 1c1.381 0 2.5 1.119 2.5 2.5S13.381 14.5 12 14.5 9.5 13.381 9.5 12s1.119-2.5 2.5-2.5z"/>
                      </svg>
                      <span className="text-lg drop-shadow-lg">Entrar com Steam</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>

              {/* Botão DEV temporário */}
              <button
                onClick={async () => {
                  setLoadingDev(true);
                  try {
                    const response = await fetch('http://localhost:4000/api/auth/dev', {
                      method: 'POST',
                    });
                    const data = await response.json();
                    if (data.token) {
                      localStorage.setItem('auth_token', data.token);
                      window.location.href = '/';
                    }
                  } catch (error) {
                    console.error('Erro no login DEV:', error);
                  } finally {
                    setLoadingDev(false);
                  }
                }}
                disabled={loading || loadingDev}
                className="relative w-full bg-gradient-to-br from-black via-gray-900 to-black hover:from-black hover:via-black hover:to-black border-2 border-yellow-500/60 hover:border-yellow-500 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 text-yellow-400 font-black py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden hover:scale-105"
                style={{
                  boxShadow: '0 0 20px rgba(234, 179, 8, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity shimmer"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
                <span className="relative z-10 flex items-center gap-3">
                  {loadingDev ? (
                    <>
                      <Loader2 className="animate-spin h-6 w-6" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl drop-shadow-lg">🔧</span>
                      <span className="text-lg drop-shadow-lg">DEV (Login Temporário)</span>
                      <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-orange-500/20">
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                Ao entrar, você concorda com nossos termos de uso e política de privacidade.
              </p>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-2 border-orange-500/30 rounded-2xl p-6 text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <p className="text-lg font-bold text-white">Primeira análise é grátis!</p>
            </div>
            <p className="text-sm text-gray-300">
              Depois, apenas <span className="text-orange-400 font-bold">R$ 50</span> por <span className="text-orange-400 font-bold">10 análises</span> completas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
