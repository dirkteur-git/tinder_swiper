"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  Check,
  Clock,
  Layers,
  Pencil,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
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
      setRecent(mine.slice(0, 4));
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

  return (
    <div className="min-h-[100dvh] bg-bg pb-12">
      <header className="safe-top safe-x relative z-30 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        <BrandWordmark height={26} />
        <div className="flex-1" />
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition active:scale-95 disabled:opacity-40"
          aria-label="Vernieuwen"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
        <Link
          href="/history"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition active:scale-95"
          aria-label="Geschiedenis"
        >
          <Clock size={18} />
        </Link>
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition active:scale-95"
          aria-label="Instellingen"
        >
          <SettingsIcon size={18} />
        </Link>
      </header>

      {/* Pull-to-refresh indicator */}
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

      <main className="mx-auto max-w-md space-y-vondr-l px-vondr-m pt-vondr-l">
        {/* Welcome */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Hoi {displayName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-vondr-dark-blue">
            {stats.open > 0
              ? `${stats.open} ${stats.open === 1 ? "kaart" : "kaarten"} wachten op je stem.`
              : "Niks te swipen — even pauze."}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            vondr stelt FAQ-kandidaten voor op basis van klantgesprekken. Jij
            beslist met één gebaar — links is nee, rechts is ja, omhoog is
            later. Tap een kaart om de tekst te bewerken vóór je goedkeurt.
          </p>
        </section>

        {/* Primary CTA */}
        <Link
          href="/swipe"
          className="group flex items-center gap-3 rounded-vondr-l bg-vondr-dark-blue px-vondr-l py-vondr-l text-white shadow-card transition active:scale-[0.99]"
        >
          <Layers size={28} strokeWidth={2.2} className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">
              {stats.open > 0 ? "Begin met swipen" : "Stack openen"}
            </div>
            <div className="text-xs text-white/70">
              {loading
                ? "laden..."
                : stats.open > 0
                  ? `${stats.open} open ${stats.open === 1 ? "kandidaat" : "kandidaten"}`
                  : "geen open kandidaten"}
            </div>
          </div>
          <ArrowRight
            size={18}
            className="flex-shrink-0 transition group-active:translate-x-0.5"
          />
        </Link>

        {error && (
          <div className="rounded-vondr-l bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            {error}
          </div>
        )}

        {/* Stats */}
        <section>
          <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Wat heb je gedaan?
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label="Goedgekeurd"
              value={stats.yes}
              color="yes"
              icon={<Check size={14} strokeWidth={3} />}
            />
            <Stat
              label="Afgewezen"
              value={stats.no}
              color="no"
              icon={<X size={14} strokeWidth={3} />}
            />
            <Stat
              label="Later"
              value={stats.maybe}
              color="maybe"
              icon={<ArrowUp size={14} strokeWidth={3} />}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stat
              label="Totaal beslist"
              value={totalDone}
              color="neutral"
              icon={<Sparkles size={14} />}
            />
            <Stat
              label="Bewerkt vóór ja"
              value={stats.edited}
              color="pop"
              icon={<Pencil size={14} />}
            />
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              Jouw laatste swipes
            </h2>
            {recent.length > 0 && (
              <Link
                href="/history"
                className="text-[11px] font-medium text-vondr-pop"
              >
                Alles zien →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-14 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
              <div className="h-14 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-vondr-l border border-dashed border-line-strong bg-surface p-4 text-center">
              <p className="text-sm text-ink-500">
                Nog geen swipes — begin hierboven.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map(({ vote, candidate }) => (
                <li
                  key={vote.id}
                  className="flex items-start gap-3 rounded-vondr-l bg-surface p-3 ring-1 ring-line"
                >
                  <DecisionDot decision={vote.decision} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-vondr-dark-blue">
                      {vote.editedSuggestion ||
                        candidate?.suggestion ||
                        `[${vote.externalId}]`}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
                      <span>{formatRelative(vote.votedAt)}</span>
                      {(vote.editedSuggestion || vote.editedAnswer) && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-maybe/[0.1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent-maybe">
                          <Pencil size={9} /> bewerkt
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pt-vondr-l text-center">
          <BrandWordmark height={18} className="opacity-40" />
          <p className="mt-2 text-[11px] text-ink-400">
            Een gids heeft altijd een plan.
          </p>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  icon
}: {
  label: string;
  value: number;
  color: "yes" | "no" | "maybe" | "pop" | "neutral";
  icon: React.ReactNode;
}) {
  const cls =
    color === "yes"
      ? "bg-accent-yes/10 text-accent-yes ring-accent-yes/30"
      : color === "no"
        ? "bg-accent-no/10 text-accent-no ring-accent-no/30"
        : color === "maybe"
          ? "bg-accent-maybe/10 text-accent-maybe ring-accent-maybe/30"
          : color === "pop"
            ? "bg-vondr-pop/10 text-vondr-pop ring-vondr-pop/30"
            : "bg-surface text-ink-700 ring-line";
  return (
    <div className={`rounded-vondr-l p-3 ring-1 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
        <span className="opacity-80">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold leading-none text-vondr-dark-blue">
        {value}
      </div>
    </div>
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
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${cls}`}
    >
      {decision === "yes" ? (
        <Check size={14} strokeWidth={3} />
      ) : decision === "no" ? (
        <X size={14} strokeWidth={3} />
      ) : (
        <ArrowUp size={14} strokeWidth={3} />
      )}
    </div>
  );
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
