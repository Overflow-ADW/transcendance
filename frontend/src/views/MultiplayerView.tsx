"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';

interface Player {
  id: number;
  name: string;
  color: string;
  isHost: boolean;
}

interface EmptySlot {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isEmpty: true;
}

type GameSlot = Player | EmptySlot;

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}

const AddPlayerModal = ({ isOpen, onClose, onAdd }: AddPlayerModalProps) => {
  const [playerName, setPlayerName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onAdd(playerName.trim());
      setPlayerName("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">Add Player</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-black text-sm font-bold mb-2">
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
              required
              maxLength={15}
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function MultiplayerView() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const playerColors = ["#2323FF", "#8A00C4", "#FFD700"];

  useEffect(() => {
    let currentUser = null;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        currentUser = JSON.parse(storedUser);
      }
    } catch (e) {
      console.warn('Erreur lors de la récupération des données utilisateur:', e);
    }

    const savedPlayers = localStorage.getItem('multiplayer-players');

    if (savedPlayers && currentUser) {
      try {
        const parsedPlayers = JSON.parse(savedPlayers);

        const hostName = currentUser.display_name || currentUser.username || "YOU";

        if (parsedPlayers.length > 0 && parsedPlayers[0].isHost) {
          parsedPlayers[0].name = hostName;
          setPlayers(parsedPlayers);
          localStorage.setItem('multiplayer-players', JSON.stringify(parsedPlayers));
        } else {
          const defaultPlayers = [{ id: 1, name: hostName, color: "#2323FF", isHost: true }];
          setPlayers(defaultPlayers);
          localStorage.setItem('multiplayer-players', JSON.stringify(defaultPlayers));
        }
      } catch (e) {
        console.warn('Erreur lors du parsing des joueurs sauvegardés:', e);
        const hostName = currentUser.display_name || currentUser.username || "YOU";
        const defaultPlayers = [{ id: 1, name: hostName, color: "#2323FF", isHost: true }];
        setPlayers(defaultPlayers);
        localStorage.setItem('multiplayer-players', JSON.stringify(defaultPlayers));
      }
    } else {
      const hostName = currentUser?.display_name || currentUser?.username || "YOU";
      const defaultPlayers = [{ id: 1, name: hostName, color: "#2323FF", isHost: true }];
      setPlayers(defaultPlayers);
      localStorage.setItem('multiplayer-players', JSON.stringify(defaultPlayers));
    }
  }, []);

  const addPlayer = () => {
    if (players.length < 3) {
      setShowAddModal(true);
    }
  };

  const handleAddPlayer = (name: string) => {
    if (players.length < 3) {
      const newPlayer: Player = {
        id: players.length + 1,
        name: name.toUpperCase(),
        color: playerColors[players.length],
        isHost: false
      };

      const newPlayers = [...players, newPlayer];
      setPlayers(newPlayers);
      localStorage.setItem('multiplayer-players', JSON.stringify(newPlayers));
    }
    setShowAddModal(false);
  };

  const removePlayer = (id: number) => {
    if (players.length > 1 && id > 1) {
      const newPlayers = players.filter(p => p.id !== id);
      setPlayers(newPlayers);
      localStorage.setItem('multiplayer-players', JSON.stringify(newPlayers));
    }
  };

  const slots: GameSlot[] = Array.from({ length: 3 }, (_, i) => {
    const player = players[i];
    return player || { id: `empty-${i}`, name: "INVITE PLAYER", color: "", isHost: false, isEmpty: true };
  });

  return (
    <GradientBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white text-center tracking-wider">
            MULTIPLAYER
          </h1>
          <p className="text-xl text-white/70 text-center mt-2">3 Players Local</p>
        </div>

        <div className="mb-12">
          <div className="flex justify-center gap-6 mb-6">
            {slots.slice(0, 2).map((slot, index) => (
              <div key={slot.id} className="relative">
                {'isEmpty' in slot ? (
                  <button
                    onClick={addPlayer}
                    className="bg-white text-black border-4 border-white rounded-3xl px-12 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 hover:bg-gray-100 min-w-[280px] h-[100px] flex items-center justify-center"
                  >
                    + INVITE PLAYER
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      className="border-4 rounded-3xl px-12 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 min-w-[280px] h-[100px] flex items-center justify-center"
                      style={{
                        backgroundColor: `${slot.color}20`,
                        borderColor: slot.color,
                        color: slot.color
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <span>{slot.name}</span>
                        {slot.isHost && (
                          <span className="text-xs mt-1 opacity-80">HOST</span>
                        )}
                        <span className="text-xs mt-1 opacity-60">
                          Player {index + 1}
                        </span>
                      </div>
                    </button>

                    {slot.id > 1 && (
                      <button
                        onClick={() => removePlayer(slot.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            {slots.slice(2, 3).map((slot, index) => (
              <div key={slot.id} className="relative">
                {'isEmpty' in slot ? (
                  <button
                    onClick={addPlayer}
                    className="bg-white text-black border-4 border-white rounded-3xl px-12 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 hover:bg-gray-100 min-w-[280px] h-[100px] flex items-center justify-center"
                  >
                    + INVITE PLAYER
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      className="border-4 rounded-3xl px-12 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 min-w-[280px] h-[100px] flex items-center justify-center"
                      style={{
                        backgroundColor: `${slot.color}20`,
                        borderColor: slot.color,
                        color: slot.color
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <span>{slot.name}</span>
                        {slot.isHost && (
                          <span className="text-xs mt-1 opacity-80">HOST</span>
                        )}
                        <span className="text-xs mt-1 opacity-60">
                          Player {index + 3}
                        </span>
                      </div>
                    </button>

                    {slot.id > 1 && (
                      <button
                        onClick={() => removePlayer(slot.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          {players.length < 3 && (
            <div className="text-center">
              <p className="text-white/70 text-lg mb-2">
                Waiting for players... ({players.length}/3)
              </p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          {players.length === 3 && (
            <div className="text-center">
              <p className="text-green-400 text-lg font-bold mb-2">
                ✓ All players ready! (3/3)
              </p>
              <p className="text-white/60 text-sm">Ready to start the game</p>
            </div>
          )}
        </div>

        {/* Game Info */}
        {players.length === 3 && (
          <div className="mb-8 p-4 bg-black/50 border-2 border-yellow-400/50 rounded-lg">
            <h3 className="text-yellow-400 font-bold text-center mb-2">GAME MODE</h3>
            <p className="text-white/80 text-center text-sm">
              3-Player Battle • Local Multiplayer
            </p>
          </div>
        )}

        <div className="flex gap-6">
          <button
            onClick={() => {
              if (players.length === 3) {
                localStorage.setItem('multiplayer-players', JSON.stringify(players));
                localStorage.setItem('game-mode', 'multiplayer');
                router.push("/game");
              }
            }}
            className={`px-12 py-4 rounded-full text-2xl font-bold transition-all duration-300 ${players.length === 3
              ? 'bg-transparent border-4 border-green-400 text-green-400 hover:bg-green-400 hover:text-black hover:scale-105'
              : 'bg-gray-600 border-4 border-gray-500 text-gray-400 cursor-not-allowed'
              }`}
            disabled={players.length !== 3}
          >
            {players.length === 3 ? 'START GAME' : `WAITING (${players.length}/3)`}
          </button>

          <button
            onClick={() => router.push("/play")}
            className="bg-transparent border-4 border-yellow-400 text-yellow-400 px-12 py-4 rounded-full text-2xl font-bold transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:scale-105"
          >
            BACK
          </button>
        </div>

        <div className="mt-8 max-w-2xl text-center">
          <h4 className="text-white font-bold mb-2">HOW TO PLAY</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/70">
            <div>
              <span className="font-bold text-blue-400">Player 1:</span> W/S keys
            </div>
            <div>
              <span className="font-bold text-purple-400">Player 2:</span> O/L keys
            </div>
            <div>
              <span className="font-bold text-yellow-400">Player 3:</span> I/K keys
            </div>
          </div>
          <p className="text-white/50 text-xs mt-4">Last player standing wins!</p>
        </div>

        <AddPlayerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPlayer}
        />
      </div>
    </GradientBackground>
  );
}