import type { MatchItem, Winrate } from "./types";

// Change BASE_URL si back séparé (ou garde /api si Next API en local)
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function apiGetWinrates(): Promise<Winrate[]> {
  const res = await fetch(`${BASE_URL}/api/profile/winrates`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch winrates");
  return res.json();
}

export async function apiPutWinrates(payload: Winrate[]) {
  const res = await fetch(`${BASE_URL}/api/profile/winrates`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update winrates");
  return res.json();
}

export async function apiGetMatches(): Promise<MatchItem[]> {
  const res = await fetch(`${BASE_URL}/api/profile/matches`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch matches");
  return res.json();
}

export async function apiPostMatch(payload: MatchItem) {
  const res = await fetch(`${BASE_URL}/api/profile/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to add match");
  return res.json();
}
