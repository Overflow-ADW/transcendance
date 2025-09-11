// src/lib_front/useRateLimitModal.ts
"use client";

import { useEffect } from "react";
import { useApp } from "./store";
import { rateLimitManager, type RateLimitState } from "./rateLimitManager";

export function useRateLimitModal() {
  const { isRateLimitModalOpen, setRateLimitModalOpen } = useApp();

  useEffect(() => {
    const unsubscribe = rateLimitManager.subscribe((state: RateLimitState) => {
      if (state.isBlocked && !isRateLimitModalOpen) {
        // Ouvrir la modal quand on détecte 429
        setRateLimitModalOpen(true);
      } else if (!state.isBlocked && isRateLimitModalOpen) {
        // Fermer la modal quand 429 terminé
        setRateLimitModalOpen(false);
      }
    });

    rateLimitManager.checkAndNotify();

    return unsubscribe;
  }, [isRateLimitModalOpen, setRateLimitModalOpen]);

  const handleCloseModal = () => {
    const state = rateLimitManager.getState();
    if (!state.isBlocked) {
      setRateLimitModalOpen(false);
    }
  };

  return {
    isOpen: isRateLimitModalOpen,
    onClose: handleCloseModal
  };
}
