import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <BrandWordmark className="text-3xl" />
      <p className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">
        Niets gevonden
      </p>
      <p className="max-w-xs text-sm text-ink-500">
        Deze pagina bestaat niet (meer). Ga terug naar je inbox.
      </p>
      <Link
        href="/inbox"
        className="mt-2 rounded-full bg-ink-900 px-6 py-2.5 text-sm font-medium text-white transition active:scale-95"
      >
        Naar inbox
      </Link>
    </div>
  );
}
