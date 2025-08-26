// src/app/(framed)/settings/page.tsx
"use client";
import { useRouter } from "next/navigation";
import MenuButton from "@/app/components/ui/MenuButton";

export default function SettingsPage() {
  const router = useRouter();
  return (
    <div className="w-full max-w-[520px] space-y-8">
      <MenuButton onClick={() => router.push("/play")}>play</MenuButton>
      <MenuButton onClick={() => router.push("/tchate")}>tchat</MenuButton>
      <MenuButton onClick={() => router.push("/profil")}>profile</MenuButton>
      <MenuButton isActive onClick={() => router.push("/settings")}>setting</MenuButton>
    </div>
  );
}

