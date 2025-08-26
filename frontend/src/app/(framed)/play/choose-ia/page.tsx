"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import MenuButton from "@/app/components/ui/MenuButton";
import TransitionCurtain from "@/app/components/ui/TransitionCurtain";

export default function ChooseIA() {
  const router = useRouter();
  const [showFX, setShowFX] = useState(false);
  const [nextHref, setNextHref] = useState<string | null>(null);

  const go = useCallback((difficulty: "easy" | "medium" | "hard") => {
    const href = `/play/game?mode=ia&difficulty=${difficulty}`;
    setNextHref(href);
    setShowFX(true);   // 👉 déclenche l’animation
  }, []);

  return (
    <>
      <div className="w-full max-w-[520px] space-y-8">
        <MenuButton onClick={() => go("easy")}>EASY</MenuButton>
        <MenuButton onClick={() => go("medium")}>MEDIUM</MenuButton>
        <MenuButton onClick={() => go("hard")}>HARD</MenuButton>
        <MenuButton onClick={() => router.push("/play")}>return</MenuButton>
      </div>

      {/* Le rideau violet */}
      <TransitionCurtain
        show={showFX}
        onDone={() => {
          if (nextHref) router.push(nextHref); // 👉 navigation après l’animation
        }}
      />
    </>
  );
}
