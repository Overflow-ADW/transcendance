"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { Difficulty, Lang, MatchItem, Player, View, Winrate } from "./types";
import { AuthProvider } from "./AuthContext";

type AppState = {
  lang: Lang;
  setLang: (l: Lang) => void;

  view: View;
  setView: (v: View) => void; // direct
  navigate: (v: View) => void; // push history
  goBack: () => void;          // pop history

  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;

  playersTournament: Player[];
  setPlayersTournament: (fn: (p: Player[]) => Player[]) => void;

  playersDuel: Player[];
  setPlayersDuel: (fn: (p: Player[]) => Player[]) => void;

  avatarURL: string | null;
  setAvatarURL: (u: string | null) => void;

  winrates: Winrate[];
  setWinrates: (w: Winrate[]) => void;

  matches: MatchItem[];
  setMatches: (m: MatchItem[]) => void;

  // Nouvelles propriétés pour les notifications et l'état global
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  isOnline: boolean;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;

  isRateLimitModalOpen: boolean;
  setRateLimitModalOpen: (open: boolean) => void;
};

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Get initial language from localStorage or default to English
  const initialLang = typeof window !== 'undefined' ? 
    (localStorage.getItem('user-language') as Lang || 'en') : 'en';
  
  const [lang, _setLang] = useState<Lang>(initialLang);
  const [view, _setView] = useState<View>("home");
  const [history, setHistory] = useState<View[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const [playersTournament, _setPlayersTournament] = useState<Player[]>([{ id: "me", name: "YOU" }]);
  const [playersDuel, _setPlayersDuel] = useState<Player[]>([{ id: "me", name: "YOU" }]);

  const [avatarURL, setAvatarURL] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isOnline, setIsOnline] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRateLimitModalOpen, setRateLimitModalOpen] = useState(false);
  const [winrates, setWinrates] = useState<Winrate[]>([
    { label: "winrate vs player", value: 70, color: "bg-purple-600" },
    { label: "winrate tournament", value: 65, color: "bg-blue-600" },
    { label: "winrate vs ia", value: 40, color: "bg-yellow-400 text-black" }
  ]);
  const [matches, setMatches] = useState<MatchItem[]>([
    { opponent: "topaz", result: "win", mode: "1 vs 1" },
    { opponent: "flo", result: "loose", mode: "tournament" },
    { opponent: "lucas", result: "win", mode: "tournament" },
    { opponent: "topaz", result: "loose", mode: "1 vs 1" }
  ]);

  // Wrap setLang to persist the language choice
  const setLang = (newLang: Lang) => {
    localStorage.setItem('user-language', newLang);
    _setLang(newLang);
  };

  const setView = (v: View) => _setView(v);

  const navigate = (v: View) => {
    setHistory((h) => [...h, view]);
    _setView(v);
  };

  const goBack = () => {
    setHistory((h) => {
      if (h.length === 0) {
        _setView("home");
        return h;
      }
      const prev = h[h.length - 1];
      _setView(prev);
      return h.slice(0, -1);
    });
  };

  const setPlayersTournament = (fn: (p: Player[]) => Player[]) =>
    _setPlayersTournament((p) => fn(p));
  const setPlayersDuel = (fn: (p: Player[]) => Player[]) =>
    _setPlayersDuel((p) => fn(p));

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      view,
      setView,
      navigate,
      goBack,
      difficulty,
      setDifficulty,
      playersTournament,
      setPlayersTournament,
      playersDuel,
      setPlayersDuel,
      avatarURL,
      setAvatarURL,
      winrates,
      setWinrates,
      matches,
      setMatches,
      theme,
      setTheme,
      isOnline,
      setIsOnline,
      notifications,
      setNotifications,
      isRateLimitModalOpen,
      setRateLimitModalOpen,
      addNotification: (notification: Omit<Notification, 'id'>) => {
        setNotifications(prev => [
          ...prev,
          { ...notification, id: Date.now().toString() }
        ]);
      },
      removeNotification: (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    }),
    [
      lang,
      view,
      difficulty,
      playersTournament,
      playersDuel,
      avatarURL,
      winrates,
      matches,
      theme,
      isOnline,
      notifications,
      isRateLimitModalOpen
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
