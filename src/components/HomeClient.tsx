"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  Check,
  Clock,
  Pencil,
  RefreshCw,
  Settings as SettingsIcon,
  X
} from "lucide-react";
import {
  fetchMyVotesWithCandidates,
  fetchOpenCandidates,
  type VoteWithCandidate
} from "@/lib/candidates";
import { BrandWordmark } from "./BrandWordmark";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import * as haptic from "@/lib/haptic";

interface Props {
  userEmail: string;
  displayName: string;
}

interface Stats {
  open: number;
  yes: number;
  no: number;
  maybe: number;
  edited: number;
}

export function HomeClient({ userEmail, displayName }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    open: 0,
    yes: 0,
    no: 0,
    maybe: 0,
    edited: 0
  });
  const [recent, setRecent] = useState<VoteWithCandidate[]>([]);

  const load = useCallback(async () => {
    try {
      const [open, mine] = await Promise.all([
        fetchOpenCandidates(),
        fetchMyVotesWithCandidates(userEmail)
      ]);
      const counts = mine.reduce(
        (acc, { vote }) => {
          acc[vote.decision] = (acc[vote.decision] ?? 0) + 1;
          if (vote.editedSuggestion || vote.editedAnswer) acc.edited++;
          return acc;
        },
        { yes: 0, no: 0, maybe: 0, edited: 0 } as Record<string, number>
      );
      setStats({
        open: open.length,
        yes: counts.yes,
        no: counts.no,
        maybe: counts.maybe,
        edited: counts.edited
      });
      setRecent(mine.slice(0, 5));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon gegevens niet laden.");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const ptr = usePullToRefresh({
    onRefresh: async () => {
      haptic.tick();
      await load();
    }
  });

  const totalDone = stats.yes + stats.no + stats.maybe;
  const firstName = capitalize(displayName.split(/[._-]/)[0]);

  return (
    <div className="min-h-[100dvh] bg-bg pb-20">
      {/* Minimal header */}
      <header className="safe-top safe-x relative z-30 flex items-center gap-1 pb-3">
        <BrandWordmark height={22} />
        <div className="flex-1" />
        <IconBtn
          onClick={() => void load()}
          disabled={loading}
          label="Vernieuwen"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </IconBtn>
        <IconBtnLink href="/history" label="Geschiedenis">
          <Clock size={16} />
        </IconBtnLink>
        <IconBtnLink href="/settings" label="Instellingen">
          <SettingsIcon size={16} />
        </IconBtnLink>
      </header>

      {/* Pull-to-refresh */}
      {(ptr.pullDistance > 0 || ptr.refreshing) && (
        <motion.div
          className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex justify-center"
          style={{
            paddingTop: `calc(env(safe-area-inset-top) + ${ptr.pullDistance}px)`
          }}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-tile ring-1 ring-line ${
              ptr.armed || ptr.refreshing
                ? "text-vondr-pop"
                : "text-ink-500"
            }`}
          >
            <RefreshCw
              size={16}
              className={ptr.refreshing ? "animate-spin" : ""}
            />
          </div>
        </motion.div>
      )}

      <main className="mx-auto max-w-[28rem] px-vondr-l">
        {/* HERO */}
        <section className="pt-vondr-xl">
          <p className="text-sm font-medium text-ink-500">Hoi {firstName}.</p>

          <h1 className="mt-vondr-l text-[2rem] font-semibold leading-[1.15] tracking-tight text-vondr-dark-blue sm:text-[2.25rem]">
            Jouw beslissingen worden het{" "}
            <span className="text-vondr-pop">collectieve geheugen</span> van
            vondr.
          </h1>

          <p className="mt-vondr-m text-base leading-relaxed text-ink-700">
            <ContributionLine
              loading={loading}
              yes={stats.yes}
              edited={stats.edited}
              totalDone={totalDone}
            />
          </p>
        </section>

        {/* Primary CTA */}
        <section className="pt-vondr-xl">
          {stats.open > 0 ? (
            <Link
              href="/swipe"
              className="group flex items-center justify-between gap-4 rounded-vondr-l bg-vondr-dark-blue px-vondr-l py-5 text-white shadow-card transition active:scale-[0.99]"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-vondr-light-blue">
                  Wachten op je oordeel
                </div>
                <div className="mt-1 text-xl font-semibold leading-tight">
                  {stats.open}{" "}
                  {stats.open === 1 ? "kandidaat" : "kandidaten"}
                </div>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-vondr-pop text-white">
                <ArrowRight size={20} strokeWidth={2.4} />
              </span>
            </Link>
          ) : (
            <div className="rounded-vondr-l border border-line bg-surface px-vondr-l py-5 text-ink-500">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                Geen open kandidaten
              </div>
              <p className="mt-1 text-sm">
                Trek omlaag om te vernieuwen — of wacht tot er nieuwe binnenkomen.
              </p>
            </div>
          )}
        </section>

        {error && (
          <div className="mt-vondr-l rounded-vondr-l bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            {error}
          </div>
        )}

        {/* Spoor */}
        <section className="pt-vondr-xxl">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
              Jouw spoor
            </h2>
            {recent.length > 0 && (
              <Link
                href="/history"
                className="text-[12px] font-medium text-vondr-pop hover:underline"
              >
                Alles zien →
              </Link>
            )}
          </div>

          {loading ? (
            <ul className="mt-vondr-m space-y-vondr-m">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-3 w-3 flex-shrink-0 animate-pulse rounded-full bg-line" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-line" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
                  </div>
                </li>
              ))}
            </ul>
          ) : recent.length === 0 ? (
            <p className="mt-vondr-m text-sm text-ink-500">
              Nog geen spoor. Begin hierboven met swipen.
            </p>
          ) : (
            <ul className="mt-vondr-m divide-y divide-line">
              {recent.map(({ vote, candidate }) => (
                <li
                  key={vote.id}
                  className="flex items-start gap-3 py-vondr-m"
                >
                  <DecisionDot decision={vote.decision} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-medium leading-snug text-vondr-dark-blue">
                      {vote.editedSuggestion ||
                        candidate?.suggestion ||
                        `[${vote.externalId}]`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      <span className={decisionColor(vote.decision)}>
                        {decisionLabel(vote.decision)}
                      </span>
                      {" · "}
                      {formatRelative(vote.votedAt)}
                      {(vote.editedSuggestion || vote.editedAnswer) && (
                        <>
                          {" · "}
                          <span className="inline-flex items-center gap-0.5 text-accent-maybe">
                            <Pencil size={9} /> bewerkt
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer mantra */}
        <footer className="pt-vondr-xxl">
          <p className="text-[13px] italic leading-relaxed text-ink-500">
            &ldquo;Jij instrueert, AI voert uit, jij beslist.&rdquo;
          </p>
          <p className="mt-1 text-[11px] text-ink-400">vondr · brand-as-code</p>
        </footer>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────── */

function ContributionLine({
  loading,
  yes,
  edited,
  totalDone
}: {
  loading: boolean;
  yes: number;
  edited: number;
  totalDone: number;
}) {
  if (loading) return <span className="text-ink-400">…</span>;

  if (totalDone === 0) {
    return (
      <>
        Je hebt nog niets bijgedragen. Elke <b>ja</b> is een stuk kennis dat
        morgen niemand meer hoeft op te zoeken.
      </>
    );
  }

  const yesText =
    yes === 0
      ? null
      : yes === 1
        ? "1 antwoord toegevoegd"
        : `${yes} antwoorden toegevoegd`;
  const editedText =
    edited > 0
      ? edited === 1
        ? "1 bewerkt voordat je goedkeurde"
        : `${edited} bewerkt voordat je goedkeurde`
      : null;

  return (
    <>
      Tot nu toe:{" "}
      {yesText && (
        <>
          <b className="text-vondr-dark-blue">{yesText}</b>
        </>
      )}
      {yesText && editedText && ", waarvan "}
      {editedText && <b className="text-vondr-dark-blue">{editedText}</b>}
      {(yesText || editedText) && "."}
      {!yesText && !editedText && (
        <>
          <b className="text-vondr-dark-blue">{totalDone} beslissingen</b>{" "}
          gemaakt — geen daarvan voegde toe aan het geheugen, maar elk telt.
        </>
      )}
    </>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:text-vondr-dark-blue active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function IconBtnLink({
  href,
  label,
  children
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:text-vondr-dark-blue active:scale-95"
    >
      {children}
    </Link>
  );
}

function DecisionDot({ decision }: { decision: "yes" | "no" | "maybe" }) {
  const cls =
    decision === "yes"
      ? "bg-accent-yes/10 text-accent-yes"
      : decision === "no"
        ? "bg-accent-no/10 text-accent-no"
        : "bg-accent-maybe/10 text-accent-maybe";
  return (
    <div
      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${cls}`}
    >
      {decision === "yes" ? (
        <Check size={12} strokeWidth={3} />
      ) : decision === "no" ? (
        <X size={12} strokeWidth={3} />
      ) : (
        <ArrowUp size={12} strokeWidth={3} />
      )}
    </div>
  );
}

function decisionLabel(d: "yes" | "no" | "maybe") {
  return d === "yes"
    ? "Toegevoegd aan het geheugen"
    : d === "no"
      ? "Afgewezen"
      : "Voor later";
}

function decisionColor(d: "yes" | "no" | "maybe") {
  return d === "yes"
    ? "text-accent-yes"
    : d === "no"
      ? "text-accent-no"
      : "text-accent-maybe";
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "zojuist";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min geleden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}u geleden`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d geleden`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}`;
}
