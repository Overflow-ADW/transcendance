"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import MenuButton from "@/app/components/ui/MenuButton";
import { PongCanvas } from "@/app/components/pongs/PongsCanvas";
import { SignInForm } from "@/app/components/forms/SignInForm";
import { LoginForm } from "@/app/components/forms/LoginForm";

type View = "welcome" | "signin" | "login";

export default function HomePage() {
  const [active, setActive] = useState<View>("welcome");
  const router = useRouter();

  const handleSelect = useCallback(
    (key: "welcome" | "signin" | "login" | "settings") => {
      if (key === "settings") {
        router.push("/settings");
        return;
      }
      setActive(key);
    },
    [router]
  );

  return (
    <main className="min-h-screen bg-black">
      <section className="min-h-screen flex">
        {/* COLONNE GAUCHE */}
        <aside className="w-1/2 bg-black flex flex-col justify-center items-center p-8">
          <ul className="space-y-8 w-full max-w-sm list-none">
            <li>
              <MenuButton
                isActive={active === "welcome"}
                variant="welcome"
                onClick={() => handleSelect("welcome")}
              >
                welcome
              </MenuButton>
            </li>
            <li>
              <MenuButton
                isActive={active === "signin"}
                variant="default"
                onClick={() => handleSelect("signin")}
              >
                sign in
              </MenuButton>
            </li>
            <li>
              <MenuButton
                isActive={active === "login"}
                variant="default"
                onClick={() => handleSelect("login")}
              >
                login
              </MenuButton>
            </li>
            <li>
              <MenuButton
                isActive={false}
                variant="default"
                onClick={() => handleSelect("settings")}
              >
                settings
              </MenuButton>
            </li>
          </ul>
        </aside>

        {/* COLONNE DROITE */}
        <section className="w-1/2 relative overflow-hidden bg-blue-600">
          {active === "welcome" && (
            <div className="absolute inset-0">
              <PongCanvas />
            </div>
          )}

          {active === "signin" && (
            <div className="flex justify-center pt-[20vh] px-20">
              <div className="w-full">
                <SignInForm />
              </div>
            </div>
          )}

          {active === "login" && (
            <div className="flex justify-center pt-[30vh] px-20">
              <div className="w-full">
                <LoginForm />
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
