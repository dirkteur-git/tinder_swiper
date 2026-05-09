"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  Plus,
  RotateCcw,
  X
} from "lucide-react";
import { SwipeCard, SwipeCardHandle, SwipeDirection } from "./SwipeCard";
import { MOCK_CANDIDATES } from "@/lib/mock-candidates";
import type { Candidate, Decision } from "@/lib/types";
import { MatchOverlay } from "./MatchOverlay";
import * as haptic from "@/lib/haptic";

interface HistoryItem {
  candidate: Candidate;
  decision: Decision;
}

const FILTERS = ["Alle", "Nieuwe FAQ", "Antwoord-update", "Doctrine", "Risico"] as const;

/**
 * Lokaal speeltuintje — geen Supabase, geen auth. Alle state in-memory,
 * reset bij refresh. Voor design-review.
 */
export function DevSwiperClient() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Alle");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [match, setMatch] = useState<Candidate | null>(null);
  const topCardRef = useRef<SwipeCardHandle | null>(null);

  // Toegepaste filter
  const allCandidates = useMemo(
    () =>
      MOCK_CANDIDATES.filter(
        (c) => filter === "Alle" || c.type === filter
      ),
    [filter]
  );

  // Stack = candidates die nog niet gestemd zijn
  const decidedIds = new Set(history.map((h) => h.candidate.id));
  const stack = allCandidates.filter((c) => !decidedIds.has(c.id));
  const total = allCandidates.length;
  const done = total - stack.length;

  function commitDecision(c: Candidate, decision: Decision) {
    setHistory((h) => [...h, { candidate: c, decision }]);
    if (decision === "yes") {
      setMatch(c);
      window.setTimeout(() => setMatch((m) => (m === c ? null : m)), 1800);
    }
  }

  function onSwiped(_dir: SwipeDirection, decision: Decision, c: Candidate) {
    commitDecision(c, decision);
  }

  function handleUndo() {
    const last = history[history.length - 1];
    if (!last) return;
    haptic.tick();
    setHistory((h) => h.slice(0, -1));
  }

  const visible = stack.slice(0, 3);
  const remaining = stack.length;

  return (
    <div className="relative flex h-[100dvh] flex-col bg-bg">
      {/* Header: filter-chips links, counter rechts */}
      <header className="safe-top safe-x relative z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-4 pb-3 pt-3 backdrop-blur">
        <a
          href="/"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ink-700 active:scale-95"
          aria-label="Terug naar app"
        >
          <ArrowLeft size={18} />
        </a>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-soft">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                filter === f
                  ? "border-vondr-dark-blue bg-vondr-dark-blue text-vondr-white"
                  : "border-line bg-surface text-ink-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="flex-shrink-0 font-mono text-[12px] tabular-nums text-ink-500">
          {total === 0 ? "0/0" : `${Math.min(done + 1, total)}/${total}`}
        </span>
      </header>

      {/* Demo-banner */}
      <div className="bg-vondr-pop/[0.08] px-vondr-l py-2 text-center text-[11px] font-medium text-vondr-pop">
        Design-preview · geen Supabase, geen login · refresh = reset
      </div>

      {/* Card-area */}
      <div className="relative flex-1">
        {remaining === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="text-3xl">✓</div>
            <h2 className="text-xl font-semibold tracking-tight text-vondr-dark-blue">
              Klaar!
            </h2>
            <p className="max-w-xs text-sm text-ink-500">
              Alle {total} mock-suggesties beslist. Refresh om opnieuw te
              swipen.
            </p>
            <button
              onClick={() => setHistory([])}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white active:scale-95"
            >
              <RotateCcw size={14} />
              Reset stack
            </button>
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
                      onTap={() => {
                        /* edit-sheet niet in dev-mode */
                      }}
                    />
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action-bar: 4 FABs met label-onder */}
      {remaining > 0 && (
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
        {match && (
          <MatchOverlay
            item={match}
            onDismiss={() => setMatch(null)}
            stats={{ total: 1241, week: 12 + done, consensus: 87 }}
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
      <motion.button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        whileTap={{ scale: 0.92 }}
        className={`flex ${sizeCls} items-center justify-center rounded-full ${styleCls} transition disabled:opacity-40`}
      >
        {children}
      </motion.button>
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
