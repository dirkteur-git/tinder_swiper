"use client";

import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  animate
} from "framer-motion";
import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import type { Fact, Question, Decision } from "@/lib/types";
import { ArrowDown, X as XIcon } from "lucide-react";
import * as haptic from "@/lib/haptic";

export type SwipeDirection = "left" | "right" | "up";

const decisionFor = (dir: SwipeDirection): Decision =>
  dir === "right" ? "yes" : dir === "left" ? "no" : "maybe";

export interface SwipeCardHandle {
  swipe: (dir: SwipeDirection) => void;
}

interface Props {
  question: Question;
  jobTitle: string;
  topic: string;
  topicSubject: string;
  isTop: boolean;
  stackIndex: number;
  onSwiped: (dir: SwipeDirection, decision: Decision, q: Question) => void;
  onTap: (q: Question) => void;
}

const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 500;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  {
    question,
    jobTitle: _jobTitle,
    topic,
    topicSubject,
    isTop,
    stackIndex,
    onSwiped,
    onTap
  },
  ref
) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);

  const yesOpacity = useTransform(x, [40, 140], [0, 1]);
  const noOpacity = useTransform(x, [-140, -40], [1, 0]);
  const maybeOpacity = useTransform(y, [-140, -40], [1, 0]);

  const overlayBg = useTransform(
    [x, y] as const,
    ([latestX, latestY]: number[]) => {
      const ax = Math.abs(latestX);
      const ay = Math.abs(latestY);
      if (latestY < -30 && ay > ax) {
        const a = Math.min(0.18, ay / 600);
        return `rgba(37, 99, 235, ${a})`;
      }
      if (latestX > 30) {
        const a = Math.min(0.18, latestX / 600);
        return `rgba(22, 163, 74, ${a})`;
      }
      if (latestX < -30) {
        const a = Math.min(0.18, -latestX / 600);
        return `rgba(220, 38, 38, ${a})`;
      }
      return "rgba(0,0,0,0)";
    }
  );

  const [exiting, setExiting] = useState(false);
  const thresholdCrossed = useRef(false);
  const dragStarted = useRef(false);

  function flyAway(dir: SwipeDirection) {
    if (exiting) return;
    setExiting(true);
    haptic.strong();

    if (dir === "right") {
      animate(x, 800, { duration: 0.28, ease: [0.32, 0.72, 0, 1] });
    } else if (dir === "left") {
      animate(x, -800, { duration: 0.28, ease: [0.32, 0.72, 0, 1] });
    } else {
      animate(y, -1000, { duration: 0.28, ease: [0.32, 0.72, 0, 1] });
    }

    window.setTimeout(() => {
      onSwiped(dir, decisionFor(dir), question);
    }, 250);
  }

  useImperativeHandle(ref, () => ({ swipe: flyAway }), [exiting]);

  function handleDragEnd(_e: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    const ax = Math.abs(offset.x);
    const ay = Math.abs(offset.y);

    if (offset.y < -50 && ay > ax) {
      if (ay > SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
        flyAway("up");
        return;
      }
    }
    if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
      flyAway("right");
      return;
    }
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
      flyAway("left");
      return;
    }

    // Snap-back, geen commit — geen extra buzz, alleen state resetten
    resetGesture();
    animate(x, 0, { type: "spring", stiffness: 380, damping: 32 });
    animate(y, 0, { type: "spring", stiffness: 380, damping: 32 });
  }

  function handleDrag(_e: unknown, info: PanInfo) {
    const ax = Math.abs(info.offset.x);
    const ay = Math.abs(info.offset.y);

    // Pickup-tikje: één keer per drag-gesture, bij eerste merkbare beweging
    if (!dragStarted.current && (ax > 6 || ay > 6)) {
      dragStarted.current = true;
      haptic.whisper();
    }

    const past =
      ax > SWIPE_THRESHOLD * 0.85 || ay > SWIPE_THRESHOLD * 0.85;

    if (past && !thresholdCrossed.current) {
      thresholdCrossed.current = true;
      haptic.pulse();
    } else if (!past && thresholdCrossed.current) {
      // Teruggesleept onder de drempel — stille reset zodat heen-en-weer-buzzen voorkomen wordt
      thresholdCrossed.current = false;
    }
  }

  function resetGesture() {
    dragStarted.current = false;
    thresholdCrossed.current = false;
  }

  const cardZ = 10 - stackIndex;
  const baseScale = isTop ? 1 : 1 - stackIndex * 0.04;
  const baseTranslateY = isTop ? 0 : stackIndex * 12;

  const tapStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  return (
    <motion.div
      className="absolute inset-0 mx-auto flex max-w-md items-stretch justify-center px-4"
      style={{
        zIndex: cardZ,
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotate: isTop ? rotate : 0,
        scale: baseScale,
        translateY: baseTranslateY
      }}
      drag={isTop && !exiting}
      dragSnapToOrigin={false}
      dragElastic={0.7}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={(e) => {
        tapStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      }}
      onPointerUp={(e) => {
        const start = tapStartRef.current;
        tapStartRef.current = null;
        if (!start || !isTop) return;
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        const dt = Date.now() - start.t;
        if (dx < 8 && dy < 8 && dt < 350) {
          onTap(question);
        }
      }}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
      initial={false}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line shadow-card no-select">
        {/* drag-tinted overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 rounded-3xl"
          style={{ backgroundColor: overlayBg }}
        />

        {/* Stempels — alleen op top-card */}
        {isTop && (
          <>
            <motion.div
              className="pointer-events-none absolute left-6 top-8 z-30 rotate-[-14deg] rounded-xl border-4 border-accent-yes bg-white/90 px-4 py-2 text-3xl font-black uppercase tracking-tight text-accent-yes"
              style={{ opacity: yesOpacity }}
            >
              Ja
            </motion.div>
            <motion.div
              className="pointer-events-none absolute right-6 top-8 z-30 rotate-[14deg] rounded-xl border-4 border-accent-no bg-white/90 px-4 py-2 text-3xl font-black uppercase tracking-tight text-accent-no"
              style={{ opacity: noOpacity }}
            >
              Nee
            </motion.div>
            <motion.div
              className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 rounded-xl border-4 border-accent-maybe bg-white/90 px-4 py-2 text-2xl font-black uppercase tracking-tight text-accent-maybe"
              style={{ opacity: maybeOpacity }}
            >
              Niet ik
            </motion.div>
          </>
        )}

        {/* Header */}
        <div className="flex-shrink-0 border-b border-line bg-surface-soft px-5 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
              {topic}
            </span>
            <span className="rounded-full bg-bg px-2 py-0.5 text-[10px] font-medium text-ink-500 ring-1 ring-line">
              {question.externalId ?? `q-${question.position}`}
            </span>
          </div>
          <h1 className="mt-1 truncate text-base font-semibold leading-tight text-ink-700">
            {topicSubject}
          </h1>
          {question.type && (
            <div className="mt-2 inline-flex rounded-full bg-ink-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              {question.type}
            </div>
          )}
        </div>

        {/* Optionele afbeelding (alleen tonen als beschikbaar) */}
        {question.imageUrl && (
          <div className="h-28 w-full flex-shrink-0 overflow-hidden bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* HERO — het daadwerkelijke voorstel */}
        <div className="flex flex-1 flex-col justify-center overflow-hidden p-5">
          <CardHero
            facts={question.facts}
            suggestionFallback={question.suggestion}
          />
        </div>

        {/* Footer-hint */}
        <div className="flex-shrink-0 border-t border-line bg-surface-soft px-5 py-2.5 text-center text-[11px] text-ink-400">
          Tik voor onderbouwing
        </div>
      </div>
    </motion.div>
  );
});

