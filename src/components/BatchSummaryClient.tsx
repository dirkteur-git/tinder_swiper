"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Pencil,
  RotateCcw,
  Send,
  X
} from "lucide-react";
import type { Candidate, Decision, Vote } from "@/lib/types";
import {
  commitDraftsForBatch,
  deleteVote,
  fetchMyVotesForBatch,
  fetchOpenCandidatesByBatch
} from "@/lib/candidates";
import * as haptic from "@/lib/haptic";

interface Props {
  batchId: string;
  batchTitle: string;
  klantNaam: string | null;
  meetingDatum: string | null;
  isFollowup: boolean;
  userEmail: string;
}

interface Row {
  candidate: Candidate | null;
  vote: Vote;
}

export function BatchSummaryClient({
  batchId,
  batchTitle,
  klantNaam,
  meetingDatum,
  isFollowup,
  userEmail
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cands, vs] = await Promise.all([
        fetchOpenCandidatesByBatch(batchId),
        fetchMyVotesForBatch(batchId, userEmail)
      ]);
      setCandidates(cands);
      setVotes(vs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon categorie niet laden.");
    } finally {
      setLoading(false);
    }
  }, [batchId, userEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pak per candidate de meest recente vote
  const rows: Row[] = candidates.map((c) => {
    const latest = votes
      .filter((v) => v.candidateId === c.id)
      .sort((a, b) => (a.votedAt > b.votedAt ? -1 : 1))[0];
    return { candidate: c, vote: latest } as Row;
  });

  const decided = rows.filter((r) => r.vote);
  const undecided = rows.filter((r) => !r.vote);
  const drafts = decided.filter((r) => r.vote.isDraft);
  const yesCount = decided.filter((r) => r.vote.decision === "yes").length;
  const noCount = decided.filter((r) => r.vote.decision === "no").length;
  const maybeCount = decided.filter((r) => r.vote.decision === "maybe").length;
  const allDone = candidates.length > 0 && undecided.length === 0;
  const hasDrafts = drafts.length > 0;
  const alreadySent = decided.length > 0 && drafts.length === 0;

  async function handleUndoOne(voteId: string) {
    haptic.tick();
    try {
      await deleteVote(voteId);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Verwijderen mislukt: ${e.message}`
          : "Verwijderen mislukt."
      );
    }
  }

  async function handleSend() {
    if (sending || !hasDrafts) return;
    setSending(true);
    haptic.success();
    try {
      const n = await commitDraftsForBatch(batchId, userEmail);
      setSentCount(n);
      window.setTimeout(() => router.push("/"), 1800);
    } catch (e) {
      setSending(false);
      setError(
        e instanceof Error ? `Verzenden mislukt: ${e.message}` : "Verzenden mislukt."
      );
    }
  }

  return (
    <div className="min-h-[100dvh] bg-bg pb-32">
      <header className="safe-top safe-x sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        <Link
          href={`/batch/${batchId}`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Terug naar categorie"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
            {isFollowup && (
              <span className="rounded-full bg-vondr-pop/[0.12] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-vondr-pop">
                Afstemming
              </span>
            )}
            Samenvatting
          </div>
          <h1 className="truncate text-sm font-semibold text-vondr-dark-blue">
            {batchTitle}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-[28rem] px-vondr-l">
        <section className="pt-vondr-xl">
          <div className="text-[11px] font-medium text-ink-500">
            {klantNaam ?? "—"}
            {meetingDatum ? ` · ${formatDate(meetingDatum)}` : ""}
          </div>
          <h2 className="mt-vondr-l text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-vondr-dark-blue">
            <SummaryHeadline
              loading={loading}
              total={candidates.length}
              yes={yesCount}
              no={noCount}
              maybe={maybeCount}
              undecided={undecided.length}
            />
          </h2>
        </section>

        {error && (
          <div className="mt-vondr-l rounded-vondr-l bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            {error}
          </div>
        )}

        <section className="pt-vondr-xl">
          {loading ? (
            <ul className="space-y-2">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="h-16 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line"
                />
              ))}
            </ul>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-ink-500">
              Deze categorie heeft geen suggesties meer.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <SummaryRow
                  key={r.candidate?.id ?? Math.random()}
                  row={r}
                  onUndo={r.vote ? () => handleUndoOne(r.vote.id) : undefined}
                />
              ))}
            </ul>
          )}
        </section>

        {!loading && undecided.length > 0 && (
          <Link
            href={`/batch/${batchId}`}
            className="mt-vondr-l flex items-center justify-between gap-3 rounded-vondr-l border-2 border-dashed border-line-strong bg-surface px-vondr-l py-4 text-ink-700 active:scale-[0.99]"
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                Nog niet klaar
              </div>
              <div className="mt-0.5 text-sm font-semibold text-vondr-dark-blue">
                {undecided.length} {undecided.length === 1 ? "suggestie" : "suggesties"} te gaan
              </div>
            </div>
            <ArrowRight size={18} className="text-ink-500" />
          </Link>
        )}
      </main>

      {/* Sticky verzend-actie */}
      {!loading && allDone && (
        <div className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-bg/95 px-vondr-l pt-vondr-m backdrop-blur">
          {alreadySent ? (
            <div className="flex items-center justify-center gap-2 rounded-vondr-l bg-accent-yes/[0.08] py-3 text-sm font-medium text-accent-yes ring-1 ring-accent-yes/30">
              <CheckCircle2 size={16} />
              Al verzonden naar het geheugen
            </div>
          ) : sentCount !== null ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 rounded-vondr-l bg-accent-yes py-3 text-sm font-semibold text-white"
            >
              <CheckCircle2 size={16} />
              {sentCount} {sentCount === 1 ? "beslissing" : "beslissingen"} verzonden — MegaVondr verwerkt nu
            </motion.div>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || !hasDrafts}
              className="flex w-full items-center justify-center gap-2 rounded-vondr-l bg-vondr-dark-blue py-4 text-base font-semibold text-white active:scale-[0.99] disabled:opacity-40"
            >
              <Send size={16} />
              {sending
                ? "Verzenden..."
                : `Verzenden naar het geheugen (${drafts.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryHeadline({
  loading,
  total,
  yes,
  no,
  maybe,
  undecided
}: {
  loading: boolean;
  total: number;
  yes: number;
  no: number;
  maybe: number;
  undecided: number;
}) {
  if (loading) return <span className="text-ink-400">…</span>;
  if (total === 0) return <>Lege categorie.</>;
  if (undecided > 0)
    return (
      <>
        Je bent er bijna —{" "}
        <span className="text-vondr-pop">{undecided} te gaan</span>.
      </>
    );

  const parts: string[] = [];
  if (yes) parts.push(`${yes}× toegevoegd`);
  if (no) parts.push(`${no}× afgewezen`);
  if (maybe) parts.push(`${maybe}× pas`);
  return (
    <>
      {parts.join(", ")}.
      <span className="block text-base font-normal text-ink-700 mt-2">
        Klaar om te verzenden naar het collectieve geheugen.
      </span>
    </>
  );
}

function SummaryRow({
  row,
  onUndo
}: {
  row: Row;
  onUndo?: () => void;
}) {
  const { candidate, vote } = row;
  const wasEdited =
    vote && (vote.editedSuggestion !== null || vote.editedAnswer !== null);
  const text =
    (vote && vote.editedSuggestion) ||
    candidate?.suggestion ||
    "[onbekende suggestie]";

  return (
    <li className="flex items-start gap-3 rounded-vondr-l bg-surface p-3 ring-1 ring-line">
      <DecisionDot decision={vote?.decision} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-vondr-dark-blue">
          {text}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          {vote ? (
            <>
              <span className={decisionColor(vote.decision)}>
                {decisionLabel(vote.decision)}
              </span>
              {vote.isDraft ? (
                <span className="text-ink-400">· nog niet verzonden</span>
              ) : (
                <span className="text-accent-yes">· verzonden</span>
              )}
              {wasEdited && (
                <span className="inline-flex items-center gap-0.5 text-accent-maybe">
                  <Pencil size={9} /> bewerkt
                </span>
              )}
            </>
          ) : (
            <span className="text-ink-500">
              Nog niet beslist — keer terug en swipe.
            </span>
          )}
        </div>
      </div>
      {onUndo && vote?.isDraft && (
        <button
          onClick={onUndo}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-500 active:scale-95 hover:text-accent-no"
          aria-label="Stem terugtrekken"
          title="Stem terugtrekken — suggestie komt weer in de stack"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </li>
  );
}

function DecisionDot({ decision }: { decision?: Decision }) {
  if (!decision)
    return (
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-line text-ink-400" />
    );
  const cls =
    decision === "yes"
      ? "bg-accent-yes/10 text-accent-yes"
      : decision === "no"
        ? "bg-accent-no/10 text-accent-no"
        : "bg-accent-maybe/10 text-accent-maybe";
  return (
    <div
      className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${cls}`}
    >
      {decision === "yes" ? (
        <Check size={13} strokeWidth={3} />
      ) : decision === "no" ? (
        <X size={13} strokeWidth={3} />
      ) : (
        <ArrowUp size={13} strokeWidth={3} />
      )}
    </div>
  );
}

function decisionLabel(d: Decision) {
  return d === "yes" ? "Toegevoegd" : d === "no" ? "Afgewezen" : "Pas — naar afstemming";
}

function decisionColor(d: Decision) {
  return d === "yes"
    ? "text-accent-yes"
    : d === "no"
      ? "text-accent-no"
      : "text-accent-maybe";
}

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}`;
}
