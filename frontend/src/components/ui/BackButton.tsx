"use client";

import { useApp } from "@/lib_front/store";

export function BackButton({ label = "return", hidden = false }: { label?: string; hidden?: boolean }) {
  const { goBack } = useApp();

  if (hidden) return null;

  return (
    <button
      onClick={goBack}
      className="fixed left-4 top-4 z-50 px-4 py-2 rounded-full border-2 border-white text-white font-bold hover:bg-white hover:text-black transition"
      aria-label="retour"
      title="retour"
      type="button"
    >
      {label}
    </button>
  );
}
