"use client";

import { useApp } from "@/lib_front/store";

export function LangSwitcher() {
  const { lang, setLang } = useApp();
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 text-white">
      {(["fr", "en", "es"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded border ${lang === l ? "bg-white text-black" : "border-white/50"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
