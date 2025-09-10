// pages/oauth/success.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OAuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Récupère les paramètres de l'URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refresh = params.get("refresh");
    const provider = params.get("provider");

    if (token) {
      localStorage.setItem("accessToken", token);
    }
    if (refresh) {
      localStorage.setItem("refreshToken", refresh);
    }

    // Redirige vers la page de settings ou d'accueil
    router.replace("/settings");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Connexion en cours...</h1>
      <p>Merci de patienter, vous allez être redirigé.</p>
    </div>
  );
}
