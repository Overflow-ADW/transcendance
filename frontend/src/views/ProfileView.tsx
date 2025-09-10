"use client";

// TEST HOT RELOAD - Ce commentaire test le hot reload

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from "@/lib_front/AuthContext";
import { apiClient } from "@/lib_front/api";
import { withProtectedRoute } from "@/lib_front/routeProtection";

function ProfileView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  
  // Récupérer l'ID utilisateur depuis les paramètres de recherche
  const visitedUserId = searchParams?.get('userId');
  const isVisitorProfile = visitedUserId && parseInt(visitedUserId) !== user?.id;
  
  interface Profile {
    id: number;
    username: string;
    display_name?: string;
    avatar_url?: string;
    winrate?: number;
    isOwn?: boolean;
    areWeFriends?: boolean;
    stats?: {
      friends: number;
      gamesPlayed: number;
      gamesWon: number;
      gamesLost: number;
      gamesDrawn: number;
      ongoingGames: number;
      winrate: number;
      avgDuration: number;
      highestScore: number;
      winRates?: {
        vsAI: number;        // Win rate VS IA (%)
        vsPlayers: number;   // Win rate VS Autres joueurs (%)
        tournaments: number; // Nombre de tournois gagnés
      };
      gamesByType?: {
        vsAI: number;        // Nombre de jeux VS IA
        vsPlayers: number;   // Nombre de jeux VS joueurs
        tournaments: number; // Nombre de tournois participés
      };
      // Legacy compatibility
      gamesModes?: {
        classic: number;
        custom: number;
      };
    };
    recentGames?: Array<{
      id: number;
      opponent_username: string;
      opponent_display_name: string;
      result: string;
      user_score: number;
      opponent_score: number;
      game_mode: string;
      created_at: string;
    }>;
    // Legacy support pour le moment
    winrates?: Array<{ value: number; label: string; color?: string }>;
    matches?: Array<{ id: number; opponent: string; result: string; mode: string }>;
  }
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarURL, setAvatarURL] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tempPreviewURL, setTempPreviewURL] = useState<string | null>(null);
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
    console.log("🔄 Profil visiteur ?", isVisitorProfile);
    console.log("🔄 Visited User ID:", visitedUserId);
    
    try {
      let data;
      
      if (isVisitorProfile) {
        console.log("🔄 Appel apiClient.getPublicProfile()...");
        data = await apiClient.getPublicProfile(parseInt(visitedUserId!));
        console.log("✅ Profil public récupéré avec succès:", data);
      } else {
        console.log("🔄 Appel apiClient.getProfile()...");
        data = await apiClient.getProfile();
        console.log("✅ Profil personnel récupéré avec succès:", data);
      }
      
      // Vérifions si nous avons bien reçu les données
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid profile data received');
      }

      // Log pour debug
      console.log("📝 Display name:", data.display_name);
      console.log("📝 Username:", data.username);
      console.log("📝 Recent Games:", data.recentGames);
      console.log("📝 Is Own Profile:", data.isOwn);
      console.log("📝 Are We Friends:", data.areWeFriends);
      console.log("📝 Recent Games détaillées:");
      data.recentGames?.forEach((game: any, i: number) => {
        console.log(`  ${i+1}. ID: ${game.id}, mode: ${game.game_mode}, opponent: ${game.opponent_username || 'IA'}`);
      });
      console.log("📝 Stats:", data.stats);
      
      setProfile({
        ...data,
        display_name: data.display_name || undefined,
        avatar_url: data.avatar_url || data.avatar || "",
        isOwn: !isVisitorProfile, // Profil personnel si pas un profil visiteur
        // Transformer les données pour compatibilité legacy avec nouveaux win rates
        winrates: data.stats?.winRates ? [
          { value: data.stats.winRates.vsAI, label: 'VS IA', color: 'bg-blue-600' },
          { value: data.stats.winRates.vsPlayers, label: 'VS Autres joueurs', color: 'bg-green-600' },
          { value: data.stats.winRates.tournaments, label: 'Tournois gagnés', color: 'bg-purple-600' }
        ] : [],
        matches: data.recentGames ? data.recentGames.map((game: any) => ({
          id: game.id,
          opponent: game.opponent_display_name || game.opponent_username || 'IA',
          result: game.result,
          mode: game.game_mode,
          score: `${game.user_score}-${game.opponent_score}`,
          date: game.created_at
        })) : []
      });
      
      // L'avatar URL vient du backend et sera servi par le proxy Nginx
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
      visitedUserId,
      isVisitorProfile,
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
  }, [loading, isAuthenticated, user, visitedUserId]); // Ajouter visitedUserId aux dépendances

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
                  {isVisitorProfile && profile.areWeFriends !== undefined && (
                    <div className="text-sm text-white/80 mt-2 px-3 py-1 bg-white/10 rounded-full inline-block">
                      {profile.areWeFriends ? '✓ Ami' : '👤 Visiteur'}
                    </div>
                  )}
                </div>
                
                {/* Afficher l'AvatarUploader seulement pour son propre profil */}
                {!isVisitorProfile ? (
                  <AvatarUploader
                    value={tempPreviewURL || avatarURL}
                    onPickTemp={(file, url) => {
                      setSelectedFile(file);
                      setTempPreviewURL(url);
                    }}
                    onSave={async () => {
                      if (!selectedFile) return;
                      
                      try {
                        setIsSavingAvatar(true);
                        const response = await apiClient.uploadAvatar(selectedFile);
                        if (response.avatarUrl && profile) {
                          // L'avatar URL vient du backend, on l'utilise tel quel
                          // car Nginx proxy /uploads/ vers le backend
                          setProfile({
                            ...profile,
                            avatar_url: response.avatarUrl
                          });
                          setAvatarURL(response.avatarUrl);
                        
                        // Nettoyer les états temporaires
                        if (tempPreviewURL) {
                          URL.revokeObjectURL(tempPreviewURL);
                        }
                        setTempPreviewURL(null);
                        setSelectedFile(null);
                      }
                    } catch (error: any) {
                      console.error('Error updating avatar:', error);
                      alert(error.message || 'Failed to update avatar');
                    } finally {
                      setIsSavingAvatar(false);
                    }
                  }}
                  onDelete={async () => {
                    if (!avatarURL && !tempPreviewURL) return;
                    
                    try {
                      setIsSavingAvatar(true);
                      await apiClient.deleteAvatar();
                      
                      if (profile) {
                        setProfile({
                          ...profile,
                          avatar_url: undefined
                        });
                      }
                      
                      setAvatarURL("");
                      
                      // Nettoyer les états temporaires
                      if (tempPreviewURL) {
                        URL.revokeObjectURL(tempPreviewURL);
                      }
                      setTempPreviewURL(null);
                      setSelectedFile(null);
                      
                    } catch (error: any) {
                      console.error('Error deleting avatar:', error);
                      alert(error.message || 'Failed to delete avatar');
                    } finally {
                      setIsSavingAvatar(false);
                    }
                  }}
                  pickLabel="Pick Photo"
                  saveLabel={isSavingAvatar ? "Saving..." : "Save"}
                  deleteLabel="Remove"
                />
                ) : (
                  /* Pour les profils visiteurs, afficher seulement l'avatar en lecture seule */
                  <div className="text-center">
                    <div className="mx-auto w-32 h-32 bg-white/10 border-2 border-white/20 rounded-lg overflow-hidden mb-4">
                      {avatarURL ? (
                        <img 
                          src={avatarURL} 
                          alt={`Avatar de ${profile.display_name || profile.username}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/60 text-4xl">
                          👤
                        </div>
                      )}
                    </div>
                    {profile.areWeFriends === false && (
                      <p className="text-white/60 text-sm">
                        Ajoutez {profile.display_name || profile.username} en ami pour voir plus de détails
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section droite */}
            <div className="flex flex-col space-y-4">
              {/* Statistics Summary */}
              {profile.stats && (
                <div className="bg-black border-4 border-green-400 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-green-400 text-center mb-4">
                    GAME STATISTICS
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">{profile.stats.gamesPlayed}</div>
                      <div className="text-xs text-green-400 uppercase">Games Played</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{profile.stats.gamesWon}</div>
                      <div className="text-xs text-green-400 uppercase">Wins</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-400">{profile.stats.gamesLost}</div>
                      <div className="text-xs text-green-400 uppercase">Losses</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{profile.stats.winrate}%</div>
                      <div className="text-xs text-green-400 uppercase">Win Rate</div>
                    </div>
                  </div>
                  {(profile.stats.avgDuration > 0 || profile.stats.highestScore > 0) && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-green-400/20 text-center">
                      {profile.stats.avgDuration > 0 && (
                        <div>
                          <div className="text-xl font-bold text-white">{Math.floor(profile.stats.avgDuration / 60)}m {profile.stats.avgDuration % 60}s</div>
                          <div className="text-xs text-green-400 uppercase">Avg Duration</div>
                        </div>
                      )}
                      {profile.stats.highestScore > 0 && (
                        <div>
                          <div className="text-xl font-bold text-yellow-400">{profile.stats.highestScore}</div>
                          <div className="text-xs text-green-400 uppercase">Best Score</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                          <span className="text-xl font-bold text-white">
                            {w.label === 'Tournois gagnés' ? w.value : `${w.value}%`}
                          </span>
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
              <div className="bg-black border-4 border-blue-400 rounded-lg p-6 flex flex-col" style={{height: '35vh'}}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-blue-400 text-center">
                    MATCH HISTORY
                  </h2>
                  {!isVisitorProfile && (
                    <button
                      onClick={() => router.push("/history")}
                      className="px-4 py-2 bg-blue-500/20 border border-blue-400 text-blue-400 text-sm font-bold rounded-lg transition-all duration-300 hover:bg-blue-400 hover:text-white hover:scale-105"
                    >
                      📜 SEE ALL
                    </button>
                  )}
                </div>
                {/* Header du tableau */}
                <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-blue-400/10 border-2 border-blue-400/30 rounded-lg flex-shrink-0">
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Opponent
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Score
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Result
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Mode
                  </div>
                </div>
                {/* Matches */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {profile.matches && profile.matches.length > 0 ? (
                    profile.matches.map((match: any) => (
                      <div key={match.id} className="grid grid-cols-4 gap-2 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="text-center text-white text-sm truncate">
                          {match.opponent}
                        </div>
                        <div className="text-center text-white text-sm font-mono">
                          {match.score || '-'}
                        </div>
                        <div className={`text-center font-bold uppercase text-sm ${
                          match.result === "win" ? "text-green-400" : "text-red-400"
                        }`}>
                          {match.result}
                        </div>
                        <div className="text-center text-white/80 text-xs capitalize">
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
                {!isVisitorProfile && (
                  <button
                    onClick={() => router.push("/play")}
                    className="px-8 py-3 bg-transparent border-4 border-green-400 text-green-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-green-400 hover:text-black hover:scale-105"
                  >
                    PLAY
                  </button>
                )}
                {!isVisitorProfile && (
                  <button
                    onClick={() => router.push("/trueSettings")}
                    className="px-8 py-3 bg-transparent border-4 border-purple-400 text-purple-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-purple-400 hover:text-white hover:scale-105"
                  >
                    SETTINGS
                  </button>
                )}
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

// Exporter le composant avec la protection de route
export default withProtectedRoute(ProfileView);