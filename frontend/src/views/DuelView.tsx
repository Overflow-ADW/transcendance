"use client";

import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';

export default function DuelView() {
  const { lang, navigate, playersDuel, setPlayersDuel } = useApp();
	const router = useRouter();

  const addOpponent = () => {
    const id = prompt("player id?");
    if (!id) return;
    if (playersDuel.length >= 2) return;
    if (playersDuel.some((p) => p.id.toLowerCase() === id.toLowerCase())) return;
    setPlayersDuel((p) => [...p, { id, name: id.toUpperCase() }]);
  };

  return (
    <main className="min-h-dvh w-full bg-black text-white">
      <BackButton label={t(lang, "return")} />
      <div
        className="mx-auto w-full max-w-[1280px] px-4 md:px-8 pt-8 md:pt-14 pb-6 min-h-dvh grid gap-6 md:gap-8"
        style={{ gridTemplateColumns: "minmax(260px, 32vw) 1fr", gridTemplateRows: "auto 1fr" }}
      >
        <section className="flex flex-col gap-6 md:gap-8 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 4rem)" }}>
          <div className="relative w-full px-6 py-6 rounded-[32px] text-2xl md:text-3xl font-black tracking-wider uppercase transition border-[6px] text-center border-purple-600 text-purple-300">
            {t(lang, "you")}
          </div>

          {playersDuel
            .filter((p) => p.id !== "me")
            .map((p) => (
              <div key={p.id} className="relative w-full px-6 py-6 rounded-[32px] text-2xl md:text-3xl font-black tracking-wider uppercase transition border-[6px] text-center border-white text-white">
                {p.name}
                <button
                  onClick={() => setPlayersDuel((prev) => prev.filter((x) => x.id !== p.id))}
                  className="absolute top-2 right-3 text-white text-xl font-bold hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}

          {playersDuel.length < 2 && (
            <button
              onClick={addOpponent}
              className="w-full px-6 py-6 rounded-[32px] text-xl md:text-2xl font-black tracking-wider uppercase transition border-[6px] text-center border-white text-white hover:bg-white/10"
            >
              {t(lang, "addPlayer")}
            </button>
          )}
        </section>

        <section className="self-end justify-self-end grid grid-cols-2 gap-4">
          <button
            disabled={playersDuel.length < 2}
            onClick={() => alert("matchmaking...")}
            className={`px-10 py-4 rounded-full border-[4px] font-black tracking-wider text-2xl md:text-3xl transition ${
              playersDuel.length === 2
                ? "border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                : "border-yellow-400/40 text-yellow-300/40 cursor-not-allowed"
            }`}
          >
            {t(lang, "matchmaking")}
          </button>
          <button
            onClick={() => router.push("play")}
            className="px-10 py-4 rounded-full border-[4px] border-yellow-400 text-yellow-300 font-black tracking-wider text-2xl md:text-3xl hover:bg-yellow-400 hover:text-black transition"
          >
            {t(lang, "back")}
          </button>
        </section>
      </div>
    </main>
  );
}
