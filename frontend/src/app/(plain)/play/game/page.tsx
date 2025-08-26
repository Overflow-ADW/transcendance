"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Import dynamique pour éviter les erreurs SSR avec BabylonJS
const PongGame = typeof window !== 'undefined' ? 
  require('../../../../game/pong/game/Pong').Pong : null;

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gameLoaded, setGameLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !PongGame) return;

    try {
      // Créer l'instance du jeu
      gameRef.current = new PongGame(canvasRef.current);
      setGameLoaded(true);
      
      // Configuration selon les paramètres URL
      const mode = searchParams.get('mode');
      const difficulty = searchParams.get('difficulty');
      
      if (mode === 'ia' && difficulty) {
        const difficultyMap: { [key: string]: number } = {
          'easy': 2,
          'medium': 3,
          'hard': 4
        };
        
        const difficultyLevel = difficultyMap[difficulty] || 3;
        gameRef.current.enableAI(difficultyLevel);
      }
      
    } catch (err) {
      console.error('Erreur lors du chargement du jeu:', err);
      setError('Impossible de charger le jeu');
    }

    return () => {
      if (gameRef.current && gameRef.current.dispose) {
        gameRef.current.dispose();
      }
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">❌ {error}</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="border-2 border-blue-500 rounded-lg max-w-full max-h-full"
        style={{ 
          width: '90vw', 
          height: '70vh',
          background: 'transparent'
        }}
      />
      
      {!gameLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p>Chargement du jeu...</p>
          </div>
        </div>
      )}
    </div>
  );
}
