// src/views/GameView.tsx
"use client";

import { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import Pong from "@/game/components/Pong";
import { withProtectedRoute } from "@/lib_front/routeProtection";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";

interface Player {
  id: number | string;
  name: string;
  color: string;
  isMainPlayer?: boolean;
  isHost?: boolean;
  score?: number;
}

function GameView() {
  const router = useRouter();
  const { lang } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameMode, setGameMode] = useState<string>('');
  const [scores, setScores] = useState({ player0: 0, player1: 0 });

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
                isMainPlayer: false,
                score: 0
              },
              {
                id: matchData.player2.id,
                name: matchData.player2.name || matchData.player2.username,
                color: matchData.player2.color || "#2323FF",
                isMainPlayer: false,
                score: 0
              }
            ];
          }
        } else {
          const tournamentPlayers = localStorage.getItem('tournament-players');
          if (tournamentPlayers) {
            loadedPlayers = JSON.parse(tournamentPlayers).map((player: any) => ({
              ...player,
              score: 0
            }));
          }
        }
        break;

      case 'duel':
        const duelPlayers = localStorage.getItem('duel-players');
        if (duelPlayers) {
          loadedPlayers = JSON.parse(duelPlayers).map((player: any) => ({
            ...player,
            score: 0
          }));
        }
        break;

      case 'multiplayer':
        const multiplayerPlayers = localStorage.getItem('multiplayer-players');
        if (multiplayerPlayers) {
          loadedPlayers = JSON.parse(multiplayerPlayers).map((player: any) => ({
            ...player,
            score: 0
          }));
        }
        break;

      case 'ai':
        const difficulty = localStorage.getItem('ai-difficulty') || 'medium';
        loadedPlayers = [
          { id: 1, name: t(lang, "you"), color: "#8A00C4", isMainPlayer: true, score: 0 },
          { id: 2, name: `${t(lang, "ai")} (${t(lang, difficulty)})`, color: "#FF6B35", score: 0 }
        ];
        break;

      default:
        loadedPlayers = [
          { id: 1, name: t(lang, "player1"), color: "#8A00C4", score: 0 },
          { id: 2, name: t(lang, "player2"), color: "#2323FF", score: 0 }
        ];
    }

    setPlayers(loadedPlayers);
  }, [lang]);

  // Set up score event listener
  useEffect(() => {
    const handleScoreChange = (scores: { player0: number; player1: number }) => {
      setScores(scores);

      // Update players with scores
      setPlayers(prev => prev.map((player, index) => ({
        ...player,
        score: index === 0 ? scores.player0 : scores.player1
      })));
    };

    const handleWindowScoreChange = (event: any) => {
      const scores = event.detail || event;
      handleScoreChange(scores);
    };

    // Listen for score changes from the Pong game
    window.addEventListener('scoreChanged', handleWindowScoreChange);

    return () => {
      window.removeEventListener('scoreChanged', handleWindowScoreChange);
    };
  }, []);

  const handleScoreChange = (scores: { player0: number; player1: number }) => {
    setScores(scores);

    // Update players with scores
    setPlayers(prev => prev.map((player, index) => ({
      ...player,
      score: index === 0 ? scores.player0 : scores.player1
    })));
  };

  const handleQuit = () => {
    localStorage.removeItem('game-mode');
    localStorage.removeItem('ai-difficulty');
    localStorage.removeItem('current-match');

    router.push('/play');
  };

  const getGameModeTitle = () => {
    switch (gameMode) {
      case 'tournament':
        return t(lang, 'tournamentMode');
      case 'duel':
        return t(lang, 'duelMode');
      case 'multiplayer':
        return t(lang, 'multiplayerMode');
      case 'ai':
        const difficulty = localStorage.getItem('ai-difficulty') || 'medium';
        return `${t(lang, 'vsAI')} (${t(lang, difficulty)})`;
      default:
        return t(lang, 'gameMode');
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

        <div className="mb-6">
          <button
            onClick={handleQuit}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
          >
            {t(lang, 'quitGame')}
          </button>
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
                      {t(lang, 'player')} {index + 1}
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
                    <div className="font-bold text-lg mb-1">
                      {player.name}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {player.score || 0}
                    </div>
                    {player.isHost && (
                      <div className="text-xs opacity-80">{t(lang, 'host')}</div>
                    )}
                    {player.isMainPlayer && (
                      <div className="text-xs opacity-80">{t(lang, 'you')}</div>
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
              <Pong
                onScoreChange={gameMode !== 'multiplayer' ? handleScoreChange : undefined}
              />
            </div>
          </div>
        </div>

        {gameMode === 'multiplayer' && (
          <div className="mt-6 text-center">
            <div className="text-white/70 text-sm">
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div>
                  <span className="font-bold" style={{ color: players[0]?.color }}>
                    {players[0]?.name}:
                  </span> {t(lang, 'controlsWS')}
                </div>
                <div>
                  <span className="font-bold" style={{ color: players[2]?.color }}>
                    {players[2]?.name}:
                  </span> {t(lang, 'controlsIK')}
                </div>
                <div>
                  <span className="font-bold" style={{ color: players[1]?.color }}>
                    {players[1]?.name}:
                  </span> {t(lang, 'controlsOL')}
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