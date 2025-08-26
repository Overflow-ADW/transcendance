// src/app/(framed)/settings/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { MenuButton } from "@/app/components/ui/MenuButton";

export default function SettingsPage() {
  const router = useRouter();
  return (
    <div className="w-full max-w-[520px] space-y-8">
      <MenuButton label="play" onClick={() => router.push("/play")} />
      <MenuButton label="tchat" onClick={() => router.push("/tchate")} />
      <MenuButton label="profile" onClick={() => router.push("/profil")} />
      <MenuButton label="setting" active onClick={() => router.push("/settings")} />
    </div>
  );
}

