"use client";

import { useRouter } from "next/navigation";
import { MenuButton } from "@/app/components/ui/MenuButton";

export default function PlayPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-[520px] space-y-8">
      <MenuButton label="1 vs IA" onClick={() => router.push("/play/choose-ia")} />
      <MenuButton label="1 vs 1" onClick={() => router.push("/play/duel")} />
      <MenuButton label="tournament" onClick={() => router.push("/play/tournament")} />
      <MenuButton label="return" onClick={() => router.push("/settings")} />
    </div>
  );
}
