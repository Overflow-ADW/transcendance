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
    <div className="fixed inset-0 relative">
      {/* Animation Pong en arrière-plan (toujours en plein écran) */}
      <div className="absolute inset-0 w-full h-full">
        <PongCanvas />
      </div>

      {/* Overlay avec opacité pour lisibilité sur mobile/tablet */}
      <div className="absolute inset-0 bg-black/40 md:bg-transparent"></div>

      {/* Pas de bouton retour sur la home */}
      <BackButton label={t(lang, "return")} hidden />

      {/* Contenu principal */}
      <main className="relative z-10 w-full h-full flex">
        
        {/* Version Desktop (md et plus) - Layout original 2 colonnes */}
        <div className="hidden md:flex w-full h-full">
          {/* ============ COLONNE GAUCHE ============ */}
          <aside className="w-1/2 h-full bg-black flex">
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
                    label="sign in" 
                    onClick={() => router.push("/signin")}  
                    variant="holographic"
                  />
                </li>
                <li>
                  <MenuButton 
                    label="login" 
                    onClick={() => router.push("/login")}   
                    variant="holographic"
                  />
                </li>
                <li>
                  <MenuButton
                    label={t(lang, "settings")}
                    onClick={() => router.push("/settings")} 
                    variant="default"
                  />
                </li>
              </ul>
            </div>
          </aside>

          {/* ============ COLONNE DROITE ============ */}
          <section className="w-1/2 h-full bg-blue-600">
            <PongCanvas />
          </section>
        </div>

        {/* Version Mobile/Tablet (sm et md) - Boutons centrés avec animation en arrière-plan */}
        <div className="flex md:hidden w-full h-full min-h-screen items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
            
            {/* Titre Welcome */}
            <div className="text-center mb-8 sm:mb-12">
              <button
                type="button"
                className="w-full py-4 sm:py-6 px-6 sm:px-8 bg-black/80 border-4 border-purple-600 text-yellow-300 text-2xl sm:text-3xl md:text-4xl font-black tracking-wider rounded-md uppercase backdrop-blur-sm"
                onClick={() => router.push("/")} 
              >
                {t(lang, "welcome")}
              </button>
            </div>

            {/* Menu Buttons */}
            <div className="space-y-4 sm:space-y-6">
              <div className="w-full">
                <button
                  onClick={() => router.push("/signin")}
                  className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-black/80 border-3 border-purple-500 text-purple-300 text-lg sm:text-xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-purple-500/20 hover:scale-105 hover:border-purple-400"
                >
                  SIGN IN
                </button>
              </div>
              
              <div className="w-full">
                <button
                  onClick={() => router.push("/login")}
                  className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-black/80 border-3 border-blue-500 text-blue-300 text-lg sm:text-xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-blue-500/20 hover:scale-105 hover:border-blue-400"
                >
                  LOGIN
                </button>
              </div>
              
              <div className="w-full">
                <button
                  onClick={() => router.push("/settings")}
                  className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-black/80 border-3 border-yellow-500 text-yellow-300 text-lg sm:text-xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-yellow-500/20 hover:scale-105 hover:border-yellow-400"
                >
                  {t(lang, "settings").toUpperCase()}
                </button>
              </div>
            </div>

            {/* Logo ou branding en bas (optionnel) */}
            <div className="text-center mt-8 sm:mt-12">
              <p className="text-white/60 text-xs sm:text-sm font-medium backdrop-blur-sm bg-black/40 rounded-full px-3 sm:px-4 py-1 sm:py-2 inline-block">
                PONG ULTIMATE
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}