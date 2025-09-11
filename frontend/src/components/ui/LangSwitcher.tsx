"use client";

import { useApp } from "@/lib_front/store";
import { Lang } from "@/lib_front/types";

export function LangSwitcher() {
  const { lang, setLang } = useApp();
  const languages: Array<{ code: Lang; flag: string }> = [
    { code: "en", flag: "🇬🇧" },
    { code: "fr", flag: "🇫🇷" },
    { code: "nl", flag: "🇳🇱" }
  ];

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 text-white">
      {languages.map(({ code, flag }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-3 py-1 rounded border flex items-center gap-1 ${
            lang === code ? "bg-white text-black" : "border-white/50"
          }`}
        >
          <span>{flag}</span>
          <span>{code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
