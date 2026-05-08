"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <div className="text-3xl">⚠</div>
      <h1 className="text-xl font-semibold text-vondr-dark-blue">
        Er ging iets mis
      </h1>
      <p className="max-w-xs text-sm text-ink-500">
        {error.message || "Onverwachte fout."}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white active:scale-95"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
