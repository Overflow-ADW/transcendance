// src/app/components/ui/TransitionCurtain.tsx
"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

type Props = { show: boolean; onDone?: () => void };

export default function TransitionCurtain({ show, onDone }: Props) {
  const el = useMemo(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.style.position = "fixed";
    node.style.inset = "0";
    node.style.zIndex = "2147483647"; // au-dessus de tout
    node.style.pointerEvents = "none";
    return node;
  }, []);

  useEffect(() => {
    if (!el || !show || typeof document === "undefined") return;
    document.body.appendChild(el);
    const t = setTimeout(() => onDone?.(), 430);
    return () => {
      clearTimeout(t);
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, [el, show, onDone]);

  if (!show || !el) return null;

  return createPortal(
    <div className="animate-border-shrink">
      {/* bordure violette qui “se rétracte” */}
      <div className="absolute inset-6 md:inset-10 lg:inset-14 border-8 border-purple-600 rounded-[1.5rem]" />
    </div>,
    el
  );
}
