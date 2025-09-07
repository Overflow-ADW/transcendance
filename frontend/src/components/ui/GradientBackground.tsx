// src/components/ui/GradientBackground.tsx
"use client";

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientBackground({ children, className = "" }: GradientBackgroundProps) {
  return (
    <div 
      className={`min-h-screen ${className}`}
      style={{ 
        backgroundImage: 'linear-gradient(to right, #8A00C4, #2323FF, #8A00C4, #2323FF, #8A00C4)',
        backgroundSize: '600%',
        backgroundPosition: '0 0',
        boxShadow: 'inset 0 0 5em rgba(0,0,0,.5)',
        animation: 'gradients 20s infinite'
      }}
    >
      <style jsx>{`
        @keyframes gradients {
          0%   { background-position: 0 0; }
          25%  { background-position: 50% 0; }
          50%  { background-position: 90% 0; }
          60%  { background-position: 60% 0; }
          75%  { background-position: 40% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
      {children}
    </div>
  );
}