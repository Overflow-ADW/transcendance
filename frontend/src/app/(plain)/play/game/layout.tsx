// src/app/(plain)/play/game/layout.tsx
import { Suspense } from 'react';

// Ce layout n'est utilisé que pour la route 'game', il a donc son propre titre si tu le souhaites.
export const metadata = {
  title: "Jeu de Pong - Transcendance",
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  // Le fallback est ce qui s'affichera pendant le chargement côté serveur.
  return <Suspense fallback={<div>Chargement du jeu...</div>}>{children}</Suspense>;
}