import React, { useEffect, useRef } from 'react';
import { Pong as PongGame } from '@/game/game/Pong';
import { AIDifficulty } from '@/game/utils/AI/pongAI';
import { GameType } from '@/game/utils/pongData';

interface PongProps {
  msg?: string;
}

export default function Pong({ msg }: PongProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pongGameRef = useRef<PongGame | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      pongGameRef.current = new PongGame(canvasRef.current);
      
      const gameMode = localStorage.getItem('game-mode');
      
      if (gameMode === 'multiplayer') {
        console.log('Démarrage du mode multijoueur avec paddle centrale');
        pongGameRef.current.setGameMode(GameType.MULTIPLAYER_PONG);
      } else if (gameMode === 'ai') {
        const aiDifficulty = localStorage.getItem('ai-difficulty');
        
        if (aiDifficulty && pongGameRef.current) {
          let difficulty: AIDifficulty;
          switch (aiDifficulty.toLowerCase()) {
            case 'easy':
              difficulty = AIDifficulty.EASY;
              break;
            case 'medium':
              difficulty = AIDifficulty.MEDIUM;
              break;
            case 'hard':
              difficulty = AIDifficulty.HARD;
              break;
            default:
              difficulty = AIDifficulty.MEDIUM;
          }
          
          pongGameRef.current.enableAI(difficulty);
          console.log(`IA activée avec difficulté: ${aiDifficulty}`);
        }
      } else {
        console.log('Mode 2 joueurs par défaut');
      }

      // Ajouter un écouteur d'événements pour la touche Escape pour arrêter le jeu manuellement
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && pongGameRef.current && !pongGameRef.current.isManuallystopped()) {
          console.log('Touche Escape pressée - arrêt du jeu');
          pongGameRef.current.stopGame();
        }
      };

      window.addEventListener('keydown', handleKeyPress);

      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }

    return () => {
      if (pongGameRef.current) {
        pongGameRef.current = null;
      }
    };
  }, []);

  const handleStopGame = () => {
    if (pongGameRef.current && !pongGameRef.current.isManuallystopped()) {
      pongGameRef.current.stopGame();
    }
  };

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}