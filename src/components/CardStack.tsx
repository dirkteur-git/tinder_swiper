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
import { castVote, getVotesForJob, undoVote } from "@/lib/store";
import * as haptic from "@/lib/haptic";
import { SwipeCard, SwipeCardHandle, SwipeDirection } from "./SwipeCard";
import { MatchOverlay } from "./MatchOverlay";
import { ProfileSheet } from "./ProfileSheet";

interface Props {
  job: Job;
}

function splitTitle(title: string): { topic: string; subject: string } {
  // "Datakwaliteit — Project Westflank, fase ramen" → topic "Datakwaliteit", subject "Project Westflank, fase ramen"
  const parts = title.split(/[—\-–]\s*/, 2);
  if (parts.length === 2) {
    return { topic: parts[0].trim(), subject: parts[1].trim() };
  }
  return { topic: "Beslissing", subject: title.trim() };
}

export function CardStack({ job }: Props) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [stack, setStack] = useState<Question[]>([]);
  const [history, setHistory] = useState<
    Array<{ q: Question; decision: Decision }>
  >([]);
  const [showMatch, setShowMatch] = useState(false);
  const [profileQ, setProfileQ] = useState<Question | null>(null);
  const topCardRef = useRef<SwipeCardHandle | null>(null);

  const { topic, subject } = useMemo(() => splitTitle(job.title), [job.title]);

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

  function onSwiped(_dir: SwipeDirection, decision: Decision, q: Question) {
    castVote(q.jobId, q.id, decision);
    setHistory((h) => [...h, { q, decision }]);
    setStack((s) => s.filter((x) => x.id !== q.id));

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
    haptic.tick();
  }

  const visible = useMemo(() => stack.slice(0, 3), [stack]);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-bg">
      {/* Header */}
      <header className="safe-top z-30 flex items-center gap-3 border-b border-line bg-bg px-4 pb-3">
        <button
          onClick={() => router.push("/inbox")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink-700 ring-1 ring-line transition active:scale-95"
          aria-label="Terug"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
            {topic}
          </div>
          <div className="truncate text-sm font-semibold text-ink-900">
            {subject}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-500">
            <span className="font-medium">
              {done} / {total}
            </span>
            {job.deadline && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatDeadline(job.deadline)}
              </span>
            )}
            <span className="rounded-full bg-surface px-1.5 py-0.5 ring-1 ring-line">
              {modeLabel(job.approvalMode)}
            </span>
          </div>
        </div>
      </header>

      {/* Voortgangsbalk */}
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
        {hydrated && remaining === 0 ? (
          <EmptyState onBack={() => router.push("/inbox")} total={total} />
        ) : (
          <div className="absolute inset-0 flex items-stretch justify-center pb-32 pt-6">
            <AnimatePresence mode="popLayout">
              {visible
                .slice()
                .reverse()
                .map((q, idxFromBack) => {
                  const stackIndex = visible.length - 1 - idxFromBack;
                  const isTop = stackIndex === 0;
                  return (
                    <SwipeCard
                      key={q.id}
                      ref={isTop ? topCardRef : undefined}
                      question={q}
                      jobTitle={job.title}
                      topic={topic}
                      topicSubject={subject}
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
      ? "bg-white text-accent-yes ring-accent-yes/30"
      : color === "no"
        ? "bg-white text-accent-no ring-accent-no/30"
        : color === "maybe"
          ? "bg-white text-accent-maybe ring-accent-maybe/30"
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

function EmptyState({ onBack, total }: { onBack: () => void; total: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-5xl">✓</div>
      <h2 className="text-xl font-semibold text-ink-900">Klaar!</h2>
      <p className="max-w-xs text-sm text-ink-500">
        Je hebt alle {total} kaarten in deze job behandeld. Het bron-systeem
        krijgt nu webhook-meldingen voor de definitieve uitkomsten.
      </p>
      <button
        onClick={onBack}
        className="mt-2 rounded-full bg-ink-900 px-6 py-2.5 text-sm font-medium text-white transition active:scale-95"
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
