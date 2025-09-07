// src/views/SignInView.tsx
"use client";

import { useEffect, useState } from "react";
import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useRouter } from "next/navigation";

type SignInSuccessBody = {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
};

type SignInErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
const REGISTER_ENDPOINT = `${API_BASE}/api/auth/register`; // Utilisation de la route correcte avec /api

export default function SignInView() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Version simple pour le premier rendu (évite les warnings d'hydratation)
  if (!mounted) {
    return (
      <div className="fixed inset-0">
        <main className="w-full h-full flex">
          <aside className="w-1/2 h-full bg-black flex">
            <div className="m-auto w-full max-w-[520px] px-8">
              <div className="mb-16">
                <button
                  type="button"
                  className="w-full py-8 px-10 bg-black border-4 border-purple-600 text-yellow-300 text-5xl font-black tracking-wider rounded-md uppercase"
                >
                  welcome
                </button>
              </div>
              <ul className="space-y-10 list-none">
                <li>
                  <button className="w-full py-6 px-8 text-2xl font-bold rounded-lg border-2 bg-black border-white text-white">
                    sign in
                  </button>
                </li>
                <li>
                  <button className="w-full py-6 px-8 text-2xl font-bold rounded-lg border-2 bg-black border-white text-white">
                    login
                  </button>
                </li>
                <li>
                  <button className="w-full py-6 px-8 text-2xl font-bold rounded-lg border-2 bg-black border-white text-white">
                    settings
                  </button>
                </li>
              </ul>
            </div>
          </aside>
          <section className="w-1/2 h-full bg-blue-600 flex items-center justify-center">
            <div className="text-white text-xl">Loading...</div>
          </section>
        </main>
      </div>
    );
  }

  // Version complète après hydratation
  return <SignInViewContent />;
}

function SignInViewContent() {
  const router = useRouter();
  const { lang, addNotification } = useApp();

  // États du formulaire
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Validation locale — même philosophie que pour le Login
  const validate = () => {
    const errors: Record<string, string[]> = {};

    if (!username || username.trim().length < 3) {
      errors.username = ["Username must be at least 3 characters"];
    }
    if (!password || password.length < 6) {
      errors.password = ["Password must be at least 6 characters"];
    }
    if (confirm !== password) {
      errors.confirm = ["Passwords do not match"];
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pas d'email, on travaille en username + password
        body: JSON.stringify({ username, password }),
      });

      let data: SignInSuccessBody | SignInErrorBody | null = null;
      try {
        data = (await res.json()) as SignInSuccessBody | SignInErrorBody;
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 422 || res.status === 409) {
          // 409 si username déjà pris, selon ton backend
          const message =
            (data as SignInErrorBody)?.message ||
            "Registration failed. Please check your information.";
          setFormError(message);
          const errors = (data as SignInErrorBody)?.errors || {};
          setFieldErrors(errors);
        } else {
          setFormError(
            (data as SignInErrorBody)?.message ||
              `Server error (${res.status}). Please try again later.`
          );
        }
        return;
      }

      const { accessToken, refreshToken } = (data || {}) as SignInSuccessBody;

      if (!accessToken) {
        setFormError(
          "Sign up succeeded but no token received. Please contact support."
        );
        return;
      }

      // Stockage token — cohérent avec LoginView
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // Notification succès et redirection vers login
      addNotification && addNotification({
        type: "success",
        message: "Compte créé avec succès ! Connecte-toi pour continuer.",
      });
      router.push("/login");
    } catch (err) {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0">
      <BackButton label={t(lang, "return")} />

      <main className="w-full h-full flex">
        {/* ============ COLONNE GAUCHE - MENU ============ */}
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
                  active={true}
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

        {/* ============ COLONNE DROITE - FORMULAIRE SIGN IN ============ */}
        <section className="w-1/2 h-full bg-blue-600 flex items-center justify-center p-8">
          <form
            className="w-full max-w-md space-y-6 bg-black/80 backdrop-blur-sm p-8 rounded-lg border border-white/20"
            onSubmit={onSubmit}
            noValidate
          >
            <h1 className="text-white text-3xl font-bold text-center mb-8">
              Create Account
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

            {/* Email supprimé — on ne l'utilise pas */}

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

            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                className={`w-full p-4 rounded-lg bg-gray-800/90 text-white border ${
                  fieldErrors.confirm ? "border-red-500" : "border-gray-600"
                } focus:border-purple-400 focus:outline-none transition-colors`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {fieldErrors.confirm && (
                <p className="mt-1 text-xs text-red-400">
                  {fieldErrors.confirm.join(", ")}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors text-lg mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                className="text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => router.push("/login")}
              >
                Already have an account? Login
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
