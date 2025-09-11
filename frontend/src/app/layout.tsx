import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib_front/store";
import { AuthProvider } from "@/lib_front/AuthContext";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { RateLimitProvider } from "@/components/ui/RateLimitProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'arial']
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false, // Désactiver le préchargement pour réduire les warnings
  fallback: ['monospace']
});

export const metadata: Metadata = {
  title: "Transcendance - Pong Game",
  description: "A modern Pong game with tournaments and multiplayer features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-black min-h-screen" suppressHydrationWarning>
        <AuthProvider>
          <AppProvider>
            <RateLimitProvider>
              {children}
              <NotificationToast />
            </RateLimitProvider>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}