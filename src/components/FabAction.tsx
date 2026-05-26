"use client";

import { motion } from "framer-motion";

export type FabTone = "yes" | "no" | "maybe" | "neutral";
export type FabKind = "primary" | "ghost" | "small";

/**
 * Floating action-button met label-onder. Drie groottes (primary/ghost/small)
 * × vier tones (yes/no/maybe/neutral). Tone = verkeerslicht-conventie zodat
 * knoppen matchen met de swipe-overlay van dezelfde actie.
 */
export function FabAction({
  onClick,
  kind,
  tone,
  label,
  disabled,
  children
}: {
  onClick: () => void;
  kind: FabKind;
  tone: FabTone;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const sizeCls =
    kind === "primary"
      ? "h-14 w-14"
      : kind === "ghost"
        ? "h-12 w-12"
        : "h-10 w-10";

  // Primary = volle kleur achtergrond. Ghost/small = wit met gekleurde rand+icon.
  const toneCls =
    kind === "primary"
      ? tone === "yes"
        ? "bg-accent-yes text-white border-2 border-accent-yes"
        : tone === "no"
          ? "bg-accent-no text-white border-2 border-accent-no"
          : tone === "maybe"
            ? "bg-accent-maybe text-white border-2 border-accent-maybe"
            : "bg-vondr-dark-blue text-white border-2 border-vondr-dark-blue"
      : tone === "yes"
        ? "bg-surface text-accent-yes border-2 border-accent-yes/40 hover:border-accent-yes"
        : tone === "no"
          ? "bg-surface text-accent-no border-2 border-accent-no/40 hover:border-accent-no"
          : tone === "maybe"
            ? "bg-surface text-accent-maybe border-2 border-accent-maybe/40 hover:border-accent-maybe"
            : "bg-surface text-ink-500 border border-line hover:border-vondr-dark-blue";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        whileTap={{ scale: 0.92 }}
        className={`flex ${sizeCls} items-center justify-center rounded-full shadow-tile transition disabled:opacity-40 ${toneCls}`}
      >
        {children}
      </motion.button>
      <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-ink-400">
        {label}
      </span>
    </div>
  );
}
