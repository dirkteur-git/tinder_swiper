"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ListChecks,
  Plus,
  RotateCcw,
  X
} from "lucide-react";
import type { Candidate, Decision, PeerVote, Vote } from "@/lib/types";
import {
  castVote,
  deleteVote,
  fetchMyVotesForBatch,
  fetchOpenCandidatesByBatch,
  fetchPeerVotesForBatch
} from "@/lib/candidates";
import { SwipeCard, SwipeCardHandle, SwipeDirection } from "./SwipeCard";
import { EditSheet } from "./EditSheet";
import * as haptic from "@/lib/haptic";

interface Props {
  batchId: string;
  batchTitle: string;
  klantNaam: string | null;
  meetingDatum: string | null;
  isFollowup: boolean;
  userEmail: string;
}

interface HistoryItem {
  candidate: Candidate;
  voteId: string;
  decision: Decision;
}

export function BatchStackClient({
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
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [stack, setStack] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [peerByCandidate, setPeerByCandidate] = useState<
    Map<string, PeerVote>
  >(new Map());
  const topCardRef = useRef<SwipeCardHandle | null>(null);

  const load = useCallback(async () => {
    try {
      const [cands, votes, peers] = await Promise.all([
        fetchOpenCandidatesByBatch(batchId),
        fetchMyVotesForBatch(batchId, userEmail),
        isFollowup
          ? fetchPeerVotesForBatch(batchId, userEmail)
          : Promise.resolve([] as PeerVote[])
      ]);
      const decided = latestDecisionPerCandidate(votes);
      const remaining = cands.filter(
        (c) => !decided.has(c.id) || decided.get(c.id) === "maybe"
      );
      const peerMap = new Map<string, PeerVote>();
      for (const p of peers) peerMap.set(p.candidateId, p);
      setAllCandidates(cands);
      setStack(remaining);
      setPeerByCandidate(peerMap);
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon categorie niet laden.");
      setLoading(false);
    }
  }, [batchId, userEmail, isFollowup]);

  useEffect(() => {
    void load();
  }, [load]);

  // Bij aankomst: als alle kaarten al beslist zijn (gebruiker komt
  // bijvoorbeeld terug via deeplink), stuur direct door naar summary.
  useEffect(() => {
    if (!loading && stack.length === 0 && allCandidates.length > 0) {
      router.replace(`/batch/${batchId}/summary`);
    }
  }, [loading, stack.length, allCandidates.length, batchId, router]);

  const total = allCandidates.length;
  const remaining = stack.length;
  const done = total - remaining;
  const progress = total === 0 ? 0 : (done / total) * 100;

  async function commitDecision(
    c: Candidate,
    decision: Decision,
    edits?: { suggestion?: string; answer?: string }
  ) {
    setStack((s) => s.filter((x) => x.id !== c.id));
    try {
      const vote = await castVote(
        {
          candidateId: c.id,
          externalId: c.externalId,
          decision,
          editedSuggestion: edits?.suggestion ?? null,
          editedAnswer: edits?.answer ?? null,
          isDraft: true // ← batch-flow: draft tot 'verzenden' op summary
        },
        userEmail
      );
      setHistory((h) => [...h, { candidate: c, voteId: vote.id, decision }]);

      // Laatste kaart? Stuur naar summary.
      const nextRemaining = stack.length - 1;
      if (nextRemaining <= 0) {
        haptic.success();
        window.setTimeout(() => {
          router.push(`/batch/${batchId}/summary`);
        }, 350);
      }
    } catch (e) {
      setStack((s) => [c, ...s]);
      setError(
        e instanceof Error
          ? `Stem niet opgeslagen: ${e.message}`
          : "Stem niet opgeslagen."
      );
      window.setTimeout(() => setError(null), 4000);
    }
  }

  function onSwiped(_dir: SwipeDirection, decision: Decision, c: Candidate) {
    void commitDecision(c, decision);
  }

  async function handleUndo() {
    const last = history[history.length - 1];
    if (!last) return;
    haptic.tick();
    setHistory((h) => h.slice(0, -1));
    setStack((s) => [last.candidate, ...s]);
    try {
      await deleteVote(last.voteId);
    } catch {
      /* niet kritiek */
    }
  }

  function handleEditApprove(edits: {
    suggestion?: string;
    answer?: string;
  }) {
    if (!editing) return;
    const c = editing;
    setEditing(null);
    void commitDecision(c, "yes", edits);
  }

  function handleEditReject() {
    if (!editing) return;
    const c = editing;
    setEditing(null);
    void commitDecision(c, "no");
  }

  const visible = useMemo(() => stack.slice(0, 3), [stack]);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-bg">
      <header className="safe-top safe-x relative z-30 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Terug"
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
            <span className="truncate">
              {klantNaam ?? "—"}
              {meetingDatum ? ` · ${formatDate(meetingDatum)}` : ""}
            </span>
          </div>
          <h1 className="truncate text-sm font-semibold text-vondr-dark-blue">
            {batchTitle}
          </h1>
        </div>
        <Link
          href={`/batch/${batchId}/summary`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Samenvatting"
          title="Samenvatting"
        >
          <ListChecks size={18} />
        </Link>
      </header>

      <div className="bg-bg px-vondr-m pt-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full bg-vondr-dark-blue"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
          <span>
            {loading
              ? "laden..."
              : remaining === 0
                ? "alles beslist — door naar samenvatting"
                : `${remaining} te gaan`}
          </span>
          <span className="font-mono tabular-nums text-ink-400">
            {total === 0 ? "0/0" : `${Math.min(done + 1, total)}/${total}`}
          </span>
        </div>
      </div>

      <div className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">
            Categorie laden...
          </div>
        ) : error && stack.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <div className="text-3xl">⚠</div>
            <p className="text-sm text-ink-500">{error}</p>
            <Link
              href="/"
              className="mt-2 rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white"
            >
              Terug
            </Link>
          </div>
        ) : remaining === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">
            Door naar samenvatting...
          </div>
        ) : (
          <div className="absolute inset-0 flex items-stretch justify-center pb-32 pt-6">
            <AnimatePresence mode="popLayout">
              {visible
                .slice()
                .reverse()
                .map((c, idxFromBack) => {
                  const stackIndex = visible.length - 1 - idxFromBack;
                  const isTop = stackIndex === 0;
                  return (
                    <SwipeCard
                      key={c.id}
                      ref={isTop ? topCardRef : undefined}
                      candidate={c}
                      isTop={isTop}
                      stackIndex={stackIndex}
                      onSwiped={onSwiped}
                      onTap={(cc) => setEditing(cc)}
                      peerVote={peerByCandidate.get(c.id)}
                    />
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {error && stack.length > 0 && (
        <div className="absolute bottom-32 left-1/2 z-30 -translate-x-1/2 rounded-full bg-accent-no/90 px-4 py-2 text-xs text-white shadow-lg">
          {error}
        </div>
      )}

      {!loading && remaining > 0 && (
        <div
          className="safe-bottom relative z-30 flex items-center justify-around gap-3 border-t border-line bg-bg px-6 pb-6 pt-3"
          onPointerDownCapture={() => haptic.unlock()}
        >
          <FabAction
            onClick={() => topCardRef.current?.swipeDecision("no")}
            kind="ghost"
            label="Afwijzen"
          >
            <X size={22} strokeWidth={2} />
          </FabAction>
          <FabAction
            onClick={handleUndo}
            kind="small"
            label="Undo"
            disabled={history.length === 0}
          >
            <RotateCcw size={16} strokeWidth={2} />
          </FabAction>
          <FabAction
            onClick={() => topCardRef.current?.swipeDecision("maybe")}
            kind="small"
            label="Pas"
          >
            <ArrowUp size={18} strokeWidth={2} />
          </FabAction>
          <FabAction
            onClick={() => topCardRef.current?.swipeDecision("yes")}
            kind="primary"
            label="Toevoegen"
          >
            <Plus size={24} strokeWidth={2.4} />
          </FabAction>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <EditSheet
            candidate={editing}
            peerVote={peerByCandidate.get(editing.id)}
            onApprove={handleEditApprove}
            onReject={handleEditReject}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FabAction({
  onClick,
  kind,
  label,
  disabled,
  children
}: {
  onClick: () => void;
  kind: "primary" | "ghost" | "small";
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const sizeCls =
    kind === "primary"
      ? "h-14 w-14"
      : kind === "ghost"
        ? "h-12 w-12"
        : "h-10 w-10";
  const styleCls =
    kind === "primary"
      ? "bg-vondr-pop text-white shadow-card border-2 border-vondr-pop hover:bg-vondr-dark-blue hover:border-vondr-dark-blue"
      : kind === "ghost"
        ? "bg-surface text-vondr-dark-blue border-2 border-line hover:border-vondr-dark-blue"
        : "bg-surface text-ink-700 border border-line hover:border-vondr-dark-blue";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex ${sizeCls} items-center justify-center rounded-full ${styleCls} transition active:scale-95 disabled:opacity-40 disabled:active:scale-100`}
      >
        {children}
      </button>
      <span
        className={`text-[10px] font-medium uppercase tracking-[0.04em] ${
          kind === "primary" ? "text-vondr-dark-blue" : "text-ink-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function latestDecisionPerCandidate(votes: Vote[]): Map<string, Decision> {
  const byId = new Map<string, Vote>();
  for (const v of votes) {
    const existing = byId.get(v.candidateId);
    if (!existing || v.votedAt > existing.votedAt) byId.set(v.candidateId, v);
  }
  const out = new Map<string, Decision>();
  byId.forEach((v, id) => out.set(id, v.decision));
  return out;
}

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}`;
}
