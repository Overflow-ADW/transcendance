// src/components/ui/ConditionalFrame.tsx
"use client";

import PurpleFrame from "./PurpleFrame";
import { useApp } from "@/lib_front/store";

interface ConditionalFrameProps {
  children: React.ReactNode;
}

export function ConditionalFrame({ children }: ConditionalFrameProps) {
  const { view } = useApp();
  
  // Pages qui ne doivent PAS avoir le PurpleFrame
  const pagesWithoutFrame = ["home", "profile", "tournament", "game"];
  
  const shouldShowFrame = !pagesWithoutFrame.includes(view);
  
  if (shouldShowFrame) {
    return <PurpleFrame>{children}</PurpleFrame>;
  }
  
  return <div className="fixed inset-0">{children}</div>;
}