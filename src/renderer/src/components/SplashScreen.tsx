import { useState, useEffect } from 'react';
import logoSrc from '../assets/logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export default function SplashScreen({ onComplete, duration = 6000 }: SplashScreenProps): JSX.Element {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 1200);
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 800);
    const doneTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete, duration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient gradient swooshes */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-0"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.30) 0%, transparent 65%)',
            top: '-15%',
            right: '-10%',
            animation: 'swoosh1 3s ease-in-out forwards',
          }}
        />
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-0"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 65%)',
            bottom: '-15%',
            left: '-10%',
            animation: 'swoosh2 3s ease-in-out 0.2s forwards',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-0"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 65%)',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'swoosh3 3.5s ease-in-out 0.5s forwards',
          }}
        />
      </div>

      {/* Logo container */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo image */}
        <div
          className="opacity-0"
          style={{ animation: 'logoReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards' }}
        >
          <img src={logoSrc} alt="Scene Shiftr" className="w-20 h-20" />
        </div>

        {/* App name */}
        <div
          className="opacity-0"
          style={{ animation: 'textReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards' }}
        >
          <h1 className="text-2xl font-semibold tracking-wide text-zinc-100">
            Scene Shiftr
          </h1>
        </div>

        {/* Loading bar */}
        <div
          className="w-24 h-0.5 bg-zinc-800 rounded-full overflow-hidden mt-1 opacity-0"
          style={{ animation: 'textReveal 0.5s ease 1.4s forwards' }}
        >
          <div
            className="h-full bg-indigo-500/60 rounded-full"
            style={{
              animation: `loadingBar ${duration - 1800}ms ease-in-out 1.6s forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes logoReveal {
          0% {
            opacity: 0;
            transform: scale(0.6) translateY(12px);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }

        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loadingBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes swoosh1 {
          0% {
            opacity: 0;
            transform: translate(60px, 50px) scale(0.5);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate(-100px, 60px) scale(1.3);
          }
        }

        @keyframes swoosh2 {
          0% {
            opacity: 0;
            transform: translate(-50px, -30px) scale(0.5);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0.9;
            transform: translate(90px, -50px) scale(1.25);
          }
        }

        @keyframes swoosh3 {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.4);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0.8;
            transform: translateX(-50%) scale(1.35);
          }
        }
      `}</style>
    </div>
  );
}
