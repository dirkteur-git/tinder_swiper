"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  X
} from "lucide-react";
import type { Candidate, Decision, Vote } from "@/lib/types";
import {
  castVote,
  deleteVote,
  fetchMyVotes,
  fetchOpenLooseCandidates
} from "@/lib/candidates";
import { SwipeCard, SwipeCardHandle, SwipeDirection } from "./SwipeCard";
import { MatchOverlay } from "./MatchOverlay";
import { EditSheet } from "./EditSheet";
import { BrandWordmark } from "./BrandWordmark";
import * as haptic from "@/lib/haptic";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

interface Props {
  userEmail: string;
}

interface HistoryItem {
  candidate: Candidate;
  voteId: string;
  decision: Decision;
}

export function CardStack({ userEmail }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showMatch, setShowMatch] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const topCardRef = useRef<SwipeCardHandle | null>(null);
  const [totalForSession, setTotalForSession] = useState(0);

  const loadCandidates = useCallback(async () => {
    try {
      const [candidates, votes] = await Promise.all([
        fetchOpenLooseCandidates(),
        fetchMyVotes(userEmail)
      ]);
      const decided = latestDecisionPerCandidate(votes);
      const remaining = candidates.filter(
        (c) => !decided.has(c.id) || decided.get(c.id) === "maybe"
      );
      setStack(remaining);
      setTotalForSession(remaining.length);
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon suggesties niet laden.");
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  // Pull-to-refresh — negeert touches op de swipe-cards zelf
  const ptr = usePullToRefresh({
    onRefresh: async () => {
      haptic.tick();
      await loadCandidates();
    },
    ignoreSelector: "[data-card-drag]"
  });

  const remaining = stack.length;
  const done = totalForSession - remaining;
  const progress =
    totalForSession === 0 ? 100 : (done / totalForSession) * 100;

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
          editedAnswer: edits?.answer ?? null
        },
        userEmail
      );
      setHistory((h) => [...h, { candidate: c, voteId: vote.id, decision }]);
      if (decision === "yes") {
        setShowMatch(true);
        window.setTimeout(() => setShowMatch(false), 1500);
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
      /* niet kritiek — MegaVondr neemt de laatste */
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
      {/* Header — vergrote safe-area zodat hij niet onder accu/notch valt */}
      <header className="safe-top safe-x relative z-30 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Naar home"
        >
          <ArrowLeft size={20} />
        </Link>
        <BrandWordmark height={22} />
        <div className="flex-1" />
        <button
          onClick={() => loadCandidates()}
          disabled={loading || ptr.refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition active:scale-95 disabled:opacity-40"
          aria-label="Vernieuwen"
        >
          <RefreshCw
            size={18}
            className={
              loading || ptr.refreshing ? "animate-spin" : ""
            }
          />
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
          <Settings size={18} />
        </Link>
      </header>

      {/* Pull-to-refresh-indicator */}
      <PullIndicator
        distance={ptr.pullDistance}
        progress={ptr.progress}
        refreshing={ptr.refreshing}
        armed={ptr.armed}
      />

      {/* Voortgangsbalk */}
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
                ? "alles afgehandeld"
                : `${remaining} te gaan · ${done} klaar`}
          </span>
          <span className="truncate text-ink-400">{userEmail}</span>
        </div>
      </div>

      {/* Card-area */}
      <div className="relative flex-1">
        {loading ? (
          <Loading />
        ) : error && stack.length === 0 ? (
          <ErrorState message={error} onRetry={loadCandidates} />
        ) : remaining === 0 ? (
          <EmptyState onRefresh={loadCandidates} />
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
        {showMatch && <MatchOverlay onDismiss={() => setShowMatch(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <EditSheet
            candidate={editing}
            onApprove={handleEditApprove}
            onReject={handleEditReject}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PullIndicator({
  distance,
  progress,
  refreshing,
  armed
}: {
  distance: number;
  progress: number;
  refreshing: boolean;
  armed: boolean;
}) {
  if (distance <= 0 && !refreshing) return null;
  return (
    <motion.div
      className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex justify-center"
      style={{ paddingTop: `calc(env(safe-area-inset-top) + ${distance}px)` }}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-tile ring-1 ring-line transition-colors ${
          armed || refreshing ? "text-vondr-pop" : "text-ink-500"
        }`}
      >
        {refreshing ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <ArrowDown
            size={16}
            className="transition-transform"
            style={{
              transform: `rotate(${Math.min(180, progress * 180)}deg)`
            }}
          />
        )}
      </div>
    </motion.div>
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

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-400">
      Kandidaten laden...
    </div>
  );
}

function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="text-3xl">⚠</div>
      <h2 className="text-base font-semibold text-ink-900">Kon niet laden</h2>
      <p className="max-w-xs text-sm text-ink-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white active:scale-95"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="text-4xl">✓</div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">
        Klaar
      </h2>
      <p className="max-w-xs text-sm text-ink-500">
        Geen suggesties meer. Sleep omlaag of tik op vernieuwen om te kijken
        of MegaVondr nieuwe heeft gestuurd.
      </p>
      <button
        onClick={onRefresh}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white active:scale-95"
      >
        <RefreshCw size={14} />
        Vernieuwen
      </button>
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
