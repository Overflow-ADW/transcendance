"use client";
import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from "@/lib_front/AuthContext";
import { apiClient } from "@/lib_front/api";
import { withProtectedRoute } from "@/lib_front/routeProtection";
import { useApp } from "@/lib_front/store";
import { t } from "@/lib_front/i18n";

function ProfileView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  const { lang } = useApp();
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
        vsAI: number;
        vsPlayers: number;
        tournaments: number;
      };
      gamesByType?: {
        vsAI: number;
        vsPlayers: number;
        tournaments: number;
      };
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

  const navigateToUserProfile = async (username: string) => {
    try {
      if (username === 'IA' || username === 'AI') return; // Don't navigate for AI opponents
      
      // First search for the user to get their ID
      const searchResponse = await apiClient.searchUsers(username, 1);
      if (searchResponse.results.length > 0) {
        const foundUser = searchResponse.results.find(user => 
          user.username.toLowerCase() === username.toLowerCase() || 
          user.display_name?.toLowerCase() === username.toLowerCase()
        );
        
        if (foundUser) {
          router.push(`/profile?userId=${foundUser.id}`);
        }
      }
    } catch (error) {
      console.error('Error navigating to user profile:', error);
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, loading, router, user]);

  const fetchUserProfile = async () => {
    try {
      let data;
      if (isVisitorProfile) {
        data = await apiClient.getPublicProfile(parseInt(visitedUserId!));
      } else {
        data = await apiClient.getProfile();
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid profile data received');
      }

      const finalProfile = {
        ...data,
        display_name: data.display_name || undefined,
        avatar_url: data.avatar_url || data.avatar || "",
        isOwn: !isVisitorProfile,
        winrates: data.stats?.winRates ? [
          { value: data.stats.winRates.vsAI, label: t(lang, 'winrateVsIA'), color: 'bg-blue-600' },
          { value: data.stats.winRates.vsPlayers, label: t(lang, 'winrateVsPlayer'), color: 'bg-green-600' },
          { value: data.stats.winRates.tournaments, label: t(lang, 'tournament'), color: 'bg-purple-600' }
        ] : [],
        matches: data.recentGames ? data.recentGames.map((game: any) => ({
          id: game.id,
          opponent: game.opponent_display_name || game.opponent_username || 'IA',
          result: game.result,
          mode: game.game_mode,
          score: `${game.user_score}-${game.opponent_score}`,
          date: game.created_at
        })) : []
      };

      setProfile(finalProfile);
      setAvatarURL(data.avatar_url || data.avatar || "");
      setProfileError(null);
    } catch (error: any) {
      setProfileError(error?.message || String(error));
    }
  };

  const updateAvatar = async (newAvatarURL: string) => {
    setIsSavingAvatar(true);
    try {
      await apiClient.updateProfile({ avatar: newAvatarURL });
      setProfile((prev: any) => prev ? { ...prev, avatar: newAvatarURL } : null);
      setAvatarURL(newAvatarURL);
      alert('Avatar updated successfully!');
    } catch (error) {
      alert('Failed to update avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      setIsLoading(true);
      fetchUserProfile().finally(() => {
        setIsLoading(false);
      });
    }
  }, [loading, isAuthenticated, user, visitedUserId]);

  if (loading) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Loading authentication...</h2>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Loading profile...</h2>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (!profile) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Failed to load profile</h2>
            {profileError && (
              <div className="mb-4 p-3 bg-red-900/60 text-red-300 rounded-lg border border-red-500/40">
                <strong>Error:</strong> {profileError}
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => {
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

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        <div className="flex-1 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
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
                      {profile.areWeFriends ? `✓ ${t(lang, 'friend')}` : `👤 ${t(lang, 'visitor')}`}
                    </div>
                  )}
                </div>

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
                          setProfile({
                            ...profile,
                            avatar_url: response.avatarUrl
                          });
                          setAvatarURL(response.avatarUrl);
                          if (tempPreviewURL) {
                            URL.revokeObjectURL(tempPreviewURL);
                          }
                          setTempPreviewURL(null);
                          setSelectedFile(null);
                        }
                      } catch (error: any) {
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
                        if (tempPreviewURL) {
                          URL.revokeObjectURL(tempPreviewURL);
                        }
                        setTempPreviewURL(null);
                        setSelectedFile(null);
                      } catch (error: any) {
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

            <div className="flex flex-col space-y-4">
              {profile.stats && (
                <div className="bg-black border-4 border-green-400 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-green-400 text-center mb-4">
                    {t(lang, 'gameStatistics')}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">{profile.stats.gamesPlayed}</div>
                      <div className="text-xs text-green-400 uppercase">{t(lang, 'gamesPlayed')}</div>
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

              <div className="bg-black border-4 border-purple-400 rounded-lg p-6 flex-shrink-0">
                <h2 className="text-xl font-bold text-purple-400 text-center mb-4">                    {t(lang, 'winRates')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {profile.winrates && profile.winrates.length > 0 ? (
                    profile.winrates.map((w: any, index: number) => (
                      <div key={index} className="text-center">
                        <div className={`w-16 h-16 mx-auto rounded-lg ${w.color || 'bg-purple-600'} flex items-center justify-center mb-2`}>
                          <span className="text-xl font-bold text-white">
                            {w.label === t(lang, 'tournament') ? w.value : `${w.value}%`}
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

              <div className="bg-black border-4 border-blue-400 rounded-lg p-6 flex flex-col" style={{ height: '35vh' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-blue-400 text-center">
                    {t(lang, 'matchHistory')}
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

                <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-blue-400/10 border-2 border-blue-400/30 rounded-lg flex-shrink-0">
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    {t(lang, 'opponent')}
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    Score
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    {t(lang, 'result')}
                  </div>
                  <div className="text-center font-bold text-blue-400 uppercase text-xs">
                    {t(lang, 'mode')}
                  </div>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {profile && Array.isArray(profile.matches) && profile.matches.length > 0 ? (
                    profile.matches.map((match: any, index: number) => (
                      <div
                        key={match.id}
                        className="grid grid-cols-4 gap-2 p-3 bg-gray-800/80 border border-gray-600/50 rounded-lg hover:bg-gray-700/80 transition-colors shadow-lg"
                      >
                        <div className="text-center font-medium text-sm truncate">
                          {match.opponent === 'IA' || match.opponent === 'AI' ? (
                            <span className="text-white">{match.opponent}</span>
                          ) : (
                            <button
                              onClick={() => navigateToUserProfile(match.opponent)}
                              className="text-blue-300 hover:text-blue-100 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0 font-medium text-sm"
                              title={`Voir le profil de ${match.opponent}`}
                            >
                              {match.opponent}
                            </button>
                          )}
                        </div>
                        <div className="text-center text-gray-200 text-sm font-mono font-bold">
                          {match.score || '-'}
                        </div>
                        <div className={`text-center font-bold uppercase text-sm ${match.result === "win" ? "text-green-400" : "text-red-400"
                          }`}>
                          {match.result}
                        </div>
                        <div className="text-center text-blue-300 text-xs capitalize font-medium">
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

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Bouton PLAY masqué sur mobile et iPad (moins de 1024px) */}
                {!isVisitorProfile && (
                  <button
                    onClick={() => router.push("/play")}
                    className="hidden lg:block px-8 py-3 bg-transparent border-4 border-green-400 text-green-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-green-400 hover:text-black hover:scale-105"
                  >
                    {t(lang, 'play').toUpperCase()}
                  </button>
                )}
                {!isVisitorProfile && (
                  <button
                    onClick={() => router.push("/trueSettings")}
                    className="px-8 py-3 bg-transparent border-4 border-purple-400 text-purple-400 text-lg font-bold rounded-lg transition-all duration-300 hover:bg-purple-400 hover:text-white hover:scale-105"
                  >
                    {t(lang, 'settings').toUpperCase()}
                  </button>
                )}
                <button
                  onClick={() => router.push("/friends")}
                  className="px-8 py-3 bg-transparent border-4 border-white text-white text-lg font-bold rounded-lg transition-all duration-300 hover:bg-white hover:text-black hover:scale-105"
                >
                  {t(lang, 'friends').toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}

export default withProtectedRoute(ProfileView);