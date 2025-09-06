// src/views/GameView.tsx
"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import PongCanvas from "@/components/pongs/PongCanvas";
import { useApp } from "@/lib_front/store";

export default function GameView() {
  const { navigate } = useApp();

  return (
    <GradientBackground className="bg-black">
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Zone de jeu avec bordure blanche */}
        <div className="w-full max-w-6xl mb-12">
          <div className="bg-black border-4 border-white rounded-2xl p-1 relative">
            {/* Canvas Pong avec aspect ratio 16:10 */}
            <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/10' }}>
              <PongCanvas />
              
              {/* Score overlay exactement comme votre image */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-16 z-10">
                <div className="text-6xl font-bold text-blue-400">1</div>
                <div className="text-6xl font-bold text-blue-400">0</div>
                <div className="text-6xl font-bold text-purple-400">3</div>
                <div className="text-6xl font-bold text-purple-400">1</div>
              </div>
              
              {/* Barres gradient en haut et en bas */}
              <div 
                className="absolute top-4 left-8 right-8 h-2 rounded-full z-10"
                style={{
                  background: 'linear-gradient(to right, #2323FF, #8A00C4)',
                }}
              />
              <div 
                className="absolute bottom-4 left-8 right-8 h-2 rounded-full z-10"
                style={{
                  background: 'linear-gradient(to right, #2323FF, #8A00C4)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Boutons de contrôle */}
        <div className="flex gap-8">
          <button
            onClick={() => {/* Logique pause */}}
            className="bg-transparent border-4 border-white text-white px-12 py-3 rounded-full text-2xl font-bold transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
          >
            pause
          </button>
          
          <button
            onClick={() => navigate("tournament")}
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