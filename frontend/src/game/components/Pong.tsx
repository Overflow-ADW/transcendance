import React, { useEffect, useRef } from 'react';
import { Pong as PongGame } from '@/game/pong/game/Pong';
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
      // Créer l'instance du jeu
      pongGameRef.current = new PongGame(canvasRef.current);
      
      // Vérifier le mode de jeu
      const gameMode = localStorage.getItem('game-mode');
      
      if (gameMode === 'multiplayer') {
        // Mode multijoueur 4 joueurs
        console.log('Démarrage du mode multijoueur 4 joueurs');
        pongGameRef.current.setGameMode(GameType.FOUR_PLAYER_PONG);
      } else if (gameMode === 'ai') {
        // Mode IA
        const aiDifficulty = localStorage.getItem('ai-difficulty');
        
        if (aiDifficulty && pongGameRef.current) {
          // Convertir la difficulté string en enum
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
          
          // Activer l'IA avec la difficulté sélectionnée
          pongGameRef.current.enableAI(difficulty);
          console.log(`IA activée avec difficulté: ${aiDifficulty}`);
        }
      } else {
        // Mode par défaut (2 joueurs)
        console.log('Mode 2 joueurs par défaut');
      }
    }

    // Cleanup function
    return () => {
      if (pongGameRef.current) {
        // Nettoyer les ressources du jeu si nécessaire
        pongGameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}