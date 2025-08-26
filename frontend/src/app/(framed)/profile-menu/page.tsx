"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MenuButton from '../../components/ui/MenuButton';

export default function ProfilMenuPage() {
  const router = useRouter();
  const [user, setUser] = useState({
    username: 'Joueur',
    email: 'joueur@example.com',
    gamesPlayed: 0,
    gamesWon: 0,
    level: 1
  });

  const winRate = user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎮 Profil Joueur</h1>
          <p className="text-blue-200">Gérez votre profil et vos statistiques</p>
        </div>

        {/* Profil Card */}
        <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-xl p-8 mb-8 border border-blue-500/30">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.username}</h2>
              <p className="text-blue-200">{user.email}</p>
              <p className="text-purple-300">Niveau {user.level}</p>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-600/20 rounded-lg p-4 text-center border border-blue-500/30">
              <div className="text-2xl font-bold text-white">{user.gamesPlayed}</div>
              <div className="text-blue-200">Parties jouées</div>
            </div>
            <div className="bg-green-600/20 rounded-lg p-4 text-center border border-green-500/30">
              <div className="text-2xl font-bold text-white">{user.gamesWon}</div>
              <div className="text-green-200">Victoires</div>
            </div>
            <div className="bg-purple-600/20 rounded-lg p-4 text-center border border-purple-500/30">
              <div className="text-2xl font-bold text-white">{winRate.toFixed(1)}%</div>
              <div className="text-purple-200">Taux de victoire</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MenuButton
            variant="primary"
            size="lg"
            onClick={() => router.push('/play')}
            icon="🎮"
          >
            Jouer une partie
          </MenuButton>
          
          <MenuButton
            variant="secondary"
            size="lg"
            onClick={() => router.push('/settings')}
            icon="⚙️"
          >
            Paramètres
          </MenuButton>
        </div>

        {/* Historique */}
        <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-xl p-8 border border-blue-500/30">
          <h3 className="text-xl font-bold text-white mb-4">📊 Historique récent</h3>
          <div className="text-center text-gray-400 py-8">
            <p>Aucune partie jouée pour le moment</p>
            <p className="text-sm mt-2">Commencez à jouer pour voir vos statistiques !</p>
          </div>
        </div>

        {/* Bouton retour */}
        <div className="text-center mt-8">
          <MenuButton
            variant="secondary"
            onClick={() => router.push('/')}
            icon="🏠"
          >
            Retour à l'accueil
          </MenuButton>
        </div>
      </div>
    </div>
  );
}