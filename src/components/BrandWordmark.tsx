/* eslint-disable @next/next/no-img-element */

interface Props {
  className?: string;
  /** Hoogte in px. Brandbook: minimaal 24px op scherm. */
  height?: number;
  /**
   * Variant van het logo:
   * - 'blue' (default) — babyblue wordmark, te gebruiken op vondr.white
   * - 'dark'  — donker wordmark voor lichte achtergrond
   * - 'light' — licht wordmark voor donkere achtergrond
   */
  variant?: "blue" | "dark" | "light";
}

/**
 * vondr wordmark — bron: brand-as-code v2026.Q2.
 * Default = babyblue (`vondr-wordmark-blue.png` = vondr-logo-babyblue.png).
 */
export function BrandWordmark({
  className = "",
  height = 28,
  variant = "blue"
}: Props) {
  const src =
    variant === "light"
      ? "/vondr-wordmark-dark.png"
      : variant === "dark"
        ? "/vondr-wordmark.png"
        : "/vondr-wordmark-blue.png";
  return (
    <img
      src={src}
      alt="vondr"
      height={height}
      style={{ height, width: "auto" }}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
