"use client";

import { useRouter } from "next/navigation";
import MenuButton from "@/app/components/ui/MenuButton";

export default function PlayPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-[520px] space-y-8">
      <MenuButton onClick={() => router.push("/play/choose-ia")}>1 vs IA</MenuButton>
      <MenuButton onClick={() => router.push("/play/duel")}>1 vs 1</MenuButton>
      <MenuButton onClick={() => router.push("/play/tournament")}>tournament</MenuButton>
      <MenuButton onClick={() => router.push("/settings")}>return</MenuButton>
    </div>
  );
}
