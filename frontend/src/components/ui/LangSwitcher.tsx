"use client";

import { useApp } from "@/lib_front/store";
import type { Lang } from "@/lib_front/types";

const languageNames: Record<Lang, string> = {
  fr: "Français",
  en: "English",
  nl: "Nederlands"
};

const langs: readonly Lang[] = ["fr", "en", "nl"] as const;

export function LangSwitcher() {
  const { lang, setLang } = useApp();
  
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            lang === l 
              ? "bg-white text-black font-semibold shadow-lg" 
              : "bg-black/20 text-white hover:bg-black/30"
          }`}
          aria-label={`Switch language to ${languageNames[l]}`}
          title={languageNames[l]}
        >
          {languageNames[l]}
        </button>
      ))}
    </div>
  );
}
