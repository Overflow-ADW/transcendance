// src/views/ChooseIAView.tsx
"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import { t } from "@/lib_front/i18n";
import { useRouter } from 'next/navigation';

export default function ChooseIAView() {
  const router = useRouter();
  const { lang } = useApp();

  return (
    <GradientBackground>
      <div className="min-h-screen flex items-center justify-center p-16">
        {/* Cadre noir centré comme Settings */}
        <div className="bg-black min-h-[70vh] rounded-lg p-10 flex flex-col justify-center items-center w-full max-w-2xl">
          <div className="w-full max-w-lg space-y-6">
            <button
              onClick={() => {
                setDifficulty("easy");
                router.push("/game");
              }}
              className="w-full py-6 px-8 bg-transparent border-4 border-purple-500 text-purple-500 text-2xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-500 hover:text-white hover:scale-105"
            >
              EASY
            </button>
            
            <button
              onClick={() => {
                setDifficulty("medium");
                router.push("/game");
              }}
              className="w-full py-6 px-8 bg-transparent border-4 border-purple-500 text-purple-500 text-2xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-500 hover:text-white hover:scale-105"
            >
              MEDIUM
            </button>
            
            <button
              onClick={() => {
                setDifficulty("hard");
                router.push("/game");
              }}
              className="w-full py-6 px-8 bg-transparent border-4 border-purple-500 text-purple-500 text-2xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-500 hover:text-white hover:scale-105"
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