"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Pencil,
  RefreshCw,
  X
} from "lucide-react";
import {
  deleteVote,
  fetchMyVotesWithCandidates,
  type VoteWithCandidate
} from "@/lib/candidates";
import type { Decision } from "@/lib/types";
import { BrandWordmark } from "./BrandWordmark";
import * as haptic from "@/lib/haptic";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  userEmail: string;
}

export function HistoryClient({ userEmail }: Props) {
  const [items, setItems] = useState<VoteWithCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMyVotesWithCandidates(userEmail);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon geschiedenis niet laden."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUndo(voteId: string) {
    if (!confirm("Deze stem terugtrekken? De kaart komt weer in je stack.")) {
      return;
    }
    haptic.tick();
    setDeleting(voteId);
    try {
      await deleteVote(voteId);
      setItems((prev) =>
        prev ? prev.filter((it) => it.vote.id !== voteId) : prev
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `Verwijderen mislukt: ${e.message}`
          : "Verwijderen mislukt."
      );
      window.setTimeout(() => setError(null), 3500);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-bg pb-12">
      <header className="safe-top safe-x sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Terug"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-vondr-dark-blue">
            Geschiedenis
          </h1>
          <p className="text-[11px] text-ink-500">
            Je swipes, meest recent eerst
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95 disabled:opacity-40"
          aria-label="Vernieuwen"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="px-vondr-m pt-vondr-l">
        {error && (
          <div className="mb-3 rounded-vondr-l bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            {error}
          </div>
        )}

        {loading && !items && (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
            <div className="h-16 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
            <div className="h-16 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
          </div>
        )}

        {!loading && items && items.length === 0 && (
          <div className="rounded-vondr-l border border-dashed border-line-strong bg-surface p-6 text-center">
            <p className="text-sm text-ink-500">
              Nog geen swipes. Ga naar de stack en zwiep ze er doorheen.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white active:scale-95"
            >
              Naar stack
            </Link>
          </div>
        )}

        <ul className="space-y-2">
          {items?.map(({ vote, candidate }) => {
            const isOpen = expanded === vote.id;
            const wasEdited =
              vote.editedSuggestion !== null || vote.editedAnswer !== null;
            return (
              <li
                key={vote.id}
                className="overflow-hidden rounded-vondr-l bg-surface ring-1 ring-line"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : vote.id)}
                  className="flex w-full items-start gap-3 p-3 text-left active:bg-bg/60"
                >
                  <DecisionIcon decision={vote.decision} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                        {decisionLabel(vote.decision)}
                      </span>
                      {wasEdited && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-maybe/[0.1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent-maybe">
                          <Pencil size={9} /> bewerkt
                        </span>
                      )}
                      {candidate?.type && (
                        <span className="rounded-full bg-bg px-1.5 py-0.5 text-[9px] font-medium text-ink-500 ring-1 ring-line">
                          {candidate.type}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-vondr-dark-blue">
                      {vote.editedSuggestion ||
                        candidate?.suggestion ||
                        `[verwijderde kaart · ${vote.externalId}]`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {formatRelative(vote.votedAt)}
                      {candidate?.klantNaam ? ` · ${candidate.klantNaam}` : ""}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`mt-1 flex-shrink-0 text-ink-400 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-t border-line"
                    >
                      <div className="space-y-3 p-3 text-sm">
                        {vote.editedSuggestion && (
                          <DiffField
                            label="Vraag (bewerkt)"
                            original={candidate?.suggestion ?? null}
                            edited={vote.editedSuggestion}
                          />
                        )}
                        {(vote.editedAnswer || candidate?.proposedAnswer) && (
                          <DiffField
                            label={
                              vote.editedAnswer
                                ? "Antwoord (bewerkt)"
                                : "Antwoord"
                            }
                            original={candidate?.proposedAnswer ?? null}
                            edited={vote.editedAnswer}
                          />
                        )}
                        {candidate?.klantQuote && (
                          <Block label="Klant-quote">
                            <p className="italic text-ink-700">
                              &ldquo;{candidate.klantQuote}&rdquo;
                            </p>
                          </Block>
                        )}
                        {candidate?.bron && (
                          <Block label="Bron">
                            <p className="text-ink-700">{candidate.bron}</p>
                          </Block>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-ink-400">
                            {formatAbsolute(vote.votedAt)}
                          </span>
                          <button
                            onClick={() => void handleUndo(vote.id)}
                            disabled={deleting === vote.id}
                            className="rounded-full bg-bg px-3 py-1 text-[11px] text-accent-no ring-1 ring-accent-no/30 active:scale-95 disabled:opacity-40"
                          >
                            {deleting === vote.id
                              ? "Bezig..."
                              : "Stem terugtrekken"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 text-center">
          <BrandWordmark height={18} className="opacity-40" />
        </div>
      </main>
    </div>
  );
}

function DecisionIcon({ decision }: { decision: Decision }) {
  if (decision === "yes")
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-yes/10 text-accent-yes ring-1 ring-accent-yes/30">
        <Check size={14} strokeWidth={3} />
      </div>
    );
  if (decision === "no")
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-no/10 text-accent-no ring-1 ring-accent-no/30">
        <X size={14} strokeWidth={3} />
      </div>
    );
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-maybe/10 text-accent-maybe ring-1 ring-accent-maybe/30">
      <ArrowUp size={14} strokeWidth={3} />
    </div>
  );
}

function decisionLabel(d: Decision) {
  return d === "yes" ? "Goedgekeurd" : d === "no" ? "Afgewezen" : "Later";
}

function Block({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DiffField({
  label,
  original,
  edited
}: {
  label: string;
  original: string | null;
  edited: string | null;
}) {
  if (!edited) {
    return original ? (
      <Block label={label}>
        <p className="text-ink-700">{original}</p>
      </Block>
    ) : null;
  }
  return (
    <Block label={label}>
      {original && original !== edited && (
        <p className="text-ink-400 line-through decoration-ink-400/50">
          {original}
        </p>
      )}
      <p className="font-medium text-vondr-dark-blue">{edited}</p>
    </Block>
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
  return formatAbsolute(iso);
}

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${h}:${m}`;
}
