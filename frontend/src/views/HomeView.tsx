// src/views/HomeView.tsx
"use client";

import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import PongCanvas from "@/components/pongs/PongCanvas";
import { t } from "@/lib_front/i18n";
import { useRouter } from 'next/navigation';
import { useApp } from "@/lib_front/store";

export default function HomeView() {
  const router = useRouter();
  const { lang } = useApp();

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <div className="absolute inset-0 w-full h-full">
        <PongCanvas />
      </div>

      <div className="absolute inset-0 bg-black/40 xl:bg-transparent"></div>

      <BackButton label={t(lang, "return")} hidden />

      <main className="relative z-10 w-full h-full flex">
        <div className="hidden xl:flex w-screen h-screen">
          <aside className="w-1/2 h-screen bg-black flex flex-shrink-0">
            <div className="m-auto w-full max-w-[520px] px-8">
              <div className="mb-16">
                <button
                  type="button"
                  className="w-full py-8 px-10 bg-black border-4 border-purple-600 text-yellow-300 text-5xl font-black tracking-wider rounded-md uppercase"
                  onClick={() => router.push("/")}
                >
                  {t(lang, "welcome")}
                </button>
              </div>

              <ul className="space-y-10 list-none">
                <li>
                  <MenuButton
                    label={t(lang, "signIn")}
                    onClick={() => router.push("/signin")}
                    variant="holographic"
                  />
                </li>
                <li>
                  <MenuButton
                    label={t(lang, "login")}
                    onClick={() => router.push("/login")}
                    variant="holographic"
                  />
                </li>
              </ul>
            </div>
          </aside>

          <section className="w-1/2 h-screen bg-blue-600 flex-shrink-0">
            <PongCanvas />
          </section>
        </div>

        <div className="flex xl:hidden w-full h-full min-h-screen items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">
              <button
                type="button"
                className="w-full py-4 sm:py-6 md:py-8 lg:py-10 px-6 sm:px-8 md:px-10 lg:px-12 bg-black/80 border-4 border-purple-600 text-yellow-300 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wider rounded-md uppercase backdrop-blur-sm transition-all duration-300 hover:scale-105"
                onClick={() => router.push("/")}
              >
                {t(lang, "welcome")}
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
              <div className="w-full">
                <button
                  onClick={() => router.push("/signin")}
                  className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/80 border-3 border-purple-500 text-purple-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-purple-500/20 hover:scale-105 hover:border-purple-400"
                >
                  {t(lang, "signIn").toUpperCase()}
                </button>
              </div>

              <div className="w-full">
                <button
                  onClick={() => router.push("/login")}
                  className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/80 border-3 border-blue-500 text-blue-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-blue-500/20 hover:scale-105 hover:border-blue-400"
                >
                  {t(lang, "login").toUpperCase()}
                </button>
              </div>
            </div>

            <div className="text-center mt-8 sm:mt-12 md:mt-16 lg:mt-20">
              <p className="text-white/60 text-xs sm:text-sm md:text-base lg:text-lg font-medium backdrop-blur-sm bg-black/40 rounded-full px-3 sm:px-4 md:px-6 lg:px-8 py-1 sm:py-2 md:py-3 lg:py-4 inline-block">
                {t(lang, "appTitle")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}