"use client";

import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/lib_front/i18n";
import { useApp } from "@/lib_front/store";
import { useRouter } from 'next/navigation';

export default function ProfileView() {
	const { lang, avatarURL, setAvatarURL, winrates, matches } = useApp();
	const router = useRouter();


  return (
    <main className="min-h-dvh w-full bg-black text-white">
      <BackButton label={t(lang, "return")} />
      <div
        className="mx-auto w-full max-w-[1280px] px-4 md:px-8 pt-8 pb-10 grid gap-8 md:gap-10"
        style={{ gridTemplateColumns: "minmax(280px, 36vw) 1fr" }}
      >
        <section className="flex flex-col gap-6 md:gap-8">
          <AvatarUploader
            value={avatarURL}
            onPickTemp={(url) => setAvatarURL(url)}
            onSave={() => alert("upload vers backend ici")}
            pickLabel={t(lang, "pickPhoto")}
            saveLabel={t(lang, "save")}
          />
          <div className="rounded-[28px] border-[6px] border-yellow-400 px-6 py-6 text-3xl md:text-4xl font-black tracking-wider uppercase text-center">
            {t(lang, "username")}
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-lg border-2 border-white text-white font-bold hover:bg-white hover:text-black transition"
          >
            {t(lang, "return")}
          </button>
        </section>

        <section className="flex flex-col gap-8">
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

          <div className="rounded-[28px] border-[6px] border-yellow-400 p-0 overflow-hidden">
            <div className="px-6 pt-6">
              <h2 className="text-center text-2xl md:text-3xl font-black tracking-widest uppercase">
                {t(lang, "matchHistory")}
              </h2>
              <div className="mx-auto mt-2 h-[2px] w-40 bg-white/40" />
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-3 text-center text-blue-400 font-bold tracking-widest uppercase text-sm">
                <div className="py-3 border-t border-b border-white/20">{t(lang, "opponents")}</div>
                <div className="py-3 border-t border-b border-white/20">{t(lang, "results")}</div>
                <div className="py-3 border-t border-b border-white/20">{t(lang, "mode")}</div>
              </div>

              {matches.map((m, i) => (
                <div key={i} className="grid grid-cols-3 text-center text-white">
                  <div className="py-3 border-b border-white/10">{m.opponent}</div>
                  <div className={`py-3 border-b border-white/10 ${m.result === "win" ? "text-green-400" : "text-red-400"}`}>{m.result}</div>
                  <div className="py-3 border-b border-white/10">{m.mode}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
