// src/views/GameView.tsx
"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import Pong from "@/game/components/Pong";

export default function GameView() {
  const { navigate } = useApp();

  // Nettoyer le localStorage quand on quitte le jeu
  const handleQuit = () => {
    localStorage.removeItem('game-mode');
    localStorage.removeItem('ai-difficulty');
    navigate("tournament");
  };

  return (
    <GradientBackground className="bg-black">
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Zone de jeu avec bordure blanche */}
        <div className="w-full max-w-6xl mb-12">
          <div className="bg-black border-4 border-white rounded-2xl p-1 relative">
            {/* Conteneur de jeu avec aspect ratio 16:10 */}
            <div
              className="relative bg-black rounded-xl overflow-hidden"
              style={{ aspectRatio: "16/10" }}
            >
              {/* Composant Pong intégré */}
              <Pong />
            </div>
          </div>
        </div>

        {/* Boutons de contrôle */}
        <div className="flex gap-8">
          <button
            onClick={() => {
              /* Logique pause */
            }}
            className="bg-transparent border-4 border-white text-white px-12 py-3 rounded-full text-2xl font-bold transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
          >
            pause
          </button>

          <button
            onClick={handleQuit}
            className="bg-transparent border-4 border-white text-white px-12 py-3 rounded-full text-2xl font-bold transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
          >
            quit
          </button>

          <button
            onClick={() => navigate("settings")}
            className="bg-transparent border-4 border-white text-white px-12 py-3 rounded-full text-2xl font-bold transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
          >
            settings
          </button>
        </div>
      </div>
    </GradientBackground>
  );
}
