"use client";

import { useRef } from "react";

export function AvatarUploader({
  value,
  onPickTemp,
  onSave,
  onDelete,
  pickLabel,
  saveLabel,
  deleteLabel
}: {
  value: string | null;
  onPickTemp: (file: File, previewUrl: string) => void;
  onSave: () => void;
  onDelete?: () => void;
  pickLabel: string;
  saveLabel: string;
  deleteLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-[28px] border-[6px] border-yellow-400 p-3">
      <div className="aspect-[4/3] w-full rounded-[20px] overflow-hidden border-[4px] border-yellow-400 bg-black/60 grid place-items-center">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="text-white/70">Aucune photo</div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 rounded-full border-[3px] border-white font-bold hover:bg-white hover:text-black transition"
        >
          {pickLabel}
        </button>
        <button
          onClick={onSave}
          disabled={!value}
          className={`px-4 py-2 rounded-full border-[3px] font-bold transition ${
            value
              ? "border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
              : "border-white/30 text-white/30 cursor-not-allowed"
          }`}
        >
          {saveLabel}
        </button>
        {onDelete && value && (
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-full border-[3px] border-red-400 text-red-300 font-bold hover:bg-red-400 hover:text-black transition"
          >
            {deleteLabel || "Supprimer"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            onPickTemp(f, url);
          }}
        />
      </div>
    </div>
  );
}
