"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import { isAllowedEmail } from "@/lib/auth-whitelist";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialError = params.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
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
    if (!trimmed || password.length < 6) {
      setError("Vul je e-mail in en kies een wachtwoord van minstens 6 tekens.");
      return;
    }
    if (!isAllowedEmail(trimmed)) {
      setError("Dit e-mailadres heeft geen toegang.");
      return;
    }

    setBusy(true);
    const supabase = getSupabase();

    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password
      });
      if (authError) {
        setBusy(false);
        if (authError.message.toLowerCase().includes("invalid")) {
          setError(
            "Email of wachtwoord klopt niet. Eerste keer? Schakel om naar 'Account aanmaken'."
          );
        } else {
          setError(authError.message);
        }
        return;
      }
      router.replace("/");
      router.refresh();
      return;
    }

    // signup
    const { data, error: authError } = await supabase.auth.signUp({
      email: trimmed,
      password
    });
    if (authError) {
      setBusy(false);
      setError(authError.message);
      return;
    }
    if (!data.session) {
      // Email-bevestiging staat aan in Supabase. Vereist actie van admin.
      setBusy(false);
      setError(
        "Account aangemaakt, maar Supabase wacht op email-bevestiging. Zet 'Confirm email' uit in Auth → Sign In / Providers → Email."
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <BrandWordmark className="text-3xl" />
          <p className="mt-3 text-sm text-ink-500">
            {mode === "signin"
              ? "Log in met je @vondr.ai-mailadres."
              : "Maak een account aan met je @vondr.ai-mailadres."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <Field
            label="E-mailadres"
            icon={<Mail size={16} className="text-ink-400" />}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="dirk@vondr.ai"
              className="flex-1 bg-transparent text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
          </Field>

          <Field
            label="Wachtwoord"
            icon={<Lock size={16} className="text-ink-400" />}
          >
            <input
              type={showPw ? "text" : "password"}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              placeholder={mode === "signup" ? "minstens 6 tekens" : ""}
              className="flex-1 bg-transparent text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded text-ink-400 active:scale-95"
              aria-label={showPw ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy
              ? "Bezig..."
              : mode === "signin"
                ? "Inloggen"
                : "Account aanmaken"}
          </button>
        </form>

        <button
          onClick={() => {
            setError(null);
            setMode((m) => (m === "signin" ? "signup" : "signin"));
          }}
          className="mt-4 w-full text-center text-xs text-ink-500 underline-offset-2 hover:underline"
        >
          {mode === "signin"
            ? "Eerste keer? Account aanmaken →"
            : "Al een account? Inloggen →"}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-ink-400">
          Toegang is voorbehouden aan Vondr-medewerkers.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink-900">
        {icon}
        {children}
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
