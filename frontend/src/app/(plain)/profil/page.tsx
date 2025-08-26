"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Friend = {
  id: string;
  name: string;
  online: boolean;
};

type Match = {
  opponent: string;
  result: "win" | "loose";
  mode: "1 vs 1" | "tournament" | "vs ia";
};

export default function ProfileViewPage() {
  const router = useRouter();

  // ==== Avatar ====
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const handlePick = () => fileRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatar(url);
  };
  const handleSaveAvatar = async () => {
    if (!avatar) return;
    setSavingAvatar(true);
    setTimeout(() => setSavingAvatar(false), 600);
  };

  // ==== Friends ====
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendInput, setFriendInput] = useState("");

  const handleAddFriend = () => {
    const name = friendInput.trim();
    if (!name) return;
    if (friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setFriendInput("");
      return;
    }
    setFriends((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, online: false },
    ]);
    setFriendInput("");
  };

  const toggleOnline = (id: string) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, online: !f.online } : f))
    );
  };

  const removeFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const online = friends.filter((f) => f.online);
  const offline = friends.filter((f) => !f.online);

  // ==== Fake stats & matches (exemples) ====
  const winrates = [
    { label: "winrate vs player", value: 70, color: "bg-purple-600" },
    { label: "winrate tournament", value: 65, color: "bg-blue-600" },
    { label: "winrate vs ia", value: 40, color: "bg-yellow-400 text-black" },
  ];

  const matches: Match[] = [
    { opponent: "topaz", result: "win", mode: "1 vs 1" },
    { opponent: "flo", result: "loose", mode: "tournament" },
    { opponent: "lucas", result: "win", mode: "tournament" },
    { opponent: "topaz", result: "loose", mode: "1 vs 1" },
  ];

  // ==== Back button ====
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <main className="min-h-dvh w-full bg-black text-white">
      {/* Barre haute avec bouton Retour */}
      <div className="sticky top-0 z-10 w-full bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/40 border-b border-yellow-400/40">
        <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            aria-label="retour"
            className="px-4 py-2 rounded-full border-[3px] border-yellow-400 text-yellow-300 font-bold hover:bg-yellow-400 hover:text-black transition"
          >
            ← Retour
          </button>
          <div className="text-sm text-white/60 tracking-widest uppercase">
            Profil
          </div>
          <div className="w-[94px]" />
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-[1280px] px-4 md:px-8 pt-8 pb-10 grid gap-8 md:gap-10"
        style={{ gridTemplateColumns: "minmax(280px, 36vw) 1fr" }}
      >
        {/* =================== COLONNE GAUCHE =================== */}
        <section className="flex flex-col gap-6 md:gap-8">
          {/* Avatar card */}
          <div className="rounded-[28px] border-[6px] border-yellow-400 p-3">
            <div className="aspect-[4/3] w-full rounded-[20px] overflow-hidden border-[4px] border-yellow-400 bg-black/60 grid place-items-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white/70">Aucune photo</div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handlePick}
                className="px-4 py-2 rounded-full border-[3px] border-white font-bold hover:bg-white hover:text-black transition"
              >
                Choisir une photo
              </button>
              <button
                onClick={handleSaveAvatar}
                disabled={!avatar || savingAvatar}
                className={`px-4 py-2 rounded-full border-[3px] font-bold transition ${
                  avatar
                    ? "border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                    : "border-white/30 text-white/30 cursor-not-allowed"
                }`}
              >
                {savingAvatar ? "Enregistrement..." : "Enregistrer"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          {/* Username */}
          <div className="rounded-[28px] border-[6px] border-yellow-400 px-6 py-6 text-3xl md:text-4xl font-black tracking-wider uppercase text-center">
            JUNUSKUSH
          </div>

          {/* Add friends */}
          <div className="rounded-[28px] border-[6px] border-yellow-400 p-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                placeholder="friend username/id…"
                className="h-12 rounded-full bg-black border-2 border-white/60 px-4 outline-none"
              />
              <button
                onClick={handleAddFriend}
                className="px-6 rounded-full border-[3px] border-yellow-400 text-yellow-300 font-bold hover:bg-yellow-400 hover:text-black transition"
              >
                add friends
              </button>
            </div>
          </div>
        </section>

        {/* =================== COLONNE DROITE =================== */}
        <section className="flex flex-col gap-8">
          {/* Winrates (losanges) */}
          <div className="rounded-[28px] border-[6px] border-yellow-400 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {winrates.map((w) => (
                <div key={w.label} className="grid place-items-center">
                  <div className={`w-28 h-28 rotate-45 rounded-[10px] ${w.color} grid place-items-center`}>
                    <div className="-rotate-45 text-2xl font-black">{w.value}%</div>
                  </div>
                  <div className="mt-3 text-center text-sm text-white/90">{w.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Match history */}
          <div className="rounded-[28px] border-[6px] border-yellow-400 p-0 overflow-hidden">
            <div className="px-6 pt-6">
              <h2 className="text-center text-2xl md:text-3xl font-black tracking-widest uppercase">
                MATCH HISTORY
              </h2>
              <div className="mx-auto mt-2 h-[2px] w-40 bg-white/40" />
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-3 text-center text-blue-400 font-bold tracking-widest uppercase text-sm">
                <div className="py-3 border-t border-b border-white/20">Opponents</div>
                <div className="py-3 border-t border-b border-white/20">Results</div>
                <div className="py-3 border-t border-b border-white/20">Game mode</div>
              </div>

              {matches.map((m, i) => (
                <div key={i} className="grid grid-cols-3 text-center text-white">
                  <div className="py-3 border-b border-white/10">{m.opponent}</div>
                  <div className={`py-3 border-b border-white/10 ${m.result === "win" ? "text-green-400" : "text-red-400"}`}>
                    {m.result}
                  </div>
                  <div className="py-3 border-b border-white/10">{m.mode}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Friends list (EN DESSOUS de Match history) */}
          <div className="rounded-[28px] border-[6px] border-yellow-400 p-0 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-yellow-400/60">
              {/* ONLINE */}
              <div className="p-5">
                <div className="text-white/80 uppercase tracking-widest mb-3">
                  online
                </div>
                {online.length === 0 ? (
                  <div className="text-white/40 text-sm">aucun ami en ligne</div>
                ) : (
                  <ul className="space-y-2">
                    {online.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleOnline(f.id)}
                            className="px-2 py-1 rounded-full border border-white/60 text-xs hover:bg-white hover:text-black"
                          >
                            set offline
                          </button>
                          <button
                            onClick={() => removeFriend(f.id)}
                            className="px-2 py-1 rounded-full border border-red-400 text-red-300 text-xs hover:bg-red-400 hover:text-black"
                            aria-label="remove friend"
                          >
                            remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* OFFLINE */}
              <div className="p-5">
                <div className="text-white/80 uppercase tracking-widest mb-3">
                  offline
                </div>
                {offline.length === 0 ? (
                  <div className="text-white/40 text-sm">aucun ami hors-ligne</div>
                ) : (
                  <ul className="space-y-2">
                    {offline.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{f.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleOnline(f.id)}
                            className="px-2 py-1 rounded-full border border-white/60 text-xs hover:bg-white hover:text-black"
                          >
                            set online
                          </button>
                          <button
                            onClick={() => removeFriend(f.id)}
                            className="px-2 py-1 rounded-full border border-red-400 text-red-300 text-xs hover:bg-red-400 hover:text-black"
                            aria-label="remove friend"
                          >
                            remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          {/* fin friends list */}
        </section>
      </div>
    </main>
  );
}