/* ----------------------------- HERO + sub-blokken ----------------------------- */

function CardHero({
  facts,
  suggestionFallback
}: {
  facts?: Fact[];
  suggestionFallback: string;
}) {
  if (!facts || facts.length === 0) {
    return <Fallback text={suggestionFallback} />;
  }

  const highlight = facts.find((f) => f.variant === "highlight");
  const old1 = facts.find((f) => f.variant === "old");
  const new1 = facts.find((f) => f.variant === "new");
  const subject = facts.find((f) => !f.variant);

  // Quote + voorgesteld antwoord (FAQ, objection)
  if (highlight && new1) {
    return (
      <div className="flex flex-col gap-2">
        <QuoteBlock label={highlight.label} text={highlight.value} />
        <ArrowDivider />
        <ProposedBlock label={new1.label} text={new1.value} />
      </div>
    );
  }

  // Alleen quote (quote toevoegen aan deck)
  if (highlight) {
    const by = facts.find((f) => f.label.toLowerCase() === "door");
    return (
      <QuoteBlock
        label={highlight.label}
        text={highlight.value}
        attribution={by?.value}
        big
      />
    );
  }

  // Van → naar (hernoemen, classificatie, value-change, doctrine, brand-confirm)
  if (old1 && new1) {
    return (
      <div className="flex flex-col gap-2">
        {subject && (
          <SubjectLine label={subject.label} text={subject.value} />
        )}
        <CurrentBlock label={old1.label} text={old1.value} />
        <ArrowDivider />
        <ProposedBlock label={new1.label} text={new1.value} />
      </div>
    );
  }

  // Brandscript-bevestiging (highlight + alleen new) wordt al gepakt door bovenste case.
  // Maar voor het geval er alleen een new is zonder old/highlight:
  if (new1 && !old1 && !highlight) {
    return (
      <div className="flex flex-col gap-2">
        {subject && (
          <SubjectLine label={subject.label} text={subject.value} />
        )}
        <ProposedBlock label={new1.label} text={new1.value} big />
      </div>
    );
  }

  // Alleen old → verwijderen
  if (old1) {
    const supporting = facts
      .filter((f) => !f.variant && f !== old1)
      .slice(0, 2);
    return (
      <div className="flex flex-col gap-3">
        <RemovalBlock label={old1.label} text={old1.value} />
        {supporting.length > 0 && (
          <div className="space-y-1 text-xs text-ink-500">
            {supporting.map((f, i) => (
              <div key={i}>
                <span className="text-ink-400">{f.label}:</span> {f.value}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <Fallback text={suggestionFallback} />;
}

function SubjectLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-1.5 ring-1 ring-line">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}:
      </span>{" "}
      <span className="text-sm text-ink-700">{text}</span>
    </div>
  );
}

function QuoteBlock({
  label,
  text,
  attribution,
  big
}: {
  label: string;
  text: string;
  attribution?: string;
  big?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </div>
      <div className="mt-1.5 border-l-[3px] border-ink-900 pl-3">
        <p
          className={`${big ? "line-clamp-6 text-lg" : "line-clamp-4 text-base"} font-medium leading-snug text-ink-900`}
        >
          &ldquo;{text}&rdquo;
        </p>
        {attribution && (
          <p className="mt-2 text-xs text-ink-500">— {attribution}</p>
        )}
      </div>
    </div>
  );
}

function CurrentBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl bg-bg px-4 py-3 ring-1 ring-line">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </div>
      <div className="mt-0.5 line-clamp-2 text-base leading-snug text-ink-400 line-through decoration-ink-400/60">
        {text}
      </div>
    </div>
  );
}

function ProposedBlock({
  label,
  text,
  big
}: {
  label: string;
  text: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl bg-accent-yes/[0.08] px-4 py-3 ring-1 ring-accent-yes/30">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-yes">
        {label}
      </div>
      <div
        className={`${big ? "line-clamp-5 text-base" : "line-clamp-4 text-base"} mt-0.5 font-semibold leading-snug text-ink-900`}
      >
        {text}
      </div>
    </div>
  );
}

function RemovalBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl bg-accent-no/[0.06] px-4 py-3 ring-1 ring-accent-no/25">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-no">
        {label}
      </div>
      <div className="mt-1 flex items-start gap-2">
        <XIcon
          size={18}
          strokeWidth={3}
          className="mt-0.5 flex-shrink-0 text-accent-no"
        />
        <span className="line-clamp-3 text-base font-medium leading-snug text-ink-900 line-through decoration-accent-no/50">
          {text}
        </span>
      </div>
    </div>
  );
}

function ArrowDivider() {
  return (
    <div className="flex items-center justify-center py-0.5 text-ink-400">
      <ArrowDown size={20} strokeWidth={2.5} />
    </div>
  );
}

function Fallback({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-center text-lg font-semibold leading-tight text-ink-900">
        {text}
      </p>
    </div>
  );
}
