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
        // Mode multijoueur avec paddle centrale
        console.log('Démarrage du mode multijoueur avec paddle centrale');
        pongGameRef.current.setGameMode(GameType.MULTIPLAYER_PONG);
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

      // Ajouter un écouteur d'événements pour la touche Escape pour arrêter le jeu manuellement
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && pongGameRef.current && !pongGameRef.current.isManuallystopped()) {
          console.log('Touche Escape pressée - arrêt du jeu');
          pongGameRef.current.stopGame();
        }
      };

      window.addEventListener('keydown', handleKeyPress);

      // Nettoyer l'écouteur d'événements lors du démontage
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }

    // Cleanup function
    return () => {
      if (pongGameRef.current) {
        // Nettoyer les ressources du jeu si nécessaire
        pongGameRef.current = null;
      }
    };
  }, []);

  // Fonction pour arrêter le jeu manuellement (peut être appelée par un bouton)
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
      
      {/* Bouton d'arrêt optionnel (peut être caché avec CSS si nécessaire) */}
      <button
        onClick={handleStopGame}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg z-10 opacity-75 hover:opacity-100 transition-opacity"
        title="Arrêter le jeu (ou appuyez sur Escape)"
      >
        Quitter
      </button>
    </div>
  );
}