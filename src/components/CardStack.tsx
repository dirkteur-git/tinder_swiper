"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, RotateCcw, X } from "lucide-react";
import type { Candidate, Decision, Vote } from "@/lib/types";
import {
  castVote,
  deleteVote,
  fetchMyVotes,
  fetchOpenCandidates
} from "@/lib/candidates";
import { SwipeCard, SwipeCardHandle, SwipeDirection } from "./SwipeCard";
import { MatchOverlay } from "./MatchOverlay";
import { EditSheet } from "./EditSheet";
import { BrandWordmark } from "./BrandWordmark";
import * as haptic from "@/lib/haptic";

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

  // Load candidates + filter al-gestemde uit
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [candidates, votes] = await Promise.all([
          fetchOpenCandidates(),
          fetchMyVotes(userEmail)
        ]);
        if (cancelled) return;
        const decided = latestDecisionPerCandidate(votes);
        const remaining = candidates.filter(
          (c) => !decided.has(c.id) || decided.get(c.id) === "maybe"
        );
        // 'maybe'-stemmen mogen weer tonen (later = blijft in stack volgens spec)
        setStack(remaining);
        setTotalForSession(remaining.length);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Kon kandidaten niet laden."
        );
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

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
      // Stem mislukt — kandidaat terugzetten en gebruiker informeren
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
      // Niet kritiek — POC neemt sowieso de laatste stem; volgende stem
      // van deze user op deze kaart overschrijft de undone vote alsnog.
    }
  }

  function handleEditApprove(edits: { suggestion?: string; answer?: string }) {
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
      {/* Header */}
      <header className="safe-top z-30 flex items-center gap-3 border-b border-line bg-bg px-4 pb-3">
        <BrandWordmark className="text-xl" />
        <div className="min-w-0 flex-1 text-right">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
            Kennisbank-curatie
          </div>
          <div className="text-xs text-ink-500">
            {loading
              ? "laden..."
              : remaining === 0
                ? "alles afgehandeld"
                : `${remaining} te gaan · ${done} klaar`}
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-full bg-surface px-3 py-1.5 text-[11px] text-ink-500 ring-1 ring-line active:scale-95"
            title={userEmail}
          >
            uit
          </button>
        </form>
      </header>

      {/* Voortgang */}
      <div className="bg-bg px-4 pt-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full bg-ink-900"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* Card-area */}
      <div className="relative flex-1">
        {loading ? (
          <Loading />
        ) : error && stack.length === 0 ? (
          <ErrorState message={error} />
        ) : remaining === 0 ? (
          <EmptyState />
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

      {/* Action buttons */}
      {!loading && remaining > 0 && (
        <div
          className="safe-bottom relative z-30 flex items-center justify-center gap-5 border-t border-line bg-bg px-6 pb-6 pt-4"
          onPointerDownCapture={() => haptic.unlock()}
        >
          <ActionButton
            onClick={() => topCardRef.current?.swipe("left")}
            color="no"
            label="Nee"
          >
            <X size={26} strokeWidth={3} />
          </ActionButton>
          <ActionButton
            onClick={handleUndo}
            color="undo"
            label="Undo"
            small
            disabled={history.length === 0}
          >
            <RotateCcw size={18} strokeWidth={2.5} />
          </ActionButton>
          <ActionButton
            onClick={() => topCardRef.current?.swipe("up")}
            color="maybe"
            label="Later"
            small
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </ActionButton>
          <ActionButton
            onClick={() => topCardRef.current?.swipe("right")}
            color="yes"
            label="Ja"
          >
            <Check size={26} strokeWidth={3} />
          </ActionButton>
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

function ActionButton({
  onClick,
  color,
  label,
  small,
  disabled,
  children
}: {
  onClick: () => void;
  color: "yes" | "no" | "maybe" | "undo";
  label: string;
  small?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const sizeCls = small ? "h-12 w-12" : "h-16 w-16";
  const colorCls =
    color === "yes"
      ? "bg-white text-accent-yes ring-accent-yes/40"
      : color === "no"
        ? "bg-white text-accent-no ring-accent-no/40"
        : color === "maybe"
          ? "bg-white text-accent-maybe ring-accent-maybe/40"
          : "bg-white text-ink-500 ring-line";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex ${sizeCls} items-center justify-center rounded-full ${colorCls} shadow-tile ring-1 transition active:scale-90 disabled:opacity-40 disabled:active:scale-100`}
    >
      {children}
    </button>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-400">
      Kandidaten laden...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="text-3xl">⚠</div>
      <h2 className="text-base font-semibold text-ink-900">
        Kon niet laden
      </h2>
      <p className="max-w-xs text-sm text-ink-500">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-full bg-ink-900 px-5 py-2 text-sm font-medium text-white active:scale-95"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="text-4xl">✓</div>
      <h2 className="text-xl font-semibold tracking-tight text-ink-900">
        Klaar
      </h2>
      <p className="max-w-xs text-sm text-ink-500">
        Geen kandidaten meer. De POC stuurt vanzelf nieuwe wanneer ze er zijn.
      </p>
    </div>
  );
}

/** Per kandidaat de meest recente decision pakken. */
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
