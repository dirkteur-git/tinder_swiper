export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-black tracking-tight text-ink-900 ${className}`}
    >
      vondr
      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-yes" />
    </span>
  );
}
