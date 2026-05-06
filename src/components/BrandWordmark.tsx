"use client";

import { useState } from "react";

interface Props {
  className?: string;
  /** Hoogte in px. Brandbook: minimaal 24px op scherm. */
  height?: number;
  /**
   * Variant van het logo:
   * - 'dark' (default) — donkergekleurde wordmark (vondr.dark-blue), op lichte bg
   * - 'light' — lichtgekleurde wordmark (wit), op donkere bg
   */
  variant?: "dark" | "light";
}

/**
 * vondr wordmark — bron: brand-as-code v2026.Q2.
 * Brandbook bestandsnamen verwijzen naar de KLEUR van de wordmark, niet
 * naar de bedoelde achtergrond:
 *   - vondr-wordmark-donker.png = donker gekleurd → voor lichte achtergrond
 *   - vondr-wordmark-licht.png  = licht gekleurd  → voor donkere achtergrond
 *
 * Tekst-fallback als de PNG faalt (offline / cache-probleem) zodat de
 * branding nooit volledig verdwijnt.
 */
export function BrandWordmark({
  className = "",
  height = 28,
  variant = "dark"
}: Props) {
  // 'dark' (donker gekleurd) → vondr-wordmark-dark.png (= donker-bestand)
  // 'light' (licht gekleurd) → vondr-wordmark.png (= licht-bestand)
  const src =
    variant === "light"
      ? "/vondr-wordmark.png"
      : "/vondr-wordmark-dark.png";
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-baseline font-bold tracking-tight ${
          variant === "light" ? "text-vondr-white" : "text-vondr-dark-blue"
        } ${className}`}
        style={{ fontSize: height * 0.85, lineHeight: 1 }}
      >
        vondr
        <span
          className="ml-0.5 inline-block rounded-full bg-vondr-pop"
          style={{ width: height * 0.18, height: height * 0.18 }}
        />
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="vondr"
      height={height}
      style={{ height, width: "auto" }}
      className={`select-none ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
