"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import { isAllowedEmail } from "@/lib/auth-whitelist";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const initialError = params.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialError === "not-allowed") {
      setError("Dit e-mailadres heeft geen toegang.");
    } else if (initialError === "auth") {
      setError("Inloggen mislukt — probeer opnieuw.");
    }
  }, [initialError]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    if (!isAllowedEmail(trimmed)) {
      setError("Dit e-mailadres heeft geen toegang.");
      return;
    }

    setStatus("sending");
    const supabase = getSupabase();
    const appUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`
      }
    });

    if (authError) {
      setStatus("error");
      setError(authError.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <BrandWordmark className="text-3xl" />
          <p className="mt-3 text-sm text-ink-500">
            Log in met je @vondr.ai-mailadres.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              E-mailadres
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink-900">
              <Mail size={16} className="text-ink-400" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "sending" || status === "sent"}
                placeholder="dirk@vondr.ai"
                className="flex-1 bg-transparent text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            className="w-full rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {status === "sending"
              ? "Versturen..."
              : status === "sent"
                ? "Magic link verstuurd"
                : "Stuur magic link"}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {status === "sent" && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-yes/[0.08] p-3 text-sm text-ink-700 ring-1 ring-accent-yes/30">
            <CheckCircle2
              size={16}
              className="mt-0.5 flex-shrink-0 text-accent-yes"
            />
            <p>
              Check je inbox op{" "}
              <span className="font-semibold">{email.trim()}</span> en klik op
              de link om in te loggen.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-ink-400">
          Toegang is voorbehouden aan Vondr-medewerkers.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
