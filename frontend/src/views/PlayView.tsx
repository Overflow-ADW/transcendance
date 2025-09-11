"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';
import { t } from "@/lib_front/i18n";

export default function PlayView() {
  const router = useRouter();
  const { lang } = useApp();

  return (
    <GradientBackground>
      <div className="min-h-screen p-16">

        <div className="w-full h-[calc(100vh-8rem)] rounded-lg flex flex-col justify-center items-center">
          <div className="w-full max-w-2xl px-8 space-y-8">
            <button
              onClick={() => router.push("/chooseIA")}
              className="w-full py-8 px-12 bg-transparent border-2 border-white text-white text-3xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'oneVsIA')}
            </button>

            <button
              onClick={() => router.push("/duel")}
              className="w-full py-8 px-12 bg-transparent border-2 border-white text-white text-3xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'oneVsOne')}
            </button>

            <button
              onClick={() => router.push("/multi")}
              className="w-full py-8 px-12 bg-transparent border-2 border-white text-white text-3xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'multiplayerLocal')}
            </button>

            <button
              onClick={() => router.push("/tournament")}
              className="w-full py-8 px-12 bg-transparent border-2 border-white text-white text-3xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'tournament')}
            </button>

            <button
              onClick={() => router.push("/settings")}
              className="w-full py-8 px-12 bg-transparent border-2 border-white text-white text-3xl font-bold rounded-2xl transition-all duration-300 hover:bg-purple-600"
            >
              {t(lang, 'return')}
            </button>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
