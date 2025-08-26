import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Transcendance',
  description: 'Plateforme de jeu en ligne',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased bg-black min-h-screen">{children}</body>
    </html>
  );
}