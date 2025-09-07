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
			  onClick={() => router.push("/friends")}
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              friends
            </button>
            
            <button 
              onClick={() => router.push("/profile")}
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              profile
            </button>
            
            <button
			  onClick={() => router.push("/trueSettings")} 
              className="w-full py-6 px-8 bg-purple-600 border-2 border-white text-white text-2xl font-bold rounded-lg cursor-default"
            >
              setting
            </button>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}