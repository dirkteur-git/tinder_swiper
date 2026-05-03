"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Check,
  RotateCcw,
  X,
  ChevronLeft,
  Clock
} from "lucide-react";
import type { Job, Decision, Question, Vote } from "@/lib/types";
import {
  castVote,
  getVotesForJob,
  undoVote
} from "@/lib/store";
import { SwipeCard, SwipeCardHandle, SwipeDirection } from "./SwipeCard";
import { MatchOverlay } from "./MatchOverlay";
import { ProfileSheet } from "./ProfileSheet";

interface Props {
  job: Job;
}

export function CardStack({ job }: Props) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [stack, setStack] = useState<Question[]>([]);
  const [history, setHistory] = useState<Array<{ q: Question; decision: Decision }>>([]);
  const [showMatch, setShowMatch] = useState(false);
  const [profileQ, setProfileQ] = useState<Question | null>(null);
  const topCardRef = useRef<SwipeCardHandle | null>(null);

  // Initialize from localStorage votes
  useEffect(() => {
    const existing: Vote[] = getVotesForJob(job.id);
    const decided = new Set(existing.map((v) => v.questionId));
    const remaining = job.questions
      .filter((q) => !decided.has(q.id))
      .sort((a, b) => a.position - b.position);
    setStack(remaining);
    setHydrated(true);
  }, [job.id, job.questions]);

  const total = job.questions.length;
  const remaining = stack.length;
  const done = total - remaining;
  const progress = total === 0 ? 0 : (done / total) * 100;

  function onSwiped(dir: SwipeDirection, decision: Decision, q: Question) {
    castVote(q.jobId, q.id, decision);
    setHistory((h) => [...h, { q, decision }]);

    if (decision === "maybe") {
      // "Niet ik" — terug onderaan de stapel (in PoC: gewoon weghalen, met optie undo)
      setStack((s) => s.filter((x) => x.id !== q.id));
    } else {
      setStack((s) => s.filter((x) => x.id !== q.id));
    }

    if (decision === "yes" && job.approvalMode === "single") {
      setShowMatch(true);
      window.setTimeout(() => setShowMatch(false), 1500);
    }
  }

  function handleUndo() {
    const last = history[history.length - 1];
    if (!last) return;
    undoVote(last.q.id);
    setHistory((h) => h.slice(0, -1));
    setStack((s) => [last.q, ...s]);
    try {
      navigator.vibrate?.(10);
    } catch {}
  }

  const visible = useMemo(() => stack.slice(0, 3), [stack]);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-navy-950">
      {/* Header */}
      <header className="safe-top z-30 flex items-center gap-3 px-4 pb-3">
        <button
          onClick={() => router.push("/inbox")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-steel-200 transition active:scale-95"
          aria-label="Terug"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-steel-100">
            {job.title}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-steel-400">
            <span>
              {done} / {total}
            </span>
            {job.deadline && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatDeadline(job.deadline)}
              </span>
            )}
            <span className="rounded-full bg-navy-800 px-2 py-0.5 capitalize text-steel-300">
              {modeLabel(job.approvalMode)}
            </span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-navy-800">
          <motion.div
            className="h-full bg-steel-200"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="relative flex-1">
        {hydrated && remaining === 0 ? (
          <EmptyState onBack={() => router.push("/inbox")} total={total} />
        ) : (
          <div className="absolute inset-0 flex items-stretch justify-center pb-32 pt-6">
            <AnimatePresence mode="popLayout">
              {visible
                .slice()
                .reverse()
                .map((q, idxFromBack) => {
                  const stackIndex = visible.length - 1 - idxFromBack; // 0 = top
                  const isTop = stackIndex === 0;
                  return (
                    <SwipeCard
                      key={q.id}
                      ref={isTop ? topCardRef : undefined}
                      question={q}
                      jobTitle={job.title}
                      isTop={isTop}
                      stackIndex={stackIndex}
                      onSwiped={onSwiped}
                      onTap={(qq) => setProfileQ(qq)}
                    />
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {remaining > 0 && (
        <div className="safe-bottom relative z-30 flex items-center justify-center gap-5 px-6 pb-6 pt-4">
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
            label="Niet ik"
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
        {profileQ && (
          <ProfileSheet
            question={profileQ}
            job={job}
            onClose={() => setProfileQ(null)}
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
      ? "bg-accent-yes/15 text-accent-yes ring-accent-yes/40"
      : color === "no"
        ? "bg-accent-no/15 text-accent-no ring-accent-no/40"
        : color === "maybe"
          ? "bg-accent-maybe/15 text-accent-maybe ring-accent-maybe/40"
          : "bg-navy-800 text-steel-300 ring-steel-400/30";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex ${sizeCls} items-center justify-center rounded-full ${colorCls} ring-1 transition active:scale-90 disabled:opacity-30 disabled:active:scale-100`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onBack, total }: { onBack: () => void; total: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-5xl">🎉</div>
      <h2 className="text-xl font-semibold text-steel-100">Klaar!</h2>
      <p className="max-w-xs text-sm text-steel-300">
        Je hebt alle {total} kaarten in deze job behandeld. Het bron-systeem
        krijgt nu webhook-meldingen voor de definitieve uitkomsten.
      </p>
      <button
        onClick={onBack}
        className="mt-2 rounded-full bg-steel-100 px-6 py-2.5 text-sm font-medium text-navy-900 transition active:scale-95"
      >
        Terug naar inbox
      </button>
    </div>
  );
}

function modeLabel(mode: string) {
  if (mode === "single") return "1 stem";
  if (mode === "double") return "2 stemmen";
  if (mode === "founders_unanimous") return "Founders unaniem";
  return mode;
}

function formatDeadline(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 0) return "verstreken";
  if (diffH < 24) return `nog ${diffH}u`;
  const diffD = Math.round(diffH / 24);
  return `nog ${diffD}d`;
}
