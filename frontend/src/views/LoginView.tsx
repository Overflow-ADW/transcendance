// src/views/LoginView.tsx
"use client";

import { useEffect, useState } from "react";
import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
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
      <div className="fixed inset-0">
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
  const { lang, setView } = useApp();
  const { login, user } = useAuth();

  // États du formulaire
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Si l'utilisateur est déjà connecté, rediriger
  useEffect(() => {
    if (user) {
      setView("home");
    }
  }, [user, setView]);

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
      await login({ username, password });
      // La redirection sera gérée par l'effet useEffect ci-dessus
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0">
      <BackButton label={t(lang, "return")} />

      <main className="w-full h-full flex">
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

        <section className="w-1/2 h-full bg-blue-600 flex items-center justify-center p-8">
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
      </main>
    </div>
  );
}