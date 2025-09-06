// src/views/LoginView.tsx
"use client";

import { useEffect, useState } from "react";
import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';

export default function LoginView() {
  const [mounted, setMounted] = useState(false); // ← AJOUTÉ
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Version simple pour le premier rendu
  if (!mounted) {
    return (
      <div className="fixed inset-0">
        {/* ... votre code inchangé ... */}
      </div>
    );
  }

  // Version complète après hydratation
  return <LoginViewContent />;
}

function LoginViewContent() {
  const router = useRouter(); // ← AJOUTÉ
  const { lang } = useApp();  // ← MODIFIÉ (supprimé navigate)

  return (
    <div className="fixed inset-0">
      <BackButton label={t(lang, "return")} onClick={() => router.push("/")} />
      
      <main className="w-full h-full flex">
        <aside className="w-1/2 h-full bg-black flex">
          <div className="m-auto w-full max-w-[520px] px-8">
            <div className="mb-16">
              <button
                type="button"
                className="w-full py-8 px-10 bg-black border-4 border-purple-600 text-yellow-300 text-5xl font-black tracking-wider rounded-md uppercase"
                onClick={() => router.push("/")} // ← MODIFIÉ
              >
                {t(lang, "welcome")}
              </button>
            </div>

            <ul className="space-y-10 list-none">
              <li>
                <MenuButton 
                  label="sign in" 
                  onClick={() => router.push("/signin")} // ← MODIFIÉ
                  variant="holographic"
                />
              </li>
              <li>
                <MenuButton 
                  label="login" 
                  onClick={() => router.push("/login")} // ← MODIFIÉ
                  variant="holographic"
                  active={true}
                />
              </li>
              <li>
                <MenuButton
                  label={t(lang, "settings")}
                  onClick={() => router.push("/settings")} // ← MODIFIÉ
                  variant="default"
                />
              </li>
            </ul>
          </div>
        </aside>

        <section className="w-1/2 h-full bg-blue-600 flex items-center justify-center p-8">
          <form className="w-full max-w-md space-y-6 bg-black/80 backdrop-blur-sm p-8 rounded-lg border border-white/20">
            <h1 className="text-white text-3xl font-bold text-center mb-8">Welcome Back</h1>
            
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-4 rounded-lg bg-gray-800/90 text-white border border-gray-600 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full p-4 rounded-lg bg-gray-800/90 text-white border border-gray-600 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors text-lg mt-6"
              onClick={(e) => {
                e.preventDefault();
                router.push("/profile"); // ← MODIFIÉ
              }}
            >
              Login
            </button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => router.push("/signin")} // ← MODIFIÉ
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}