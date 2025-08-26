"use client";

import { forwardRef } from "react";
import clsx from "clsx";

interface MenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "danger";
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  (
    {
      variant = "primary",
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
      primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
      secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
      accent: "bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500",
      danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
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

export default MenuButton;
