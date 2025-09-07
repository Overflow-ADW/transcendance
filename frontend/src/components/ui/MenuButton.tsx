"use client";

export function MenuButton({
  label,
  onClick,
  variant = "default",
  active = false
}: {
  label: string;
  onClick?: () => void;
  variant?: "welcome" | "default" | "primary" | "holographic";
  active?: boolean;
}) {
  const base =
    "w-full py-6 px-8 text-2xl font-bold rounded-lg transition-all duration-300 tracking-wider border-2 relative overflow-hidden";
  
  const styles: Record<string, string> = {
    welcome:
      "bg-black border-purple-500 text-yellow-400 hover:bg-purple-500/10 focus:outline-none",
    default:
      "bg-black border-white text-white hover:bg-white hover:text-black focus:outline-none",
    primary:
      "bg-purple-600 border-white text-white hover:bg-white hover:text-black focus:outline-none",
    holographic:
      "bg-black border-[#8A00C4] text-white hover:bg-[#8A00C4] hover:text-white hover:scale-105 hover:shadow-[0_0_20px_rgba(138,0,196,0.5)] focus:outline-none before:content-[''] before:absolute before:top-[-50%] before:left-[-50%] before:w-[200%] before:h-[200%] before:bg-gradient-to-r before:from-transparent before:via-transparent before:to-[rgba(138,0,196,0.3)] before:transform before:rotate-[-45deg] before:transition-all before:duration-500 before:opacity-0 hover:before:opacity-100 hover:before:translate-y-full"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        base, 
        styles[variant], 
        active ? "ring-2 ring-white/50 bg-white/5" : "",
        variant === "holographic" ? "group" : ""
      ].join(" ")}
      style={variant === "holographic" ? {
        position: "relative",
        zIndex: 1
      } : undefined}
    >
      <span className="relative z-10">{label}</span>
    </button>
  );
}