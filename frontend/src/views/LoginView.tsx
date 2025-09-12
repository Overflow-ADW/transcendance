// src/views/LoginView.tsx
"use client";
import { useEffect, useState } from "react";
import { MenuButton } from "@/components/ui/MenuButton";
import { BackButton } from "@/components/ui/BackButton";
import { TwoFactorVerifyModal } from "@/components/ui/TwoFactorVerifyModal";
import PongCanvas from "@/components/pongs/PongCanvas";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useAuth } from "@/lib_front/AuthContext";
import { useRouter } from "next/navigation";
import { withPublicRoute } from "@/lib_front/routeProtection";

function LoginView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  return <LoginViewContent />;
}

function LoginViewContent() {
  const router = useRouter();
  const { lang, addNotification } = useApp();
  const { login, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempUserId, setTempUserId] = useState<number | null>(null);
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const provider = params.get('provider');
    if (error) {
      let errorMessage = "Erreur d'authentification";
      switch (error) {
        case 'oauth_denied':
          errorMessage = `Connexion ${provider} annulée`;
          break;
        case 'oauth_failed':
          errorMessage = `Erreur lors de la connexion ${provider}`;
          break;
        case 'missing_code':
          errorMessage = `Code d'autorisation manquant pour ${provider}`;
          break;
        case 'invalid_state':
          errorMessage = 'Erreur de sécurité OAuth (state invalide)';
          break;
        case 'oauth_setup_failed':
          errorMessage = `Configuration OAuth ${provider} incorrecte`;
          break;
        default:
          errorMessage = params.get('message') || errorMessage;
      }
      setFormError(errorMessage);
      addNotification && addNotification({
        type: "error",
        message: errorMessage,
      });
      window.history.replaceState({}, document.title, '/login');
    }
  }, [addNotification]);

  useEffect(() => {
    if (user) {
      router.push("/settings");
    }
  }, [user, router]);

  const validate = () => {
    return username.trim().length >= 3 && password.length >= 6;
  };

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
        setTempUserId((result as any).tempUserId);
        setPendingLoginData(result);
        setShow2FAModal(true);
      } else {
        setFormError(result.error || "Login failed");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASuccess = (response: any) => {
    if (response.success && response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      addNotification && addNotification({
        type: "success",
        message: "Connexion 2FA réussie ! Bienvenue.",
      });
      setShow2FAModal(false);
      router.push("/settings");
    } else {
      setFormError("2FA verification failed");
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";

  const handleOAuth = (provider: 'google') => {
    if (!API_BASE) {
      setFormError(`Configuration OAuth manquante (NEXT_PUBLIC_API_BASE_URL)`);
      return;
    }
    const oauthUrl = `${API_BASE}/api/oauth/${provider}`;
    sessionStorage.setItem('oauth_provider', provider);
    window.location.href = oauthUrl;
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <div className="absolute inset-0 w-full h-full">
        <PongCanvas />
      </div>
      <div className="absolute inset-0 bg-black/40 xl:bg-transparent"></div>
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
                    active={true}
                  />
                </li>
              </ul>
            </div>
          </aside>
          <section className="w-1/2 h-screen bg-blue-600 flex items-center justify-center p-8 flex-shrink-0">
            <form
              className="w-full max-w-md space-y-6 bg-black/80 backdrop-blur-sm p-8 rounded-lg border border-white/20"
              onSubmit={onSubmit}
              noValidate
            >
              <h1 className="text-white text-3xl font-bold text-center mb-8">
                {t(lang, 'welcomeBack')}
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
                  placeholder={t(lang, "username")}
                  className="w-full p-4 rounded-lg bg-gray-800/90 text-white border border-gray-600 focus:border-purple-400 focus:outline-none transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder={t(lang, "password")}
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
                {isSubmitting ? t(lang, 'loggingIn') : t(lang, 'login')}
              </button>
              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="button"
                  className="w-full py-3 bg-white text-black rounded-lg font-bold border border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2"
                  onClick={() => handleOAuth('google')}
                >
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="w-6 h-6" />
                  {t(lang, "continueWithGoogle")}
                </button>
              </div>
              <div className="text-center mt-4">
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  onClick={() => router.push("/signin")}
                >
                  {t(lang, 'noAccount')}
                </button>
              </div>
            </form>
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
                {t(lang, "login")}
              </button>
            </div>
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
                  placeholder={t(lang, "username")}
                  className="w-full py-3 sm:py-4 md:py-6 lg:py-8 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/80 border-3 border-blue-500 text-blue-300 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold rounded-lg backdrop-blur-sm transition-all duration-300 focus:bg-blue-500/20 focus:scale-105 focus:border-blue-400 focus:outline-none placeholder-blue-400/60"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="w-full">
                <input
                  type="password"
                  placeholder={t(lang, "currentPassword")}
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
                  {isSubmitting ? t(lang, 'loggingIn') : t(lang, 'login')}
                </button>
              </div>
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="button"
                  className="w-full py-3 bg-white text-black rounded-lg font-bold border border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2"
                  onClick={() => handleOAuth('google')}
                >
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="w-6 h-6" />
                  {t(lang, "continueWithGoogle")}
                </button>
              </div>
            </form>
            <div className="text-center space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">                <button
                  type="button"
                  className="w-full py-2 sm:py-3 md:py-4 lg:py-6 px-4 sm:px-6 md:px-8 lg:px-10 bg-black/60 border-2 border-yellow-500/60 text-yellow-300/80 text-sm sm:text-base md:text-lg lg:text-xl font-medium rounded-lg backdrop-blur-sm transition-all duration-300 hover:bg-yellow-500/10 hover:scale-105 hover:border-yellow-400"
                  onClick={() => router.push("/signin")}
                >
                  {t(lang, "noAccount")}
              </button>
              <p className="text-white/60 text-xs sm:text-sm md:text-base lg:text-lg font-medium backdrop-blur-sm bg-black/40 rounded-full px-3 sm:px-4 md:px-6 lg:px-8 py-1 sm:py-2 md:py-3 lg:py-4 inline-block">
                PONG ULTIMATE
              </p>
            </div>
          </div>
        </div>
      </main>
      {show2FAModal && tempUserId && (
        <TwoFactorVerifyModal
          isOpen={show2FAModal}
          onClose={() => {
            setShow2FAModal(false);
            setTempUserId(null);
            setPendingLoginData(null);
          }}
          onSuccess={handle2FASuccess}
          tempUserId={tempUserId}
          username={username}
        />
      )}
    </div>
  );
}

export default withPublicRoute(LoginView);