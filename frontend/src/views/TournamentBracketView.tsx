// src/views/TournamentBracketView.tsx
"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import { useApp } from "@/lib_front/store";
import { useState, useEffect } from "react";

interface Player {
  id: number;
  name: string;
  color: string;
}

interface Match {
  id: string;
  player1: Player | null;
  player2: Player | null;
  winner?: Player;
  score?: string;
}

export default function TournamentBracketView() {
  const router = useRouter();
  const { lang } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [semifinals, setSemifinals] = useState<Match[]>([]);
  const [final, setFinal] = useState<Match | null>(null);

  // Charger les joueurs depuis le localStorage au montage du composant
  useEffect(() => {
    const savedPlayers = localStorage.getItem('tournament-players');
    if (savedPlayers) {
      const parsedPlayers = JSON.parse(savedPlayers);
      setPlayers(parsedPlayers);
      generateMatches(parsedPlayers);
    } else {
      // Si aucun joueur sauvegardé, rediriger vers la page tournament
      router.push('/tournament');
    }
  }, [router]);

  const generateMatches = (playerList: Player[]) => {
    if (playerList.length < 2) {
      router.push('/tournament');
      return;
    }

    let matches: Match[] = [];
    let finalMatch: Match;

    if (playerList.length === 2) {
      // Si seulement 2 joueurs, aller directement en finale
      finalMatch = {
        id: "final",
        player1: playerList[0],
        player2: playerList[1]
      };
      setFinal(finalMatch);
      setSemifinals([]);
    } else if (playerList.length === 3) {
      // Si 3 joueurs, un match de demi-finale et le 3ème joueur va directement en finale
      matches = [
        {
          id: "semi1",
          player1: playerList[0],
          player2: playerList[1]
        }
      ];
      
      finalMatch = {
        id: "final",
        player1: null, // Sera le gagnant de semi1
        player2: playerList[2] // Le 3ème joueur va directement en finale
      };
      
      setSemifinals(matches);
      setFinal(finalMatch);
    } else {
      // Si 4 joueurs, deux demi-finales
      matches = [
        {
          id: "semi1",
          player1: playerList[0],
          player2: playerList[1]
        },
        {
          id: "semi2",
          player1: playerList[2],
          player2: playerList[3]
        }
      ];
      
      finalMatch = {
        id: "final",
        player1: null, // Sera le gagnant de semi1
        player2: null  // Sera le gagnant de semi2
      };
      
      setSemifinals(matches);
      setFinal(finalMatch);
    }
  };

  const handlePlayMatch = (matchId: string) => {
    // Sauvegarder l'ID du match en cours pour le récupérer dans le jeu
    localStorage.setItem('current-match', matchId);
    router.push("/game");
  };

  const getPlayerDisplayName = (player: Player | null) => {
    return player ? player.name : "TBD";
  };

  const getPlayerColor = (player: Player | null) => {
    return player ? player.color : "#666666";
  };

  if (players.length === 0) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-press-start text-xl text-white mb-4">
              Chargement du tournoi...
            </h2>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-press-start text-4xl md:text-6xl text-white mb-4 tracking-wider">
            TOURNAMENT
          </h1>
          <h2 className="font-press-start text-xl md:text-2xl text-yellow-400 tracking-wider">
            BRACKET
          </h2>
        </div>

        {/* Bracket Container */}
        <div className="max-w-6xl mx-auto">
          {/* Si seulement 2 joueurs, afficher directement la finale */}
          {players.length === 2 && final ? (
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <h3 className="font-press-start text-lg text-center text-yellow-400 mb-8">
                  FINAL
                </h3>
                
                <div className="bg-black border-4 border-yellow-400 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <span className="font-press-start text-sm text-gray-400">
                      CHAMPIONSHIP
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Player 1 */}
                    <div 
                      className="flex items-center justify-between border-2 rounded p-3"
                      style={{
                        backgroundColor: `${getPlayerColor(final.player1)}20`,
                        borderColor: getPlayerColor(final.player1)
                      }}
                    >
                      <span 
                        className="font-press-start text-sm"
                        style={{ color: getPlayerColor(final.player1) }}
                      >
                        {getPlayerDisplayName(final.player1)}
                      </span>
                      <div 
                        className="w-8 h-8 border-2 rounded flex items-center justify-center"
                        style={{ borderColor: getPlayerColor(final.player1) }}
                      >
                        <span className="font-press-start text-xs text-white">0</span>
                      </div>
                    </div>
                    
                    {/* VS */}
                    <div className="text-center">
                      <span className="font-press-start text-yellow-400 text-lg">VS</span>
                    </div>
                    
                    {/* Player 2 */}
                    <div 
                      className="flex items-center justify-between border-2 rounded p-3"
                      style={{
                        backgroundColor: `${getPlayerColor(final.player2)}20`,
                        borderColor: getPlayerColor(final.player2)
                      }}
                    >
                      <span 
                        className="font-press-start text-sm"
                        style={{ color: getPlayerColor(final.player2) }}
                      >
                        {getPlayerDisplayName(final.player2)}
                      </span>
                      <div 
                        className="w-8 h-8 border-2 rounded flex items-center justify-center"
                        style={{ borderColor: getPlayerColor(final.player2) }}
                      >
                        <span className="font-press-start text-xs text-white">0</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Play Button */}
                  <button 
                    onClick={() => handlePlayMatch(final.id)}
                    className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 border-2 border-green-400 text-white font-press-start text-xs rounded transition-colors"
                  >
                    PLAY
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Affichage normal avec demi-finales et finale */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 items-center">
              
              {/* Semi-Finals */}
              {semifinals.length > 0 && (
                <div className="space-y-8">
                  <h3 className="font-press-start text-lg text-center text-purple-400 mb-8">
                    {players.length === 3 ? "SEMI-FINAL" : "SEMI-FINALS"}
                  </h3>
                  
                  {semifinals.map((match, index) => (
                    <div key={match.id} className="bg-black border-4 border-white rounded-lg p-6">
                      <div className="text-center mb-4">
                        <span className="font-press-start text-sm text-gray-400">
                          MATCH {index + 1}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Player 1 */}
                        <div 
                          className="flex items-center justify-between border-2 rounded p-3"
                          style={{
                            backgroundColor: `${getPlayerColor(match.player1)}20`,
                            borderColor: getPlayerColor(match.player1)
                          }}
                        >
                          <span 
                            className="font-press-start text-sm"
                            style={{ color: getPlayerColor(match.player1) }}
                          >
                            {getPlayerDisplayName(match.player1)}
                          </span>
                          <div 
                            className="w-8 h-8 border-2 rounded flex items-center justify-center"
                            style={{ borderColor: getPlayerColor(match.player1) }}
                          >
                            <span className="font-press-start text-xs text-white">0</span>
                          </div>
                        </div>
                        
                        {/* VS */}
                        <div className="text-center">
                          <span className="font-press-start text-yellow-400 text-lg">VS</span>
                        </div>
                        
                        {/* Player 2 */}
                        <div 
                          className="flex items-center justify-between border-2 rounded p-3"
                          style={{
                            backgroundColor: `${getPlayerColor(match.player2)}20`,
                            borderColor: getPlayerColor(match.player2)
                          }}
                        >
                          <span 
                            className="font-press-start text-sm"
                            style={{ color: getPlayerColor(match.player2) }}
                          >
                            {getPlayerDisplayName(match.player2)}
                          </span>
                          <div 
                            className="w-8 h-8 border-2 rounded flex items-center justify-center"
                            style={{ borderColor: getPlayerColor(match.player2) }}
                          >
                            <span className="font-press-start text-xs text-white">0</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Play Button */}
                      <button 
                        onClick={() => handlePlayMatch(match.id)}
                        className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 border-2 border-green-400 text-white font-press-start text-xs rounded transition-colors"
                      >
                        PLAY
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Connector Lines (Hidden on mobile) */}
              {semifinals.length > 1 && (
                <div className="hidden lg:flex flex-col items-center justify-center">
                  <div className="relative w-full h-64">
                    {/* Top line */}
                    <div className="absolute top-16 left-0 w-1/2 h-0.5 bg-white"></div>
                    <div className="absolute top-16 left-1/2 w-0.5 h-8 bg-white"></div>
                    <div className="absolute top-24 left-1/2 w-1/2 h-0.5 bg-white"></div>
                    
                    {/* Bottom line */}
                    <div className="absolute bottom-16 left-0 w-1/2 h-0.5 bg-white"></div>
                    <div className="absolute bottom-24 left-1/2 w-0.5 h-8 bg-white"></div>
                    <div className="absolute bottom-16 left-1/2 w-1/2 h-0.5 bg-white"></div>
                  </div>
                </div>
              )}

              {/* Final */}
              {final && players.length > 2 && (
                <div className="space-y-8">
                  <h3 className="font-press-start text-lg text-center text-yellow-400 mb-8">
                    FINAL
                  </h3>
                  
                  <div className="bg-black border-4 border-yellow-400 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <span className="font-press-start text-sm text-gray-400">
                        CHAMPIONSHIP
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Winner 1 */}
                      <div 
                        className="flex items-center justify-between border-2 rounded p-3"
                        style={{
                          backgroundColor: final.player1 ? `${getPlayerColor(final.player1)}20` : "#374151",
                          borderColor: getPlayerColor(final.player1)
                        }}
                      >
                        <span 
                          className="font-press-start text-sm"
                          style={{ color: getPlayerColor(final.player1) }}
                        >
                          {getPlayerDisplayName(final.player1) || "WINNER 1"}
                        </span>
                        <div 
                          className="w-8 h-8 border-2 rounded flex items-center justify-center"
                          style={{ borderColor: getPlayerColor(final.player1) }}
                        >
                          <span className="font-press-start text-xs text-white">-</span>
                        </div>
                      </div>
                      
                      {/* VS */}
                      <div className="text-center">
                        <span className="font-press-start text-yellow-400 text-lg">VS</span>
                      </div>
                      
                      {/* Winner 2 */}
                      <div 
                        className="flex items-center justify-between border-2 rounded p-3"
                        style={{
                          backgroundColor: final.player2 ? `${getPlayerColor(final.player2)}20` : "#374151",
                          borderColor: getPlayerColor(final.player2)
                        }}
                      >
                        <span 
                          className="font-press-start text-sm"
                          style={{ color: getPlayerColor(final.player2) }}
                        >
                          {getPlayerDisplayName(final.player2) || "WINNER 2"}
                        </span>
                        <div 
                          className="w-8 h-8 border-2 rounded flex items-center justify-center"
                          style={{ borderColor: getPlayerColor(final.player2) }}
                        >
                          <span className="font-press-start text-xs text-white">-</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Play Button or Locked */}
                    {final.player1 && final.player2 ? (
                      <button 
                        onClick={() => handlePlayMatch(final.id)}
                        className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 border-2 border-green-400 text-white font-press-start text-xs rounded transition-colors"
                      >
                        PLAY
                      </button>
                    ) : (
                      <div className="w-full mt-4 py-3 bg-gray-700 border-2 border-gray-600 text-gray-400 font-press-start text-xs rounded text-center">
                        LOCKED
                      </div>
                    )}
                  </div>

                  {/* Trophy */}
                  <div className="text-center">
                    <div className="inline-block bg-yellow-400 text-black p-4 rounded-lg">
                      <span className="font-press-start text-2xl">🏆</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <button 
            onClick={() => router.push("/tournament")}
            className="px-8 py-4 bg-transparent border-2 border-white text-white font-press-start text-sm rounded-lg hover:bg-white hover:text-black transition-colors"
          >
            BACK TO SETUP
          </button>
          
          <button 
            onClick={() => router.push("/settings")}
            className="px-8 py-4 bg-transparent border-2 border-red-400 text-red-400 font-press-start text-sm rounded-lg hover:bg-red-400 hover:text-white transition-colors"
          >
            EXIT TOURNAMENT
          </button>
        </div>
      </div>
    </GradientBackground>
  );
}