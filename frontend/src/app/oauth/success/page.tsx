// app/oauth/success/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib_front/api";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        // Récupère les paramètres de l'URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const refresh = params.get("refresh");
        const provider = params.get("provider");
        const errorParam = params.get("error");

        if (errorParam) {
          console.error('OAuth Error:', errorParam);
          setError(`Erreur OAuth: ${errorParam}`);
          setTimeout(() => {
            router.replace(`/login?error=oauth_failed&provider=${provider}`);
          }, 2000);
          return;
        }

        if (token && refresh) {
          // Stocker les tokens
          localStorage.setItem("accessToken", token);
          localStorage.setItem("refreshToken", refresh);
          
          // Mettre le token dans l'API client
          apiClient.setToken(token);
          
          // Nettoyer l'URL
          window.history.replaceState({}, document.title, "/oauth/success");
          
          // Petite pause pour que le token soit bien set
          setTimeout(() => {
            // Forcer un rechargement de la page pour réinitialiser l'état d'authentification
            window.location.href = "/settings";
          }, 1000);
        } else {
          console.error('Missing OAuth tokens');
          setError('Tokens OAuth manquants');
          setTimeout(() => {
            router.replace("/login?error=missing_tokens");
          }, 2000);
        }
      } catch (err) {
        console.error('OAuth Success Error:', err);
        setError('Erreur lors du traitement OAuth');
        setTimeout(() => {
          router.replace("/login?error=oauth_processing_failed");
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    // Attendre que le composant soit monté côté client
    if (typeof window !== 'undefined') {
      handleOAuthSuccess();
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-blue-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4 text-white">Connexion en cours...</h1>
          <p className="text-gray-300">Merci de patienter, vous allez être redirigé.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-900 to-purple-900">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4 text-white">Erreur OAuth</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-400">Redirection automatique vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-900 to-blue-900">
      <div className="text-center">
        <div className="text-green-400 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-4 text-white">Connexion réussie !</h1>
        <p className="text-gray-300">Redirection en cours...</p>
      </div>
    </div>
  );
}
