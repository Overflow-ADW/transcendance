// src/views/HomeView.tsx
"use client";

import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import PongCanvas from "@/components/pongs/PongCanvas";
import { t } from "@/lib_front/i18n";
import { useRouter } from 'next/navigation';
import { useApp } from "@/lib_front/store";

export default function HomeView() {
  const router = useRouter();  // ← Déplacé ICI
  const { lang } = useApp();   // ← Gardez juste lang

  return (
    <div className="fixed inset-0">
      {/* pas de bouton retour sur la home */}
      <BackButton label={t(lang, "return")} hidden />

      {/* plein écran direct */}
      <main className="w-full h-full flex">
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

        <section className="w-1/2 h-full bg-blue-600">
          <PongCanvas />
        </section>
      </main>
    </div>
  );
}

