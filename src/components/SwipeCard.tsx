"use client";

import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  animate
} from "framer-motion";
import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import type { Candidate, Decision } from "@/lib/types";
import * as haptic from "@/lib/haptic";

export type SwipeDirection = "left" | "right" | "up";

const decisionFor = (dir: SwipeDirection): Decision =>
  dir === "right" ? "yes" : dir === "left" ? "no" : "maybe";

export interface SwipeCardHandle {
  swipe: (dir: SwipeDirection) => void;
}

interface Props {
  candidate: Candidate;
  isTop: boolean;
  stackIndex: number;
  onSwiped: (dir: SwipeDirection, decision: Decision, c: Candidate) => void;
  onTap: (c: Candidate) => void;
}

const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 500;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { candidate, isTop, stackIndex, onSwiped, onTap },
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
      onSwiped(dir, decisionFor(dir), candidate);
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

    resetGesture();
    animate(x, 0, { type: "spring", stiffness: 380, damping: 32 });
    animate(y, 0, { type: "spring", stiffness: 380, damping: 32 });
  }

  function handleDrag(_e: unknown, info: PanInfo) {
    const ax = Math.abs(info.offset.x);
    const ay = Math.abs(info.offset.y);

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
      data-card-drag
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
        haptic.unlock();
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
          onTap(candidate);
        }
      }}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
      initial={false}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line shadow-card no-select">
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 rounded-3xl"
          style={{ backgroundColor: overlayBg }}
        />

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
              Later
            </motion.div>
          </>
        )}

        {/* Header — type-badge + klant-meta */}
        <div className="flex-shrink-0 border-b border-line bg-surface-soft px-5 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              {candidate.type}
            </span>
            <span className="truncate text-[11px] text-ink-500">
              {candidate.klantNaam ?? "—"}
              {candidate.meetingDatum
                ? ` · ${formatDateShort(candidate.meetingDatum)}`
                : ""}
            </span>
          </div>
        </div>

        {/* Hero: vraag + voorgesteld antwoord + klant-quote */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Voorgestelde vraag
          </div>
          <h1 className="line-clamp-3 text-xl font-semibold leading-tight tracking-tight text-ink-900">
            {candidate.suggestion}
          </h1>

          {candidate.proposedAnswer && (
            <div className="rounded-xl bg-accent-yes/[0.08] p-3 ring-1 ring-accent-yes/30">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-yes">
                Voorgesteld antwoord
              </div>
              <p className="mt-1 line-clamp-5 text-sm leading-snug text-ink-900">
                {candidate.proposedAnswer}
              </p>
            </div>
          )}

          {candidate.klantQuote && (
            <div className="mt-auto border-l-[3px] border-line-strong pl-3">
              <p className="line-clamp-3 text-sm italic leading-snug text-ink-500">
                &ldquo;{candidate.klantQuote}&rdquo;
              </p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-line bg-surface-soft px-5 py-2.5 text-center text-[11px] text-ink-400">
          Tik om te bewerken / context te zien
        </div>
      </div>
    </motion.div>
  );
});

function formatDateShort(iso: string): string {
  // YYYY-MM-DD → DD-MM
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}`;
}
