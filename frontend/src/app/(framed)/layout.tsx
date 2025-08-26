// src/app/(framed)/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zone encadrée",
  description: "Pages avec cadre violet",
};

export default function FramedLayout({ children }: { children: React.ReactNode }) {
  return (
    // occupe tout l’écran
    <div className="fixed inset-0 bg-purple-600">
      {/* l’épaisseur du cadre = padding ; on centre le contenu dans le rectangle noir */}
      <div className="absolute inset-0 p-12 md:p-16 lg:p-20">
        <div className="w-full h-full bg-black flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
