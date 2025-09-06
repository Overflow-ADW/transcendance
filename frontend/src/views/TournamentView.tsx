// src/views/TournamentView.tsx
"use client";

import { useState } from "react";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';

export default function TournamentView() {
  const router = useRouter();
  const { lang } = useApp();
  const [players, setPlayers] = useState([
    { id: 1, name: "YOU", color: "#8A00C4" },
    { id: 2, name: "KEVIN92", color: "#2323FF" }
  ]);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, {
        id: players.length + 1,
        name: `PLAYER${players.length + 1}`,
        color: players.length % 2 === 0 ? "#8A00C4" : "#2323FF"
      }]);
    }
  };

  const removePlayer = (id: number) => {
    if (players.length > 2 && id > 2) { // Ne pas supprimer YOU et KEVIN92
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  // Créer un tableau de 4 slots
  const slots = Array.from({ length: 4 }, (_, i) => {
    const player = players[i];
    return player || { id: `empty-${i}`, name: "ADD PLAYER +", isEmpty: true };
  });

  return (
    <GradientBackground className="bg-black">
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        {/* Titre */}
        <h1 className="text-white text-8xl font-black mb-20 tracking-wider text-center">
          TOURNAMENT
        </h1>

        {/* Grille 2x2 des joueurs */}
        <div className="grid grid-cols-2 gap-12 mb-16 w-full max-w-4xl">
          {slots.map((slot, index) => (
            <div key={slot.id} className="flex justify-center">
              {slot.isEmpty ? (
                <button
                  onClick={addPlayer}
                  className="bg-transparent border-4 border-white text-white rounded-3xl px-16 py-8 text-2xl font-bold transition-all duration-300 hover:bg-white hover:text-black hover:scale-105 min-w-[300px] h-[120px] flex items-center justify-center"
                >
                  ADD PLAYER +
                </button>
              ) : (
                <button
                  onClick={() => removePlayer(slot.id)}
                  className="bg-transparent border-4 rounded-3xl px-16 py-8 text-2xl font-bold transition-all duration-300 hover:scale-105 min-w-[300px] h-[120px] flex items-center justify-center"
                  style={{ 
                    borderColor: slot.color,
                    color: slot.color
                  }}
                >
                  {slot.name}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-12">
          <button
            onClick={() => router.push("/game")}
            className="bg-transparent border-4 border-yellow-400 text-yellow-400 px-16 py-4 rounded-full text-3xl font-bold transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:scale-105"
          >
            START
          </button>
          
          <button
            onClick={() => router.push("/play")}
            className="bg-transparent border-4 border-yellow-400 text-yellow-400 px-16 py-4 rounded-full text-3xl font-bold transition-all duration-300 hover:bg-yellow-400 hover:text-black hover:scale-105"
          >
            return
          </button>
        </div>
      </div>
    </GradientBackground>
  );
}