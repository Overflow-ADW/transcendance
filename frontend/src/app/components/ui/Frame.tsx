"use client";

import type { PropsWithChildren, HTMLAttributes } from "react";
import clsx from "clsx";

type Props = PropsWithChildren<
  {
    pad?: string; // ex: "p-12 md:p-16 lg:p-20"
  } & HTMLAttributes<HTMLDivElement>
>;

export default function Frame({ children, className, pad = "p-12 md:p-16 lg:p-20", ...rest }: Props) {
  return (
    <div
      {...rest}
      className={clsx(
        "bg-purple-600", // le violet du cadre
        "w-[90vw] max-w-[1100px] h-[85vh] max-h-[760px]",
        pad,             // l’épaisseur du cadre = padding
        className
      )}
    >
      <div className="w-full h-full bg-black">{children}</div>
    </div>
  );
}
