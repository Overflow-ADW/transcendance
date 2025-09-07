"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useRouter } from 'next/navigation';

interface WinRate {
  label: string;
  value: number;
  color: string;
}

interface Match {
  id: string;
  opponent: string;
  result: 'win' | 'loss';
  mode: string;
  date: string;
}

interface UserProfile {
  id: string;
  username: string;
  avatarURL: string;
  winrates: WinRate[];
  matches: Match[];
}

export default function ProfileView() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarURL, setAvatarURL] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Fonctions pour les appels API
  const fetchUserProfile = async () => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/user/profile');
      // const data = await response.json();
      // setProfile(data);
      // setAvatarURL(data.avatarURL || "");

      // Simulation temporaire - remplacer par les vraies données du backend
      const mockProfile: UserProfile = {
        id: "12345",
        username: "PLAYER_NAME",
        avatarURL: "",
        winrates: [],
        matches: []
      };
      setProfile(mockProfile);
      setAvatarURL(mockProfile.avatarURL);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const updateAvatar = async (newAvatarURL: string) => {
    setIsSavingAvatar(true);
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/user/avatar', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ avatarURL: newAvatarURL })
      // });
      // 
      // if (response.ok) {
      //   setProfile(prev => prev ? { ...prev, avatarURL: newAvatarURL } : null);
      //   alert('Avatar updated successfully!');
      // } else {
      //   throw new Error('Failed to update avatar');
      // }

      // Simulation temporaire
      console.log('Updating avatar:', newAvatarURL);
      if (profile) {
        setProfile({ ...profile, avatarURL: newAvatarURL });
      }
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/user/stats');
      // const data = await response.json();
      // 
      // setProfile(prev => prev ? {
      //   ...prev,
      //   winrates: data.winrates
      // } : null);

      // Simulation temporaire
      console.log('Fetching user stats...');
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchMatchHistory = async () => {
    try {
      // TODO: Remplacer par votre appel API
      // const response = await fetch('/api/user/matches');
      // const data = await response.json();
      // 
      // setProfile(prev => prev ? {
      //   ...prev,
      //   matches: data.matches
      // } : null);

      // Simulation temporaire
      console.log('Fetching match history...');
    } catch (error) {
      console.error('Error fetching match history:', error);
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchUserStats(),
        fetchMatchHistory()
      ]);
      setIsLoading(false);
    };

    loadProfileData();
  }, []);

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Loading profile...</h2>
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
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Failed to load profile</h2>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="min-h-screen h-screen p-4 flex flex-col">
        {/* Container principal */}
        <div className="flex-1 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            
            {/* Section gauche - Avatar avec ID */}
            <div className="flex flex-col">
              <div className="bg-black border-4 border-white rounded-lg p-6 flex-1">
                <div className="bg-white/10 border-2 border-white rounded-lg p-4 text-center mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-wider uppercase">
                    #{profile.id}
                  </span>
                </div>
                <AvatarUploader
                  value={avatarURL}
                  onPickTemp={(url) => setAvatarURL(url)}
                  onSave={() => updateAvatar(avatarURL)}
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
                  {profile.winrates.length > 0 ? (
                    profile.winrates.map((w, index) => (
                      <div key={index} className="text-center">
                        <div className={`w-16 h-16 mx-auto rounded-lg ${w.color} flex items-center justify-center mb-2`}>
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
                  {profile.matches.length > 0 ? (
                    profile.matches.map((match) => (
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