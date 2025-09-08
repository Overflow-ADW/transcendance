// src/lib_front/types.ts

export type Lang = "fr" | "en" | "es";

export type View =
  | "home"
  | "signin"
  | "login"
  | "settings"
  | "play"
  | "chooseIA"
  | "game"
  | "tournament"
  | "duel"
  | "profileView";

export type Difficulty = "easy" | "medium" | "hard";

export type Player = {
  id: string;
  name: string;
};

export type Winrate = {
  label: string;
  value: number;            // 0..100
  color: string;            // classes tailwind (ex: "bg-purple-600")
};

export type MatchItem = {
  opponent: string;
  result: "win" | "loose";
  mode: "1 vs 1" | "tournament" | "vs ia";
};
