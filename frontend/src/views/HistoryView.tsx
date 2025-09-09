"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { BackButton } from "@/components/ui/BackButton";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib_front/AuthContext";
import { apiClient } from "@/lib_front/api";
import { GameHistoryResponse } from "@/lib_front/types";

export default function HistoryView() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [gameHistory, setGameHistory] = useState<GameHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [gameModeFilter, setGameModeFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  // Redirection si non authentifié
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, loading, router]);

  // Chargement de l'historique
  const loadGameHistory = async (page = 1, status = 'all', gameMode = 'all') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getGameHistory({
        page,
        limit: 20,
        status: status !== 'all' ? status : undefined,
        gameMode: gameMode !== 'all' ? gameMode : undefined
      });
      
      setGameHistory(response);
      setCurrentPage(page);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError('Impossible de charger l\'historique des parties');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadGameHistory(currentPage, statusFilter, gameModeFilter);
    }
  }, [isAuthenticated, currentPage, statusFilter, gameModeFilter]);

  // Fonctions de filtrage
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleGameModeFilterChange = (gameMode: string) => {
    setGameModeFilter(gameMode);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadGameHistory(page, statusFilter, gameModeFilter);
  };

  // Formatage de la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatage de la durée
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Couleur selon le résultat
  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      case 'draw': return 'text-yellow-400';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  // Icône selon le résultat
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return '🏆';
      case 'loss': return '💔';
      case 'draw': return '🤝';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Chargement...</div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <BackButton />
            <div className="text-center mt-4">
              <h1 className="text-4xl font-bold text-white mb-2">
                📜 Historique des Parties
              </h1>
              <p className="text-gray-300">
                Consultez l'historique complet de vos parties
              </p>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                {/* Filtre par statut */}
                <div className="flex flex-col">
                  <label className="text-gray-300 text-sm mb-2">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="all">Toutes</option>
                    <option value="completed">Terminées</option>
                    <option value="in_progress">En cours</option>
                    <option value="abandoned">Abandonnées</option>
                  </select>
                </div>

                {/* Filtre par mode de jeu */}
                <div className="flex flex-col">
                  <label className="text-gray-300 text-sm mb-2">Mode de jeu</label>
                  <select
                    value={gameModeFilter}
                    onChange={(e) => handleGameModeFilterChange(e.target.value)}
                    className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="all">Tous les modes</option>
                    <option value="classic">Classic</option>
                    <option value="tournament">Tournoi</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>
              </div>

              {/* Statistiques de la page */}
              {gameHistory && (
                <div className="text-right text-sm text-gray-300">
                  <div>Total: {gameHistory.pagination.totalItems} parties</div>
                  <div className="flex gap-4 mt-1">
                    <span className="text-green-400">🏆 {gameHistory.stats.wins}</span>
                    <span className="text-red-400">💔 {gameHistory.stats.losses}</span>
                    <span className="text-yellow-400">🤝 {gameHistory.stats.draws}</span>
                    <span className="text-gray-400">⏳ {gameHistory.stats.pending}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Liste des parties */}
          {error ? (
            <div className="bg-red-500/20 text-red-300 p-4 rounded-lg text-center">
              {error}
            </div>
          ) : isLoading ? (
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-8 text-center">
              <div className="text-white text-xl">Chargement de l'historique...</div>
            </div>
          ) : gameHistory && gameHistory.games.length > 0 ? (
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6">
              <div className="space-y-3">
                {gameHistory.games.map((game) => (
                  <div
                    key={game.id}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Icône résultat */}
                        <div className="text-2xl">
                          {getResultIcon(game.result)}
                        </div>

                        {/* Informations partie */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${getResultColor(game.result)}`}>
                              {game.result.toUpperCase()}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-white font-mono">
                              {game.user_score} - {game.opponent_score}
                            </span>
                            <span className="text-gray-300">vs</span>
                            <span className="text-white">
                              {game.opponent_display_name || game.opponent_username || 'IA'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {game.game_mode} • {formatDuration(game.duration)} • {formatDate(game.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Score détaillé */}
                      <div className="text-right">
                        <div className="text-white font-mono text-lg">
                          {game.score_player1} - {game.score_player2}
                        </div>
                        <div className="text-xs text-gray-400">
                          Partie #{game.id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {gameHistory.pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  <button
                    onClick={() => handlePageChange(gameHistory.pagination.previousPage!)}
                    disabled={!gameHistory.pagination.hasPreviousPage}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    ← Précédent
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, gameHistory.pagination.totalPages) }, (_, i) => {
                      const page = i + Math.max(1, gameHistory.pagination.currentPage - 2);
                      if (page > gameHistory.pagination.totalPages) return null;
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            page === gameHistory.pagination.currentPage
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(gameHistory.pagination.nextPage!)}
                    disabled={!gameHistory.pagination.hasNextPage}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-8 text-center">
              <div className="text-gray-400 text-xl mb-4">📭</div>
              <div className="text-white text-lg mb-2">Aucune partie trouvée</div>
              <div className="text-gray-400">
                Lancez votre première partie pour voir l'historique ici !
              </div>
            </div>
          )}
        </div>
      </div>
    </GradientBackground>
  );
}

// Export nommé pour compatibilité
export { HistoryView };
