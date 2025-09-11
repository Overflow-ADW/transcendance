// src/views/DuelView.tsx
"use client";

import React, { useState, useEffect } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';
import { t } from "@/lib_front/i18n";
import type { Lang } from "@/lib_front/types";

type DuelPlayer = {
  id: number;
  name: string;
  color: string;
  isMainPlayer: boolean;
};

type EmptySlot = {
  id: string;
  name: string;
  color: string;
  isMainPlayer: boolean;
  isEmpty: true;
};

type DuelSlot = DuelPlayer | EmptySlot;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => void;
  lang: Lang;
}

const LoginModal = ({ isOpen, onClose, onLogin, lang }: LoginModalProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username, password);
      setUsername("");
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-md mx-4">
        <h2 className="text-2xl font-bold text-black mb-6 text-center">{t(lang, 'login')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-black text-sm font-bold mb-2">
              {t(lang, 'username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-black text-sm font-bold mb-2">
              {t(lang, 'password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t(lang, 'login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DuelView() {
  const router = useRouter();
  const { lang } = useApp();
  const [players, setPlayers] = useState([
    { id: 1, name: "YOU", color: "#8A00C4", isMainPlayer: true }
  ]);
  const [showLoginModal, setShowLoginModal] = useState(false);
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

    const savedPlayers = localStorage.getItem('duel-players');
    if (savedPlayers && currentUser) {
      try {
        const parsedPlayers = JSON.parse(savedPlayers);
        const hostName = currentUser.display_name || currentUser.username || "YOU";

        if (parsedPlayers.length > 0 && parsedPlayers[0].isMainPlayer) {
          parsedPlayers[0].name = hostName;
          setPlayers(parsedPlayers);
          localStorage.setItem('duel-players', JSON.stringify(parsedPlayers));
        } else {
          const defaultPlayers = [{ id: 1, name: hostName, color: "#8A00C4", isMainPlayer: true }];
          setPlayers(defaultPlayers);
          localStorage.setItem('duel-players', JSON.stringify(defaultPlayers));
        }
      } catch (e) {
        console.warn('Erreur lors du parsing des joueurs sauvegardés:', e);
        const hostName = currentUser.display_name || currentUser.username || "YOU";
        const defaultPlayers = [{ id: 1, name: hostName, color: "#8A00C4", isMainPlayer: true }];
        setPlayers(defaultPlayers);
        localStorage.setItem('duel-players', JSON.stringify(defaultPlayers));
      }
    } else {
      const hostName = currentUser?.display_name || currentUser?.username || "YOU";
      const defaultPlayers = [{ id: 1, name: hostName, color: "#8A00C4", isMainPlayer: true }];
      setPlayers(defaultPlayers);
      localStorage.setItem('duel-players', JSON.stringify(defaultPlayers));
    }
  }, []);

  const addPlayer = () => {
    if (players.length < 2) {
      setShowLoginModal(true);
    }
  };

  const handleLogin = (username: string, password: string) => {
    const currentPlayer = players[0];
    if (username.toLowerCase() === currentPlayer.name.toLowerCase()) {
      alert("You cannot play against yourself!");
      return;
    }

    if (players.length < 2) {
      const newPlayers = [...players, {
        id: 2,
        name: username.toUpperCase(),
        color: "#2323FF",
        isMainPlayer: false
      }];
      setPlayers(newPlayers);
      localStorage.setItem('duel-players', JSON.stringify(newPlayers));
    }
    setShowLoginModal(false);
  };

  const removePlayer = (id: number) => {
    if (players.length > 1 && id > 1) {
      const newPlayers = players.filter(p => p.id !== id);
      setPlayers(newPlayers);
      localStorage.setItem('duel-players', JSON.stringify(newPlayers));
    }
  };
  const slots: DuelSlot[] = Array.from({ length: 2 }, (_, i) => {
    const player = players[i];
    return player || { id: `empty-${i}`, name: "ADD PLAYER +", color: "", isMainPlayer: false, isEmpty: true };
  });

  return (
    <GradientBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        <div className="mb-16">
          <h1 className="text-6xl font-bold text-white text-center tracking-wider">
            {t(lang, 'duel').toUpperCase()}
          </h1>
        </div>

        <div className="flex gap-8 mb-16">
          {slots.map((slot, index) => (
            <div key={slot.id} className="relative">
              {'isEmpty' in slot ? (
                <button
                  onClick={addPlayer}
                  className="bg-white text-black border-4 border-white rounded-3xl px-16 py-8 text-2xl font-bold transition-all duration-300 hover:scale-105 hover:bg-gray-100 min-w-[300px] h-[120px] flex items-center justify-center"
                >
                  {t(lang, 'addPlayer')}
                </button>
              ) : (
                <div className="relative">
                  <button
                    className={`border-4 rounded-3xl px-16 py-8 text-2xl font-bold transition-all duration-300 hover:scale-105 min-w-[300px] h-[120px] flex items-center justify-center ${slot.isMainPlayer
                      ? 'bg-purple-600/20 border-purple-400 text-purple-400'
                      : 'bg-blue-600/20 border-blue-400 text-blue-400'
                      }`}
                  >
                    {slot.name}
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

        {players.length === 2 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-yellow-400 text-black px-6 py-3 rounded-full">
              <span className="text-3xl font-bold">VS</span>
            </div>
          </div>
        )}

        <div className="mb-8">
          {players.length === 1 && (
            <div className="text-center">
              <p className="text-white/70 text-lg mb-2">{t(lang, 'waitingForOpponent')}</p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          {players.length === 2 && (
            <div className="text-center">
              <p className="text-green-400 text-lg font-bold">{t(lang, 'readyToDuel')}</p>
            </div>
          )}
        </div>

        <div className="flex gap-8">
          <button
            onClick={() => {
              if (players.length === 2) {
                localStorage.setItem('duel-players', JSON.stringify(players));
                localStorage.setItem('game-mode', 'duel');
                router.push("/game");
              }
            }}
            className={`px-16 py-4 rounded-full text-3xl font-bold transition-all duration-300 ${players.length === 2
              ? 'bg-transparent border-4 border-green-400 text-green-400 hover:bg-green-400 hover:text-black hover:scale-105'
              : 'bg-gray-600 border-4 border-gray-500 text-gray-400 cursor-not-allowed'
              }`}
            disabled={players.length !== 2}
          >
            {players.length === 2 ? t(lang, 'startDuel') : t(lang, 'waiting')}
          </button>

          <button
            onClick={() => router.push("/play")}
            className="bg-transparent border-4 border-yellow-400 text-yellow-400 px-16 py-4 rounded-full text-3xl font-bold transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:scale-105"
          >
            {t(lang, 'return')}
          </button>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
          lang={lang}
        />
      </div>
    </GradientBackground>
  );
}