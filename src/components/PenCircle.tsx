// A number or word circled in red pen: an imperfect hand-drawn SVG ellipse that doesn't quite close.
// No CSS border-radius circles anywhere. `dashed` is the "nothing to credit" look.

import type { ReactNode } from "react";
import { handEllipsePath } from "@/lib/handdrawn";

export function PenCircle({
  children,
  seed,
  dashed = false,
  className = "",
  strokeWidth = 2.4,
  label,
}: {
  children: ReactNode;
  seed: number;
  dashed?: boolean;
  /** Sets the size (for example "h-14 w-16") and any text styling. */
  className?: string;
  strokeWidth?: number;
  /** Accessible description, when the circled content alone isn't enough. */
  label?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center text-redpen ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <path
          d={handEllipsePath(50, 50, 46, 44, seed)}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? "7 7" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span aria-hidden={label ? true : undefined} className="relative">
        {children}
      </span>
    </span>
  );
}
