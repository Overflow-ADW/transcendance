// src/views/GameView.tsx
"use client";

import { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import Pong from "@/game/components/Pong";
import { withProtectedRoute } from "@/lib_front/routeProtection";

interface Player {
  id: number | string;
  name: string;
  color: string;
  isMainPlayer?: boolean;
  isHost?: boolean;
}

function GameView() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameMode, setGameMode] = useState<string>('');

  useEffect(() => {
    const mode = localStorage.getItem('game-mode') || '';
    setGameMode(mode);

    let loadedPlayers: Player[] = [];

    switch (mode) {
      case 'tournament':
        const currentMatch = localStorage.getItem('current-match');
        if (currentMatch) {
          const matchData = JSON.parse(currentMatch);
          if (matchData.player1 && matchData.player2) {
            loadedPlayers = [
              {
                id: matchData.player1.id,
                name: matchData.player1.name || matchData.player1.username,
                color: matchData.player1.color || "#8A00C4",
                isMainPlayer: false
              },
              {
                id: matchData.player2.id,
                name: matchData.player2.name || matchData.player2.username,
                color: matchData.player2.color || "#2323FF",
                isMainPlayer: false
              }
            ];
          }
        } else {
          const tournamentPlayers = localStorage.getItem('tournament-players');
          if (tournamentPlayers) {
            loadedPlayers = JSON.parse(tournamentPlayers);
          }
        }
        break;

      case 'duel':
        const duelPlayers = localStorage.getItem('duel-players');
        if (duelPlayers) {
          loadedPlayers = JSON.parse(duelPlayers);
        }
        break;

      case 'multiplayer':
        const multiplayerPlayers = localStorage.getItem('multiplayer-players');
        if (multiplayerPlayers) {
          loadedPlayers = JSON.parse(multiplayerPlayers);
        }
        break;

      case 'ai':
        const difficulty = localStorage.getItem('ai-difficulty') || 'medium';
        loadedPlayers = [
          { id: 1, name: "YOU", color: "#8A00C4", isMainPlayer: true },
          { id: 2, name: `AI (${difficulty.toUpperCase()})`, color: "#FF6B35" }
        ];
        break;

      default:
        loadedPlayers = [
          { id: 1, name: "PLAYER 1", color: "#8A00C4" },
          { id: 2, name: "PLAYER 2", color: "#2323FF" }
        ];
    }

    setPlayers(loadedPlayers);
  }, []);

  const handleQuit = () => {
    localStorage.removeItem('game-mode');
    localStorage.removeItem('ai-difficulty');
    localStorage.removeItem('current-match');

    router.push('/play');
  };

  const getGameModeTitle = () => {
    switch (gameMode) {
      case 'tournament':
        return 'TOURNAMENT MODE';
      case 'duel':
        return 'DUEL MODE';
      case 'multiplayer':
        return 'MULTIPLAYER MODE (4P)';
      case 'ai':
        const difficulty = localStorage.getItem('ai-difficulty') || 'medium';
        return `VS AI (${difficulty.toUpperCase()})`;
      default:
        return 'GAME MODE';
    }
  };

  return (
    <GradientBackground className="bg-black">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">

        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center tracking-wider">
            {getGameModeTitle()}
          </h1>
        </div>

        <div className="mb-6 w-full max-w-4xl">
          {gameMode === 'multiplayer' ? (
            <div className="grid grid-cols-2 gap-4">
              {players.slice(0, 4).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-center p-3 rounded-lg border-2"
                  style={{
                    backgroundColor: `${player.color}20`,
                    borderColor: player.color,
                    color: player.color
                  }}
                >
                  <div className="text-center">
                    <div className="font-bold text-sm">
                      {player.name}
                    </div>
                    <div className="text-xs opacity-80">
                      Player {index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center gap-8">
              {players.slice(0, 2).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-center p-4 rounded-lg border-2 min-w-[150px]"
                  style={{
                    backgroundColor: `${player.color}20`,
                    borderColor: player.color,
                    color: player.color
                  }}
                >
                  <div className="text-center">
                    <div className="font-bold">
                      {player.name}
                    </div>
                    {player.isHost && (
                      <div className="text-xs opacity-80">HOST</div>
                    )}
                    {player.isMainPlayer && (
                      <div className="text-xs opacity-80">YOU</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8" style={{ width: '60vw', maxWidth: '800px' }}>
          <div className="bg-black border-4 border-white rounded-2xl p-1 relative">
            <div
              className="relative bg-black rounded-xl overflow-hidden"
              style={{ aspectRatio: "16/10" }}
            >
              <Pong />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleQuit}
            className="bg-transparent border-4 border-red-400 text-red-400 px-12 py-3 rounded-full text-xl font-bold transition-all duration-300 hover:bg-red-400 hover:text-white hover:scale-105"
          >
            QUIT GAME
          </button>
        </div>

        {gameMode === 'multiplayer' && (
          <div className="mt-6 text-center">
            <div className="text-white/70 text-sm">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div>
                  <span className="font-bold" style={{ color: players[0]?.color }}>
                    {players[0]?.name}:
                  </span> W/S
                </div>
                <div>
                  <span className="font-bold" style={{ color: players[1]?.color }}>
                    {players[1]?.name}:
                  </span> O/L
                </div>
                <div>
                  <span className="font-bold" style={{ color: players[2]?.color }}>
                    {players[2]?.name}:
                  </span> I/K
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GradientBackground>
  );
}

export default withProtectedRoute(GameView);