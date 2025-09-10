// src/views/TournamentView.tsx
"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib_front/AuthContext";
import { apiClient } from "@/lib_front/api";

type TournamentPlayer = {
  id: number;
  name: string;
  color: string;
  isMainPlayer?: boolean;
};

type EmptySlot = {
  id: string;
  name: string;
  color: string;
  isEmpty: true;
};

type TournamentSlot = TournamentPlayer | EmptySlot;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => void;
}

const SearchPlayerModal = ({ isOpen, onClose, onSelect, currentPlayers }: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (player: any) => void;
  currentPlayers: TournamentPlayer[];
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const searchUsers = async () => {
        try {
          setIsSearching(true);
          const response = await apiClient.searchUsers(searchQuery);
          const filteredResults = response.results.filter((result: { id: number }) =>
            !currentPlayers.some(player => player.id === result.id)
          );
          setSearchResults(filteredResults);
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setIsSearching(false);
        }
      };

      const timeoutId = setTimeout(searchUsers, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentPlayers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">Add Player</h2>
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="text-center py-4 text-gray-500">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left transition-colors"
                >
                  <div className="font-semibold text-black">{user.display_name || user.username}</div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-4 text-gray-500">No users found</div>
          ) : (
            <div className="text-center py-4 text-gray-500">Type at least 2 characters to search</div>
          )}
        </div>

        {selectedUser && (
          <div className="mt-4 border-t pt-4">
            <div className="mb-4">
              <div className="font-semibold text-black mb-2">Selected Player:</div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <div className="font-semibold">{selectedUser.display_name || selectedUser.username}</div>
                <div className="text-sm text-gray-500">@{selectedUser.username}</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verify Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
                placeholder="Enter password to verify"
              />
              {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setPassword("");
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsVerifying(true);
                    setError(null);

                    const result = await apiClient.verifyPassword({
                      username: selectedUser.username,
                      password: password
                    });

                    if (result.success) {
                      onSelect(selectedUser);
                      setSelectedUser(null);
                      setPassword("");
                      setError(null);
                      onClose();
                    } else {
                      setError('Invalid password');
                    }
                  } catch (err) {
                    setError('Failed to verify password');
                  } finally {
                    setIsVerifying(false);
                  }
                }}
                disabled={!password || isVerifying}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Add'}
              </button>
            </div>
          </div>
        )}

        {!selectedUser && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TournamentView() {
  const router = useRouter();
  const { lang } = useApp();
  const { user } = useAuth();
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const colors = ["#8A00C4", "#2323FF", "#FF6B35", "#28A745"];

  useEffect(() => {
    if (user && players.length === 0) {
      setPlayers([{
        id: user.id,
        name: user.display_name || user.username,
        color: colors[0],
        isMainPlayer: true
      }]);
    }
  }, [user]);

  const handleAddPlayer = (newPlayer: any) => {
    if (players.length < 4 && !players.find(p => p.id === newPlayer.id)) {
      const playerToAdd = {
        id: newPlayer.id,
        name: newPlayer.display_name || newPlayer.username,
        color: colors[players.length],
        isMainPlayer: false
      };

      setPlayers(currentPlayers => {
        if (currentPlayers.length === 0) {
          return [playerToAdd];
        }
        const mainPlayerIndex = currentPlayers.findIndex(p => p.isMainPlayer);
        if (mainPlayerIndex === -1) {
          return [...currentPlayers, playerToAdd];
        }
        const newPlayers = [...currentPlayers];
        newPlayers.splice(mainPlayerIndex + 1, 0, playerToAdd);
        return newPlayers;
      });
    }
  };

  const handleStartTournament = async () => {
    if (players.length < 2) {
      return;
    }

    try {
      const tournamentResponse = await apiClient.createTournament({
        name: `Tournoi de ${user?.display_name || user?.username}`,
        description: `Tournoi avec ${players.length} joueurs`,
        maxPlayers: 4,
        format: 'elimination'
      });

      if (!tournamentResponse.tournament) {
        throw new Error('Erreur lors de la création du tournoi');
      }

      const tournamentId = tournamentResponse.tournament.id;

      for (const player of players) {
        if (player.id !== user?.id) {
          await apiClient.addTournamentParticipant(tournamentId, player.id);
        }
      }

      const startResponse = await apiClient.startTournament(tournamentId);

      localStorage.setItem('current-tournament-id', tournamentId.toString());
      localStorage.setItem('tournament-players', JSON.stringify(players));

      router.push("/tournament-bracket");
    } catch (error) {
      console.error('Erreur lors du démarrage du tournoi:', error);
    }
  };

  const removePlayer = (id: number) => {
    if (id !== user?.id) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };





  return (
    <GradientBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        <div className="mb-16">
          <h1 className="text-6xl font-bold text-white text-center tracking-wider">
            TOURNAMENT
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-16">
          {Array.from({ length: 4 }).map((_, index) => {
            const player = players[index];
            return (
              <div key={index} className="relative">
                {player ? (
                  <div className="relative">
                    <button
                      className="bg-blue-600/20 border-blue-400 text-blue-400 border-4 rounded-3xl px-16 py-8 text-2xl font-bold transition-all duration-300 hover:scale-105 min-w-[300px] h-[120px] flex items-center justify-center"
                      style={{ borderColor: player.color, color: player.color }}
                    >
                      {player.name}
                    </button>
                    {index !== 0 && (
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="bg-white text-black border-4 border-white rounded-3xl px-16 py-8 text-2xl font-bold transition-all duration-300 hover:scale-105 hover:bg-gray-100 min-w-[300px] h-[120px] flex items-center justify-center"
                    disabled={!user}
                  >
                    ADD PLAYER +
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <button
            onClick={() => {
              if (players.length >= 2) {
                handleStartTournament();
              }
            }}
            className={`bg-transparent border-4 border-yellow-400 px-16 py-4 rounded-full text-3xl font-bold transition-all duration-300 hover:scale-105 ${players.length >= 2
                ? "text-yellow-400 hover:bg-yellow-400 hover:text-black"
                : "text-yellow-400/50 border-yellow-400/50 cursor-not-allowed"
              }`}
            disabled={players.length < 2}
          >
            START
          </button>
        </div>

        <SearchPlayerModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelect={handleAddPlayer}
          currentPlayers={players}
        />
      </div>
    </GradientBackground>
  );
}