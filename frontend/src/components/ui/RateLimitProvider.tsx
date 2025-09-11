// src/components/ui/RateLimitProvider.tsx
"use client";

import { RateLimitModal } from "./RateLimitModal";
import { useRateLimitModal } from "@/lib_front/useRateLimitModal";

interface RateLimitProviderProps {
  children: React.ReactNode;
}

export function RateLimitProvider({ children }: RateLimitProviderProps) {
  const { isOpen, onClose } = useRateLimitModal();

  return (
    <>
      {children}
      <RateLimitModal isOpen={isOpen} onClose={onClose} />
    </>
  );
}
