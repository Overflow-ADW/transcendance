// src/views/ChooseIAView.tsx
"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';

export default function ChooseIAView() {
  const router = useRouter();
  const { lang } = useApp();

  const handleDifficultySelect = (difficulty: string) => {
    localStorage.setItem('ai-difficulty', difficulty);
    localStorage.setItem('game-mode', 'ai');
    router.push("/game");
  };

  return (
    <GradientBackground>
      <div className="min-h-screen flex items-center justify-center p-16">
        <div className="min-h-[70vh] rounded-lg p-10 flex flex-col justify-center items-center w-full max-w-2xl">
          <div className="w-full max-w-lg space-y-6">
            <h2 className="text-4xl font-bold text-white text-center mb-8">
              CHOOSE DIFFICULTY
            </h2>

            <button
              onClick={() => handleDifficultySelect("easy")}
              className="w-full py-6 px-8 bg-transparent border-4 border-green-500 text-green-500 text-2xl font-bold rounded-2xl transition-all duration-300 hover:bg-green-500 hover:text-white hover:scale-105"
            >
              EASY
            </button>

            <button
              onClick={() => handleDifficultySelect("medium")}
              className="w-full py-6 px-8 bg-transparent border-4 border-yellow-500 text-yellow-500 text-2xl font-bold rounded-2xl transition-all duration-300 hover:bg-yellow-500 hover:text-white hover:scale-105"
            >
              MEDIUM
            </button>

            <button
              onClick={() => handleDifficultySelect("hard")}
              className="w-full py-6 px-8 bg-transparent border-4 border-red-500 text-red-500 text-2xl font-bold rounded-2xl transition-all duration-300 hover:bg-red-500 hover:text-white hover:scale-105"
            >
              HARD
            </button>

            <button
              onClick={() => router.push("/play")}
              className="w-full py-4 px-8 mt-8 bg-transparent border-2 border-white/50 text-white/70 text-lg rounded-lg transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/80"
            >
              ← Return
            </button>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}