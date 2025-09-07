// src/components/ui/PurpleFrame.tsx
"use client";

import React from "react";

interface PurpleFrameProps {
  children: React.ReactNode;
}

export default function PurpleFrame({ children }: PurpleFrameProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-purple-400/30 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}