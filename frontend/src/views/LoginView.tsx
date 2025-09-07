// src/views/LoginView.tsx
"use client";

import { useEffect, useState } from "react";
import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useRouter } from "next/navigation";

type LoginSuccessBody = {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
};

type LoginErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
const LOGIN_ENDPOINT = `${API_BASE}/auth/login`;

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
  const { lang } = useApp(); // on conserve l'i18n existant

  // États du formulaire
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Petite validation locale
  const validate = () => {
    const errors: Record<string, string[]> = {};
    if (!username || username.trim().length < 3) {
      errors.username = ["Username must be at least 3 characters"];
    }
    if (!password || password.length < 6) {
      errors.password = ["Password must be at least 6 characters"];
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // On envoie username/password au backend
        body: JSON.stringify({ username, password }),
      });

      // Tente de décoder le JSON, même en cas d'erreur (pour récupérer message/erreurs)
      let data: LoginSuccessBody | LoginErrorBody | null = null;
      try {
        data = (await res.json()) as LoginSuccessBody | LoginErrorBody;
      } catch {
        data = null;
      }

      if (!res.ok) {
        // Gestion fine des erreurs
        if (res.status === 400 || res.status === 401 || res.status === 422) {
          const message =
            (data as LoginErrorBody)?.message ||
            "Invalid credentials. Please check your username or password.";
          setFormError(message);
          const errors = (data as LoginErrorBody)?.errors || {};
          setFieldErrors(errors);
        } else {
          setFormError(
            (data as LoginErrorBody)?.message ||
              `Server error (${res.status}). Please try again later.`
          );
        }
        return;
      }

      // Succès : on attend accessToken (et optionnellement refreshToken)
      const { accessToken, refreshToken } = (data || {}) as LoginSuccessBody;

      if (!accessToken) {
        // Si le backend ne renvoie pas l'accessToken alors qu'on est en mode token → on considère que c'est une erreur
        setFormError(
          "Login succeeded but no token received. Please contact support."
        );
        return;
      }

      // Stockage côté client (adaptable à ton store global si besoin)
      // ⚠️ HttpOnly cookies sont plus sûrs, mais tu as précisé fonctionner par token
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // Redirection après login
      router.push("/profile");
    } catch (err) {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                className={`w-full p-4 rounded-lg bg-gray-800/90 text-white border ${
                  fieldErrors.username ? "border-red-500" : "border-gray-600"
                } focus:border-purple-400 focus:outline-none transition-colors`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-400">
                  {fieldErrors.username.join(", ")}
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                className={`w-full p-4 rounded-lg bg-gray-800/90 text-white border ${
                  fieldErrors.password ? "border-red-500" : "border-gray-600"
                } focus:border-purple-400 focus:outline-none transition-colors`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {fieldErrors.password.join(", ")}
                </p>
              )}
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
