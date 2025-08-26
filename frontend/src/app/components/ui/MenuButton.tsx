"use client";

import { forwardRef } from "react";
import clsx from "clsx";

interface MenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "welcome" | "default";
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  (
    {
      variant = "default",
      size = "md",
      isActive = false,
      icon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      welcome: "bg-black border-purple-500 text-yellow-400 hover:bg-purple-500/10 focus:outline-none",
      default: "bg-black border-white text-white hover:bg-white/10 focus:outline-none",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm rounded-md",
      md: "px-4 py-2 text-base rounded-lg",
      lg: "px-6 py-3 text-lg rounded-xl",
    };

    const activeClasses = isActive ? "ring-2 ring-white ring-opacity-50" : "";

    return (
      <button
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          activeClasses,
          className
        )}
        disabled={disabled}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

MenuButton.displayName = "MenuButton";

export default MenuButton ;
