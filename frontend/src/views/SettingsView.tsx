"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import { useApp } from "@/lib_front/store";

export default function SettingsView() {
  const router = useRouter();
  const { lang } = useApp();

  return (
    <GradientBackground>
      <div className="min-h-screen flex items-center justify-center p-16">
        {/* Cadre noir centré */}
        <div className="bg-black w-full h-[calc(100vh-8rem)] rounded-lg flex flex-col justify-center items-center">
          <div className="w-full max-w-lg space-y-6">
            <button 
              onClick={() => router.push("/play")}
              className="font-press-start w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              play
            </button>
            
            <button 
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              tchat
            </button>
            
            <button 
              onClick={() => router.push("/profile")}
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              profile
            </button>
            
            <button 
              className="w-full py-6 px-8 bg-purple-600 border-2 border-white text-white text-2xl font-bold rounded-lg cursor-default"
            >
              setting
            </button>
            
            {/* Bouton retour */}
            <button 
              onClick={() => router.push("/")}
              className="w-full py-4 px-8 mt-8 bg-transparent border border-white/50 text-white/70 text-lg rounded-lg transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/80"
            >
              ← Return to Home
            </button>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}