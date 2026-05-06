/* eslint-disable @next/next/no-img-element */

interface Props {
  className?: string;
  /** Hoogte in px. Brandbook: minimaal 24px op scherm. */
  height?: number;
  variant?: "light" | "dark";
}

/**
 * vondr wordmark — bron: brand-as-code v2026.Q2.
 * Default 'light': te gebruiken op vondr.white, wit, lichtgrijs.
 * 'dark': op vondr.dark-blue / donkere foto met effen vlak.
 */
export function BrandWordmark({
  className = "",
  height = 28,
  variant = "light"
}: Props) {
  const src =
    variant === "dark" ? "/vondr-wordmark-dark.png" : "/vondr-wordmark.png";
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
