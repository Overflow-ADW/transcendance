// src/views/TournamentBracketView.tsx
"use client";

import { GradientBackground } from "@/components/ui/GradientBackground";
import { useRouter } from 'next/navigation';
import { useApp } from "@/lib_front/store";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib_front/api";

interface Player {
  id: number;
  name: string;
  color: string;
  username?: string;
  display_name?: string;
}

interface Match {
  id: number;
  player1_id: number;
  player2_id: number;
  player1: Player | null;
  player2: Player | null;
  winner_id?: number;
  winner?: Player;
  score_player1?: number;
  score_player2?: number;
  status: string;
  match_type?: string; // 'semifinal', 'third_place', 'final'
  created_at?: string;
  player1_username?: string;
  player2_username?: string;
  player1_display_name?: string;
  player2_display_name?: string;
}

export default function TournamentBracketView() {
  const router = useRouter();
  const { lang } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const colors = ["#8A00C4", "#2323FF", "#FF6B35", "#28A745"];

  // Charger les données du tournoi depuis la base de données
  useEffect(() => {
    const loadTournamentData = async () => {
      try {
        const storedTournamentId = localStorage.getItem('current-tournament-id');
        const storedPlayers = localStorage.getItem('tournament-players');
        
        if (!storedTournamentId) {
          router.push('/tournament');
          return;
        }

        const id = parseInt(storedTournamentId);
        setTournamentId(id);

        // Charger les joueurs depuis le localStorage (pour les couleurs)
        if (storedPlayers) {
          const parsedPlayers = JSON.parse(storedPlayers);
          setPlayers(parsedPlayers);
        }

        // Charger les matchs depuis la base de données
        const matchesResponse = await apiClient.getTournamentMatches(id);
        const matchesData = matchesResponse.matches || [];
        
        // Enrichir les matchs avec les infos des joueurs
        const enrichedMatches = matchesData.map((match: any) => ({
          ...match,
          player1: match.player1_id ? {
            id: match.player1_id,
            name: match.player1_display_name || match.player1_username,
            username: match.player1_username,
            display_name: match.player1_display_name,
            color: getPlayerColorById(match.player1_id)
          } : null,
          player2: match.player2_id ? {
            id: match.player2_id,
            name: match.player2_display_name || match.player2_username,
            username: match.player2_username,
            display_name: match.player2_display_name,
            color: getPlayerColorById(match.player2_id)
          } : null
        }));

        setMatches(enrichedMatches);
        setLoading(false);

      } catch (error) {
  // console.error removed
        router.push('/tournament');
      }
    };

    loadTournamentData();
  }, [router]);

  // Fonction pour recharger les données du tournoi
  const reloadTournamentData = async () => {
    if (!tournamentId) return;
    
    try {
      setLoading(true);
      // Recharger les matchs depuis la base de données
      const matchesResponse = await apiClient.getTournamentMatches(tournamentId);
      const matchesData = matchesResponse.matches || [];
      // Enrichir les matchs avec les infos des joueurs
      const enrichedMatches = matchesData.map((match: any) => ({
        ...match,
        player1: match.player1_id ? {
          id: match.player1_id,
          name: match.player1_display_name || match.player1_username,
          username: match.player1_username,
          display_name: match.player1_display_name,
          color: getPlayerColorById(match.player1_id)
        } : null,
        player2: match.player2_id ? {
          id: match.player2_id,
          name: match.player2_display_name || match.player2_username,
          username: match.player2_username,
          display_name: match.player2_display_name,
          color: getPlayerColorById(match.player2_id)
        } : null
      }));
      setMatches(enrichedMatches);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  // Écouter les changements de localStorage pour détecter les matchs terminés
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
  // console.log removed
      if (e.key === 'match-completed' && e.newValue === 'true') {
  // console.log removed
        // Un match vient d'être terminé, recharger les données
        setTimeout(() => {
          reloadTournamentData();
          localStorage.removeItem('match-completed');
          // console.log removed
        }, 1000); // Petit délai pour laisser le backend traiter
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier aussi au focus de la fenêtre (quand on revient du jeu)
    const handleFocus = () => {
      const matchCompleted = localStorage.getItem('match-completed');
  // console.log removed
      if (matchCompleted === 'true') {
  // console.log removed
        setTimeout(() => {
          reloadTournamentData();
          localStorage.removeItem('match-completed');
          // console.log removed
        }, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [tournamentId]);

  const getPlayerColorById = (playerId: number) => {
    const playerIndex = players.findIndex(p => p.id === playerId);
    return playerIndex >= 0 ? colors[playerIndex] : colors[0];
  };

  const getPlayerColor = (player: Player | null) => {
    return player ? player.color : "#666666";
  };

  const handlePlayMatch = (match: Match) => {
    if (match.status === 'completed') {
      return; // Match déjà terminé
    }
    // Sauvegarder les infos du match et rediriger vers le jeu
    const matchData = {
      id: match.id,
      tournamentId: tournamentId,
      player1: match.player1,
      player2: match.player2,
      player1_id: match.player1?.id,
      player2_id: match.player2?.id
    };
    localStorage.setItem('current-match', JSON.stringify(matchData));
    localStorage.setItem('game-mode', 'tournament');
    router.push("/game");
  };

  const getDisplayMatches = () => {
    // Organiser les matchs selon leur type et ordre de jeu
    const semifinals = matches
      .filter(m => m.match_type === 'semifinal')
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    const thirdPlace = matches.find(m => m.match_type === 'third_place') || null;
    const final = matches.find(m => m.match_type === 'final') || null;
    
    return { 
      semifinals, 
      thirdPlace, 
      final,
      // Pour compatibilité avec l'ancien code
      nextMatch: thirdPlace?.status === 'waiting' ? thirdPlace : (final?.status === 'waiting' ? final : null)
    };
  };

  const getPlayerDisplayName = (player: Player | null) => {
    return player ? player.name : "TBD";
  };

  if (loading) {
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

  const { semifinals, thirdPlace, final } = getDisplayMatches();

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
          {matches.length === 1 && final ? (
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
                        <span className="font-press-start text-xs text-white">
                          {final.score_player1 || 0}
                        </span>
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
                        <span className="font-press-start text-xs text-white">
                          {final.score_player2 || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bouton de jeu */}
                  <div className="text-center mt-6">
                    <button
                      onClick={() => handlePlayMatch(final)}
                      className={`font-press-start px-6 py-2 rounded border-2 text-sm ${
                        final.status === 'completed'
                          ? 'bg-green-600 border-green-600 text-white cursor-not-allowed'
                          : 'bg-transparent border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'
                      }`}
                      disabled={final.status === 'completed'}
                    >
                      {final.status === 'completed' ? 'TERMINÉ' : 'JOUER'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Layout avec demi-finales, 3ème place et finale */
            <div className="space-y-12">
              {/* Section des demi-finales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Demi-finales */}
                <div className="space-y-8">
                  <h3 className="font-press-start text-lg text-center text-yellow-400 mb-8">
                    SEMI-FINALS
                  </h3>
                  
                  {semifinals.map((match, index) => (
                    <div key={match.id} className="bg-black border-4 border-purple-500 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <span className="font-press-start text-xs text-gray-400">
                          SEMI {index + 1}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Player 1 */}
                        <div 
                          className="flex items-center justify-between border-2 rounded p-2"
                          style={{
                            backgroundColor: `${getPlayerColor(match.player1)}20`,
                            borderColor: getPlayerColor(match.player1)
                          }}
                        >
                          <span 
                            className="font-press-start text-xs"
                            style={{ color: getPlayerColor(match.player1) }}
                          >
                            {getPlayerDisplayName(match.player1)}
                          </span>
                          <div 
                            className="w-6 h-6 border-2 rounded flex items-center justify-center"
                            style={{ borderColor: getPlayerColor(match.player1) }}
                          >
                            <span className="font-press-start text-xs text-white">
                              {match.score_player1 || 0}
                            </span>
                          </div>
                        </div>
                        
                        {/* Player 2 */}
                        <div 
                          className="flex items-center justify-between border-2 rounded p-2"
                          style={{
                            backgroundColor: `${getPlayerColor(match.player2)}20`,
                            borderColor: getPlayerColor(match.player2)
                          }}
                        >
                          <span 
                            className="font-press-start text-xs"
                            style={{ color: getPlayerColor(match.player2) }}
                          >
                            {getPlayerDisplayName(match.player2)}
                          </span>
                          <div 
                            className="w-6 h-6 border-2 rounded flex items-center justify-center"
                            style={{ borderColor: getPlayerColor(match.player2) }}
                          >
                            <span className="font-press-start text-xs text-white">
                              {match.score_player2 || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mt-4">
                        <button
                          onClick={() => handlePlayMatch(match)}
                          className={`font-press-start px-4 py-1 rounded border-2 text-xs ${
                            match.status === 'completed'
                              ? 'bg-green-600 border-green-600 text-white cursor-not-allowed'
                              : 'bg-transparent border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'
                          }`}
                          disabled={match.status === 'completed'}
                        >
                          {match.status === 'completed' ? 'TERMINÉ' : 'JOUER'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connexions vers les matchs suivants */}
                <div className="hidden md:flex flex-col items-center justify-center">
                  <div className="w-full h-px bg-yellow-400 mb-4"></div>
                  <span className="font-press-start text-yellow-400 text-xs">TO</span>
                  <div className="w-full h-px bg-yellow-400 mt-4"></div>
                </div>

                {/* Section des finales (3ème place et finale) */}
                <div className="space-y-8">
                  <h3 className="font-press-start text-lg text-center text-yellow-400 mb-8">
                    FINALS
                  </h3>

                  {/* Match pour la 3ème place */}
                  {thirdPlace && (
                    <div className="bg-black border-4 border-orange-500 rounded-lg p-4 mb-6">
                      <div className="text-center mb-4">
                        <span className="font-press-start text-xs text-gray-400">
                          3RD PLACE
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Player 1 */}
                        <div 
                          className="flex items-center justify-between border-2 rounded p-2"
                          style={{
                            backgroundColor: `${getPlayerColor(thirdPlace.player1)}20`,
                            borderColor: getPlayerColor(thirdPlace.player1)
                          }}
                        >
                          <span 
                            className="font-press-start text-xs"
                            style={{ color: getPlayerColor(thirdPlace.player1) }}
                          >
                            {getPlayerDisplayName(thirdPlace.player1)}
                          </span>
                          <div 
                            className="w-6 h-6 border-2 rounded flex items-center justify-center"
                            style={{ borderColor: getPlayerColor(thirdPlace.player1) }}
                          >
                            <span className="font-press-start text-xs text-white">
                              {thirdPlace.score_player1 || 0}
                            </span>
                          </div>
                        </div>
                        
                        {/* Player 2 */}
                        <div 
                          className="flex items-center justify-between border-2 rounded p-2"
                          style={{
                            backgroundColor: `${getPlayerColor(thirdPlace.player2)}20`,
                            borderColor: getPlayerColor(thirdPlace.player2)
                          }}
                        >
                          <span 
                            className="font-press-start text-xs"
                            style={{ color: getPlayerColor(thirdPlace.player2) }}
                          >
                            {getPlayerDisplayName(thirdPlace.player2)}
                          </span>
                          <div 
                            className="w-6 h-6 border-2 rounded flex items-center justify-center"
                            style={{ borderColor: getPlayerColor(thirdPlace.player2) }}
                          >
                            <span className="font-press-start text-xs text-white">
                              {thirdPlace.score_player2 || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mt-4">
                        <button
                          onClick={() => handlePlayMatch(thirdPlace)}
                          className={`font-press-start px-4 py-1 rounded border-2 text-xs ${
                            thirdPlace.status === 'completed'
                              ? 'bg-green-600 border-green-600 text-white cursor-not-allowed'
                              : 'bg-transparent border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black'
                          }`}
                          disabled={thirdPlace.status === 'completed'}
                        >
                          {thirdPlace.status === 'completed' ? 'TERMINÉ' : 'JOUER'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Finale */}
                  {final ? (
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
                            <span className="font-press-start text-xs text-white">
                              {final.score_player1 || 0}
                            </span>
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
                            <span className="font-press-start text-xs text-white">
                              {final.score_player2 || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bouton de jeu */}
                      <div className="text-center mt-6">
                        <button
                          onClick={() => handlePlayMatch(final)}
                          className={`font-press-start px-6 py-2 rounded border-2 text-sm ${
                            final.status === 'completed'
                              ? 'bg-green-600 border-green-600 text-white cursor-not-allowed'
                              : 'bg-transparent border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'
                          }`}
                          disabled={final.status === 'completed'}
                        >
                          {final.status === 'completed' ? 'TERMINÉ' : 'JOUER'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800 border-4 border-gray-600 rounded-lg p-6">
                      <div className="text-center">
                        <span className="font-press-start text-sm text-gray-400">
                          En attente des demi-finales
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Bouton retour */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/tournament')}
            className="font-press-start bg-transparent border-2 border-gray-500 text-gray-400 px-6 py-2 rounded hover:bg-gray-500 hover:text-white transition-colors"
          >
            RETOUR
          </button>
        </div>
      </div>
    </GradientBackground>
  );
}