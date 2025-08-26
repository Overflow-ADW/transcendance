// app/(plain)/play/tournament/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Player = {
  id: string;
  name: string;
  color: "self" | "white"; // "self" = YOU
};

type Msg = { author: string; text: string };

const MAX_PLAYERS = 4; // YOU + 3 autres

export default function TournamentPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([
    { id: "me", name: "YOU", color: "self" },
  ]);

  const [newPlayerId, setNewPlayerId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  const remainingSlots = Math.max(0, MAX_PLAYERS - players.length);

  // Styles cartes (désormais 100% de la colonne)
  const bubble = useMemo(
    () =>
      "relative w-full px-6 py-6 rounded-[32px] text-2xl md:text-3xl font-black tracking-wider uppercase transition border-[6px] text-center",
    []
  );
  const addCard = useMemo(
    () =>
      "w-full px-6 py-6 rounded-[32px] text-xl md:text-2xl font-black tracking-wider uppercase transition border-[6px] text-center",
    []
  );

  const openAdd = () => {
    if (players.length >= MAX_PLAYERS) return;
    setIsAdding(true);
  };

  const handleAddPlayer = () => {
    const id = newPlayerId.trim();
    if (!id) return;
    if (players.length >= MAX_PLAYERS) return;

    // éviter doublons
    const exists = players.some((p) => p.id.toLowerCase() === id.toLowerCase());
    if (exists) {
      setIsAdding(false);
      setNewPlayerId("");
      return;
    }

    const resolvedName = id.toUpperCase(); // branche ton backend ici
    setPlayers((p) => [...p, { id, name: resolvedName, color: "white" }]);
    setNewPlayerId("");
    setIsAdding(false);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSend = () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages((m) => [...m, { author: "PLAYER", text: txt }]);
    setInput("");
  };

  return (
    <main className="min-h-dvh w-full bg-black text-white">
      {/* conteneur centré et borné */}
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-6 md:pt-30 grid gap-6 md:gap-8"
           style={{
             // colonne gauche ~30% de l’écran, bornée; colonne droite prend le reste
             gridTemplateColumns: "minmax(260px, 32vw) 1fr",
             gridTemplateRows: "auto 1fr"
           }}>

        {/* ===== COLONNE GAUCHE : joueurs (scroll interne si très petit écran) ===== */}
        <section className="flex flex-col gap-6 md:gap-8 overflow-y-auto"
                 style={{ maxHeight: "calc(100dvh - 3rem)" }}>
          {/* YOU (non supprimable) */}
          <div className={`${bubble} border-purple-600 text-purple-300 hover:bg-purple-600/10`}>
            YOU
          </div>

          {/* autres joueurs */}
          {players.filter(p => p.id !== "me").map((p) => (
            <div key={p.id} className={`${bubble} border-white text-white hover:bg-white/10`}>
              {p.name}
              <button
                onClick={() => handleRemovePlayer(p.id)}
                className="absolute top-2 right-3 text-white text-xl font-bold hover:text-red-400"
                aria-label={`remove ${p.name}`}
                title="remove"
              >
                ×
              </button>
            </div>
          ))}

          {/* slots restants (exactement le nombre qu'il faut) */}
          {Array.from({ length: remainingSlots }).map((_, i) => (
            <button
              key={`slot-${i}`}
              onClick={openAdd}
              className={`${addCard} border-white text-white hover:bg-white/10`}
            >
              ADD PLAYER +
            </button>
          ))}

          {/* input d'ajout (s'affiche après clic sur un slot) */}
          {isAdding && players.length < MAX_PLAYERS && (
            <div className="w-full">
              <div className="mt-2 flex gap-3 items-center">
                <input
                  value={newPlayerId}
                  onChange={(e) => setNewPlayerId(e.target.value)}
                  placeholder="enter player id…"
                  className="flex-1 h-12 rounded-2xl bg-black border-2 border-white/50 px-4 text-white outline-none"
                />
                <button
                  onClick={handleAddPlayer}
                  className="px-5 h-12 rounded-2xl bg-white text-black font-bold hover:bg-white/90"
                >
                  add
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===== COLONNE DROITE : tchat + boutons ===== */}
        <section className="grid gap-6 md:gap-8"
                 style={{
                   // 3 lignes : zone tchat (fixe/fluide) + entrée + bande boutons collée en bas
                   gridTemplateRows: "minmax(280px, clamp(300px, 42dvh, 520px)) auto 1fr"
                 }}>
          {/* Zone tchat (scroll interne) */}
          <div className="rounded-[32px] border-[6px] border-yellow-400 bg-black/80 p-4 md:p-6 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full grid place-items-center text-gray-500 text-sm">
                Aucun message.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold ${
                        m.author.toUpperCase() === "PLAYER" ? "bg-purple-700" : "bg-blue-700"
                      }`}
                    >
                      {m.author.toUpperCase()}
                    </span>
                    <div
                      className={`flex-1 min-h-[32px] rounded-md border px-3 py-1 flex items-center text-sm md:text-base ${
                        m.author.toUpperCase() === "PLAYER" ? "border-purple-500/60" : "border-blue-500/60"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entrée message */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              className="px-5 h-10 rounded-full bg-yellow-400 text-black font-bold"
            >
              send
            </button>
            <div className="flex-1 h-10 rounded-full border-[6px] border-yellow-400 overflow-hidden">
              <input
                className="w-full h-full bg-black text-white px-4 outline-none"
                placeholder="type message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
            </div>
          </div>

          {/* Boutons bas-droite (placés comme tu veux) */}
          <div className="self-end justify-self-end grid grid-cols-2 gap-4">
            <button
              onClick={() => alert("start tournament")}
              className="px-10 py-4 rounded-full border-[4px] border-yellow-400 text-yellow-300 font-black tracking-wider text-2xl md:text-3xl hover:bg-yellow-400 hover:text-black transition"
            >
              START
            </button>
            <button
              onClick={() => router.push("/play")}
              className="px-10 py-4 rounded-full border-[4px] border-yellow-400 text-yellow-300 font-black tracking-wider text-2xl md:text-3xl hover:bg-yellow-400 hover:text-black transition"
            >
              BACK
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
