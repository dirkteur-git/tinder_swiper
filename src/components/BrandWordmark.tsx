export function BrandWordmark({ className = "" }: { className?: string }) {
  // PoC placeholder — vervang door SVG van vondr.ai (zie README)
  return (
    <span
      className={`inline-flex items-baseline font-black tracking-tight text-steel-100 ${className}`}
    >
      vondr
      <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-yes" />
    </span>
  );
}
