// src/components/ui/LayoutWrapper.tsx
"use client";

import PurpleFrame from "./PurpleFrame";

interface LayoutWrapperProps {
  children: React.ReactNode;
  layout?: "purple-frame" | "fullscreen" | "default";
}

export function LayoutWrapper({ children, layout = "default" }: LayoutWrapperProps) {
  switch (layout) {
    case "purple-frame":
      return <PurpleFrame>{children}</PurpleFrame>;
      
    case "fullscreen":
      return <div className="fixed inset-0">{children}</div>;
      
    case "default":
    default:
      return <div className="min-h-screen">{children}</div>;
  }
}