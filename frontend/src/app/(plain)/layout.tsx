
export default function PlainLayout({ children }: { children: React.ReactNode }) {
  // aucun cadre ici, juste un fond noir plein écran
  return <div className="min-h-dvh w-screen bg-black">{children}</div>;
}