"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Difficulty, Lang, MatchItem, Player, View, Winrate } from "./types";

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
};

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const [view, _setView] = useState<View>("home");
  const [history, setHistory] = useState<View[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const [playersTournament, _setPlayersTournament] = useState<Player[]>([{ id: "me", name: "YOU" }]);
  const [playersDuel, _setPlayersDuel] = useState<Player[]>([{ id: "me", name: "YOU" }]);

  const [avatarURL, setAvatarURL] = useState<string | null>(null);
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
      setMatches
    }),
    [
      lang,
      view,
      difficulty,
      playersTournament,
      playersDuel,
      avatarURL,
      winrates,
      matches
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
