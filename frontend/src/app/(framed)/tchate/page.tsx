"use client";

import { useRouter } from "next/navigation";
import MenuButton from "@/app/components/ui/MenuButton";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-purple-600 flex items-center justify-center">
      <div className="bg-black p-8 w-[80vw] h-[80vh] flex flex-col items-center justify-center space-y-6 max-w-md">
        <h1 className="text-white text-2xl font-bold uppercase mb-6">Profile</h1>

        <MenuButton onClick={() => alert("Afficher profil")}>view profile</MenuButton>
        <MenuButton onClick={() => alert("Modifier profil")}>edit profile</MenuButton>
        <MenuButton onClick={() => router.push("/settings")}>return</MenuButton>
      </div>
    </main>
  );
}