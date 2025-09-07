"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib_front/AuthContext";
import { apiClient } from "@/lib_front/api";

export default function ProfileView() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  interface Profile {
    id: number;
    username: string;
    display_name?: string;
    avatar_url?: string;
    winrates?: Array<{ value: number; label: string; color?: string }>;
    matches?: Array<{ id: number; opponent: string; result: string; mode: string }>;
  }
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarURL, setAvatarURL] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 🔥 DEBUG: Log de tous les états au début
  console.log("🔥 ProfileView Render - États:", {
    user,
    isAuthenticated,
    loading,
    profile,
    isLoading,
    profileError,
    token: apiClient.getToken(),
    localStorage_user: typeof window !== 'undefined' ? localStorage.getItem('user') : null,
    localStorage_token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  });

  // 🔥 DEBUG: Vérification de l'authentification avec logs détaillés
  useEffect(() => {
    console.log("🔥 Auth Check useEffect triggered:", {
      loading,
      isAuthenticated,
      user,
      willRedirect: !loading && !isAuthenticated
    });

    // Attendre que le loading soit terminé avant de rediriger
    if (!loading && !isAuthenticated) {
      console.log("🚨 REDIRECTION vers /login - Raison: !loading && !isAuthenticated");
      console.log("🚨 État détaillé:", {
        loading,
        isAuthenticated,
        user,
        hasToken: !!apiClient.getToken()
      });
      router.push('/login');
      return;
    }

    if (!loading && isAuthenticated && user) {
      console.log("✅ Utilisateur authentifié, profil peut être chargé");
    }
  }, [isAuthenticated, loading, router, user]);

  // Récupérer le profil utilisateur depuis le backend
  const fetchUserProfile = async () => {
    console.log("🔄 fetchUserProfile - Début");
    console.log("🔄 Token disponible:", !!apiClient.getToken());
    console.log("🔄 User authentifié:", isAuthenticated);
    
    try {
      console.log("🔄 Appel apiClient.getProfile()...");
      const data = await apiClient.getProfile();
      console.log("✅ Profil récupéré avec succès:", data);
      
      // Vérifions si nous avons bien reçu les données
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid profile data received');
      }

      // Log pour debug
      console.log("📝 Display name:", data.display_name);
      console.log("📝 Username:", data.username);
      
      setProfile({
        ...data,
        display_name: data.display_name || undefined,
        avatar_url: data.avatar_url || data.avatar || ""
      });
      setAvatarURL(data.avatar_url || data.avatar || "");
      setProfileError(null);
    } catch (error: any) {
      console.error('🚨 Erreur fetchUserProfile:', error);
      console.error('🚨 Détails erreur:', {
        message: error?.message,
        status: error?.status,
        response: error?.response,
        stack: error?.stack
      });
      setProfileError(error?.message || String(error));
    }
  };

  const updateAvatar = async (newAvatarURL: string) => {
    console.log("🔄 updateAvatar - Début:", newAvatarURL);
    setIsSavingAvatar(true);
    
    try {
      console.log("🔄 Appel apiClient.updateProfile()...");
      await apiClient.updateProfile({ avatar: newAvatarURL });
      console.log("✅ Avatar mis à jour avec succès");
      
      setProfile((prev: any) => prev ? { ...prev, avatar: newAvatarURL } : null);
      setAvatarURL(newAvatarURL);
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('🚨 Erreur updateAvatar:', error);
      alert('Failed to update avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // 🔥 DEBUG: Effect pour charger le profil avec logs détaillés
  useEffect(() => {
    console.log("🔄 Profile Loading useEffect triggered");
    console.log("🔄 Conditions:", {
      loading,
      isAuthenticated,
      user,
      shouldLoadProfile: !loading && isAuthenticated && user
    });

    // Ne charger le profil que si l'auth est confirmée
    if (!loading && isAuthenticated && user) {
      console.log("🔄 Conditions remplies, chargement du profil...");
      setIsLoading(true);
      fetchUserProfile().finally(() => {
        console.log("🔄 fetchUserProfile terminé, setIsLoading(false)");
        setIsLoading(false);
      });
    } else {
      console.log("🔄 Conditions non remplies, pas de chargement du profil");
    }
  }, [loading, isAuthenticated, user]);

  // 🔥 DEBUG: État de chargement avec plus d'infos
  if (loading) {
    console.log("🔄 Affichage: Loading auth...");
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Loading authentication...</h2>
            <div className="text-sm text-white/60 mb-4">
              Auth loading: {loading ? 'true' : 'false'}<br/>
              Is authenticated: {isAuthenticated ? 'true' : 'false'}<br/>
              Has user: {user ? 'true' : 'false'}<br/>
              Has token: {apiClient.getToken() ? 'true' : 'false'}
            </div>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (isLoading) {
    console.log("🔄 Affichage: Loading profile...");
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Loading profile...</h2>
            <div className="text-sm text-white/60 mb-4">
              Profile loading: {isLoading ? 'true' : 'false'}<br/>
              Auth loading: {loading ? 'true' : 'false'}<br/>
              Is authenticated: {isAuthenticated ? 'true' : 'false'}<br/>
              Has user: {user ? 'true' : 'false'}
            </div>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (!profile) {
    console.log("🚨 Affichage: Échec du chargement du profil");
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Failed to load profile</h2>
            <div className="text-sm text-white/60 mb-4">
              Auth states:<br/>
              - loading: {loading ? 'true' : 'false'}<br/>
              - isAuthenticated: {isAuthenticated ? 'true' : 'false'}<br/>
              - user: {user ? user.username : 'null'}<br/>
              - token: {apiClient.getToken() ? 'exists' : 'missing'}
            </div>
            {profileError && (
              <div className="mb-4 p-3 bg-red-900/60 text-red-300 rounded-lg border border-red-500/40">
                <strong>Error:</strong> {profileError}
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  console.log("🔄 Retry button clicked");
                  window.location.reload();
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  console.log("🔄 Manual profile fetch");
                  setIsLoading(true);
                  fetchUserProfile().finally(() => setIsLoading(false));
                }}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Retry Profile
              </button>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  console.log("✅ Affichage: Profil chargé avec succès");

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        {/* Debug info en haut */}
        <div className="bg-black/50 text-white text-xs p-2 mb-4 rounded">
          <strong>Debug Info:</strong> Auth: {isAuthenticated ? '✅' : '❌'} | 
          User: {user?.username || 'None'} | 
          Profile: {profile?.username || 'None'} | 
          Token: {apiClient.getToken() ? '✅' : '❌'}
        </div>

        {/* Container principal */}
        <div className="flex-1 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Section gauche - Avatar avec username */}
            <div className="flex flex-col">
              <div className="bg-black border-4 border-white rounded-lg p-6 flex-1">
                <div className="bg-white/10 border-2 border-white rounded-lg p-4 text-center mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-wider uppercase">
                    {profile.display_name || profile.username}
                  </span>
                  {profile.display_name && (
                    <div className="text-sm text-white/60 mt-1">
                      @{profile.username}
                    </div>
                  )}
                </div>
                <AvatarUploader
                  value={avatarURL}
                  onPickTemp={(url) => setAvatarURL(url)}
                  onSave={async () => {
                    try {
                      setIsSavingAvatar(true);
                      const response = await apiClient.uploadAvatar(avatarURL);
                      if (response.avatarUrl && profile) {
                        setProfile({
                          ...profile,
                          avatar_url: response.avatarUrl
                        });
                      }
                    } catch (error) {
                      console.error('Error updating avatar:', error);
                      alert('Failed to update avatar');
                    } finally {
                      setIsSavingAvatar(false);
                    }
                  }}
                  pickLabel="Pick Photo"
                  saveLabel={isSavingAvatar ? "Saving..." : "Save"}
                />
              </div>
            </div>

            {/* Section droite */}
            <div className="flex flex-col space-y-4">
              {/* Win Rates */}
              <div className="bg-black border-4 border-purple-400 rounded-lg p-6 flex-shrink-0">
                <h2 className="text-xl font-bold text-purple-400 text-center mb-4">
                  WIN RATES
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {profile.winrates && profile.winrates.length > 0 ? (
                    profile.winrates.map((w: any, index: number) => (
                      <div key={index} className="text-center">
                        <div className={`w-16 h-16 mx-auto rounded-lg ${w.color || 'bg-purple-600'} flex items-center justify-center mb-2`}>
                          <span className="text-xl font-bold text-white">{w.value}%</span>
                        </div>
                        <div className="text-xs text-white/80 font-medium">{w.label}</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-purple-400/60 py-4">
                      <p>No stats available</p>
                      <p className="text-sm mt-1">Play some games to see your win rates!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Match History */}
              <div className="bg-black border-4 border-blue-400 rounded-lg p-6 flex flex-col" style={{height: '30vh'}}>
                <h2 className="text-xl font-bold text-blue-400 text-center mb-4">
                  MATCH HISTORY
                </h2>
                {/* Header du tableau */}
                <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-blue-400/10 border-2 border-blue-400/30 rounded-lg flex-shrink-0">
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Opponents
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Results
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Mode
                  </div>
                </div>
                {/* Matches */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {profile.matches && profile.matches.length > 0 ? (
                    profile.matches.map((match: any) => (
                      <div key={match.id} className="grid grid-cols-3 gap-2 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="text-center text-white text-sm">
                          {match.opponent}
                        </div>
                        <div className={`text-center font-bold uppercase text-sm ${
                          match.result === "win" ? "text-green-400" : "text-red-400"
                        }`}>
                          {match.result}
                        </div>
                        <div className="text-center text-white/80 text-xs">
                          {match.mode}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-white/60">
                        <p className="text-lg">No matches yet</p>
                        <p className="text-sm mt-2">Start playing!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push("/play")}
                  className="px-8 py-3 bg-transparent border-4 border-yellow-400 text-yellow-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:scale-105"
                >
                  PLAY
                </button>
                <button
                  onClick={() => router.push("/trueSettings")}
                  className="px-8 py-3 bg-transparent border-4 border-purple-400 text-purple-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-purple-400 hover:text-white hover:scale-105"
                >
                  SETTINGS
                </button>
                <button
                  onClick={() => router.push("/friends")}
                  className="px-8 py-3 bg-transparent border-4 border-white text-white text-lg font-bold rounded-lg transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
                >
                  FRIENDS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}