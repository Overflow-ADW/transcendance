// src/views/LoginView.tsx
"use client";

import { useEffect, useState } from "react";
import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import PongCanvas from "@/components/pongs/PongCanvas";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useAuth } from "@/lib_front/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginView() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Version simple pour le premier rendu (évite les warnings d'hydratation)
  if (!mounted) {
    return (
      <div className="w-screen h-screen overflow-hidden relative">
        <main className="w-full h-full flex">
          <aside className="w-1/2 h-full bg-black flex" />
          <section className="w-1/2 h-full bg-blue-600 flex items-center justify-center p-8" />
        </main>
      </div>
    );
  }

  // Version complète après hydratation
  return <LoginViewContent />;
}

function LoginViewContent() {
  const router = useRouter();
  const { lang, addNotification } = useApp();
  const { login, user } = useAuth();

  // États du formulaire
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user) {
      router.push("/settings");
    }
  }, [user, router]);

  // Petite validation locale
  const validate = () => {
    return username.trim().length >= 3 && password.length >= 6;
  };

  // Soumission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!validate()) {
      setFormError("Username must be at least 3 characters and password at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ username, password });
      if (result.success) {
        addNotification && addNotification({
          type: "success",
          message: "Connexion réussie ! Bienvenue.",
        });
        router.push("/settings");
      } else if (result.requires2FA) {
        // TODO: gérer la 2FA si besoin
        setFormError("Two-factor authentication required.");
      } else {
        setFormError(result.error || "Login failed");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Animation Pong en arrière-plan (toujours en plein écran) */}
      <div className="absolute inset-0 w-full h-full">
        <PongCanvas />
      </div>

      {/* Overlay avec opacité pour lisibilité sur mobile/tablet */}
      <div className="absolute inset-0 bg-black/40 xl:bg-transparent"></div>

      <main className="relative z-10 w-full h-full flex">
        
        {/* Version Desktop (xl et plus) - Layout 2 colonnes */}
        <div className="hidden xl:flex w-screen h-screen">
          {/* ============ COLONNE GAUCHE ============ */}
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
                    active={true}
                  />
                </li>
                <li>
                  <MenuButton
                    label={t(lang, "settings")}
                    onClick={() => router.push("/trueSettings")}
                    variant="default"
                  />
                </li>
              </ul>
            </div>
          </aside>

          {/* ============ COLONNE DROITE ============ */}
          <section className="w-1/2 h-screen bg-blue-600 flex items-center justify-center p-8 flex-shrink-0">
            <form
              className="w-full max-w-md space-y-6 bg-black/80 backdrop-blur-sm p-8 rounded-lg border border-white/20"
              onSubmit={onSubmit}
              noValidate
            >
              <h1 className="text-white text-3xl font-bold text-center mb-8">
                Welcome Back
              </h1>

              {formError && (
                <div className="p-3 rounded-md border border-red-500/50 bg-red-500/10 text-red-300 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Username"
                  className="w-full p-4 rounded-lg bg-gray-800/90 text-white border border-gray-600 focus:border-purple-400 focus:outline-none transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-4 rounded-lg bg-gray-800/90 text-white border border-gray-600 focus:border-purple-400 focus:outline-none transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors text-lg mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  onClick={() => router.push("/signin")}
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Version Mobile/Tablet (jusqu'à 1024px) - Formulaire centré avec animation en arrière-plan */}
        <div className="flex xl:hidden w-full h-full min-h-screen items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
            
            {/* Titre Welcome */}
            <div className="text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">
              <button
                type="button"
                className="w-full py-4 sm:py-6 md:py-8 lg:py-10 px-6 sm:px-8 md:px-10 lg:px-12 bg-black/80 border-4 border-purple-600 text-yellow-300 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wider rounded-md uppercase backdrop-blur-sm transition-all duration-300 hover:scale-105"
                onClick={() => router.push("/")}
              >
                LOGIN
              </button>
            </div>

            {/* Formulaire de connexion */}
            <form
              className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10"
              onSubmit={onSubmit}
              noValidate
            >
              {formError && (
                <div className="p-3 sm:p-4 rounded-md border border-red-500/50 bg-red-500/10 text-red-300 text-sm sm:text-base backdrop-blur-sm">
                  {formError}
                </div>
              )}

              <div className="w-full">
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Username"
                  className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/80 border-3 border-blue-500 text-blue-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 focus:bg-blue-500/20 focus:scale-105 focus:border-blue-400 focus:outline-none placeholder-blue-400/60"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              
              <div className="w-full">
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/80 border-3 border-purple-500 text-purple-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 focus:bg-purple-500/20 focus:scale-105 focus:border-purple-400 focus:outline-none placeholder-purple-400/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="w-full">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/80 border-3 border-green-500 text-green-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-green-500/20 hover:scale-105 hover:border-green-400 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? "LOGGING IN..." : "LOGIN"}
                </button>
              </div>
            </form>

            {/* Navigation */}
            <div className="text-center space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
              <button
                type="button"
                className="w-full py-2 sm:py-3 md:py-4 lg:py-6 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/60 border-2 border-yellow-500/60 text-yellow-300/80 text-sm sm:text-base md:text-lg lg:text-xl font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-yellow-500/10 hover:scale-105 hover:border-yellow-400"
                onClick={() => router.push("/signin")}
              >
                Don't have an account? Sign up
              </button>
              
              {/* Logo ou branding en bas */}
              <p className="text-white/60 text-xs sm:text-sm md:text-base lg:text-lg font-medium backdrop-blur-sm bg-black/40 rounded-full px-3 sm:px-4 md:px-6 lg:px-8 py-1 sm:py-2 md:py-3 lg:py-4 inline-block">
                PONG ULTIMATE
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}