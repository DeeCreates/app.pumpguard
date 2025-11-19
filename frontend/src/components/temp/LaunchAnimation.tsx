import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

interface LaunchAnimationProps {
  onComplete: () => void;
}

export function LaunchAnimation({ onComplete }: LaunchAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'loading' | 'ready' | 'fade'>('loading');

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setStage('ready');
          setTimeout(() => {
            setStage('fade');
            setTimeout(onComplete, 500);
          }, 800);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        stage === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #0B2265 100%)',
      }}
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite',
          }}
        />
      </div>

      {/* Logo and Brand */}
      <div className={`relative z-10 text-center transition-all duration-700 ${
        stage === 'ready' ? 'scale-110' : 'scale-100'
      }`}>
        {/* Pulsing Circle */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
          <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-pulse" />
          <div
            className="relative w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center shadow-2xl transform transition-transform duration-700"
            style={{
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <Zap className="w-16 h-16 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Brand Name */}
        <h1
          className="text-5xl text-white mb-4 tracking-tight"
          style={{
            animation: 'glow 2s ease-in-out infinite',
          }}
        >
          PumpGuard
        </h1>
        <p className="text-xl text-blue-200 mb-12 tracking-wide">
          Fuel Station Management System
        </p>

        {/* Loading Progress */}
        <div className="w-80 mx-auto">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-white/30 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-blue-300">
            {progress < 30 && 'Initializing system...'}
            {progress >= 30 && progress < 60 && 'Loading modules...'}
            {progress >= 60 && progress < 90 && 'Syncing data...'}
            {progress >= 90 && progress < 100 && 'Almost ready...'}
            {progress === 100 && stage === 'ready' && '✓ Ready!'}
          </p>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float-particle ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center text-blue-300/60 text-sm">
        <p>PumpGuard Technologies Ltd.</p>
        <p className="text-xs mt-1">Version 1.0.0</p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { text-shadow: 0 0 40px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.6); }
        }

        @keyframes float-particle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
          10% { opacity: 0.6; }
          50% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) scale(1.5); opacity: 0.8; }
          90% { opacity: 0.6; }
        }

        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
}
