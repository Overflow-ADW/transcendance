"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { BackButton } from "@/components/ui/BackButton";
import { useRouter } from 'next/navigation';
import { useApp } from "@/lib_front/store";
import { t } from "@/lib_front/i18n";

export default function SettingsView() {
  const router = useRouter();
  const { lang } = useApp();

  return (
    <GradientBackground>

      <div className="hidden xl:block min-h-screen flex items-center justify-center p-16">
        <div className="w-full h-[calc(100vh-8rem)] rounded-lg flex flex-col justify-center items-center">
          <div className="w-full max-w-lg space-y-6">
            <button
              onClick={() => router.push("/play")}
              className="font-press-start w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'play')}
            </button>

            <button
              onClick={() => router.push("/friends")}
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'friends')}
            </button>

            <button
              onClick={() => router.push("/profile")}
              className="w-full py-6 px-8 bg-transparent border-2 border-white text-white text-2xl font-bold rounded-lg transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'profile')}
            </button>

            <button
              onClick={() => router.push("/trueSettings")}
              className="w-full py-6 px-8 bg-purple-600 border-2 border-white text-white text-2xl font-bold rounded-lg cursor-default"
            >
              {t(lang, 'settings')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex xl:hidden w-full h-screen min-h-screen items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">

          <div className="text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">
            <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-wider uppercase mb-4 sm:mb-6 text-shadow-lg">
              SETTINGS
            </h1>
            <div className="w-16 sm:w-20 md:w-24 lg:w-28 h-1 sm:h-1.5 md:h-2 bg-purple-500 mx-auto rounded-full"></div>
          </div>

          <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">

            <div className="w-full">
              <button
                onClick={() => router.push("/friends")}
                className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/60 border-3 border-blue-500 text-blue-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-blue-500/20 hover:scale-105 hover:border-blue-400 shadow-lg shadow-blue-500/20"
              >
                {t(lang, 'friends').toUpperCase()}
              </button>
            </div>

            <div className="w-full">
              <button
                onClick={() => router.push("/profile")}
                className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/60 border-3 border-green-500 text-green-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-green-500/20 hover:scale-105 hover:border-green-400 shadow-lg shadow-green-500/20"
              >
                {t(lang, 'profile').toUpperCase()}
              </button>
            </div>

            <div className="w-full">
              <button
                onClick={() => router.push("/trueSettings")}
                className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-purple-600/80 border-3 border-purple-400 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/30"
              >
                {t(lang, 'settings').toUpperCase()}
              </button>
            </div>
          </div>

          <div className="text-center mt-8 sm:mt-12 md:mt-16 lg:mt-20">
            <p className="text-white/70 text-xs sm:text-sm md:text-base lg:text-lg font-medium backdrop-blur-sm bg-black/30 rounded-full px-4 sm:px-6 md:px-8 lg:px-10 py-2 sm:py-3 md:py-4 lg:py-5 inline-block border border-white/20">
              Game available on desktop only
            </p>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}