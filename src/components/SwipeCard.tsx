"use client";

import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  animate
} from "framer-motion";
import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import type { Candidate, Decision, PeerVote } from "@/lib/types";
import * as haptic from "@/lib/haptic";
import { useHandedness } from "@/lib/handedness";

export type SwipeDirection = "left" | "right" | "up";

/** Voor linkshandig: links = JA, rechts = NEE. */
const decisionFor = (
  dir: SwipeDirection,
  handedness: "right" | "left"
): Decision => {
  if (dir === "up") return "maybe";
  const yesDir = handedness === "left" ? "left" : "right";
  return dir === yesDir ? "yes" : "no";
};

export interface SwipeCardHandle {
  swipe: (dir: SwipeDirection) => void;
  /** Trigger swipe op basis van decision — kiest zelf de juiste richting
   *  rekening houdend met handedness. */
  swipeDecision: (decision: Decision) => void;
}

interface Props {
  candidate: Candidate;
  isTop: boolean;
  stackIndex: number;
  onSwiped: (dir: SwipeDirection, decision: Decision, c: Candidate) => void;
  onTap: (c: Candidate) => void;
  /** In afstem-batches: het oordeel van de andere reviewer op het origineel. */
  peerVote?: PeerVote;
}

const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 500;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { candidate, isTop, stackIndex, onSwiped, onTap, peerVote },
  ref
) {
  const handedness = useHandedness();
  const flip = handedness === "left" ? -1 : 1;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);

  // yesOpacity wordt zichtbaar als je in de YES-richting swipt.
  // Voor rechtshandigen is dat positieve x; voor linkshandigen negatieve.
  const yesOpacity = useTransform(x, (latestX) => {
    const v = latestX * flip;
    if (v < 40) return 0;
    if (v > 140) return 1;
    return (v - 40) / 100;
  });
  const noOpacity = useTransform(x, (latestX) => {
    const v = latestX * flip;
    if (v > -40) return 0;
    if (v < -140) return 1;
    return (-v - 40) / 100;
  });
  const maybeOpacity = useTransform(y, [-140, -40], [1, 0]);

  const overlayBg = useTransform(
    [x, y] as const,
    ([latestX, latestY]: number[]) => {
      const xFlipped = latestX * flip;
      const ax = Math.abs(latestX);
      const ay = Math.abs(latestY);
      if (latestY < -30 && ay > ax) {
        const a = Math.min(0.18, ay / 600);
        return `rgba(37, 99, 235, ${a})`;
      }
      if (xFlipped > 30) {
        const a = Math.min(0.18, xFlipped / 600);
        return `rgba(22, 163, 74, ${a})`;
      }
      if (xFlipped < -30) {
        const a = Math.min(0.18, -xFlipped / 600);
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
      onSwiped(dir, decisionFor(dir, handedness), candidate);
    }, 250);
  }

  useImperativeHandle(
    ref,
    () => ({
      swipe: flyAway,
      swipeDecision: (decision: Decision) => {
        if (decision === "maybe") {
          flyAway("up");
          return;
        }
        const yesDir: SwipeDirection = handedness === "left" ? "left" : "right";
        const noDir: SwipeDirection = handedness === "left" ? "right" : "left";
        flyAway(decision === "yes" ? yesDir : noDir);
      }
    }),
    [exiting, handedness] // eslint-disable-line react-hooks/exhaustive-deps
  );

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
            {/* JA-stempel: positie afhankelijk van handedness — staat aan de
                tegenovergestelde kant van de yes-swipe. */}
            <motion.div
              className={`pointer-events-none absolute top-8 z-30 rounded-xl border-4 border-accent-yes bg-white/90 px-4 py-2 text-3xl font-black uppercase tracking-tight text-accent-yes ${
                handedness === "left"
                  ? "right-6 rotate-[14deg]"
                  : "left-6 rotate-[-14deg]"
              }`}
              style={{ opacity: yesOpacity }}
            >
              Ja
            </motion.div>
            <motion.div
              className={`pointer-events-none absolute top-8 z-30 rounded-xl border-4 border-accent-no bg-white/90 px-4 py-2 text-3xl font-black uppercase tracking-tight text-accent-no ${
                handedness === "left"
                  ? "left-6 rotate-[-14deg]"
                  : "right-6 rotate-[14deg]"
              }`}
              style={{ opacity: noOpacity }}
            >
              Nee
            </motion.div>
            <motion.div
              className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 rounded-xl border-4 border-accent-maybe bg-white/90 px-4 py-2 text-2xl font-black uppercase tracking-tight text-accent-maybe"
              style={{ opacity: maybeOpacity }}
            >
              Pas
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

        {peerVote && <PeerContext peer={peerVote} />}

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

function PeerContext({ peer }: { peer: PeerVote }) {
  const peerName = peer.votedBy.split("@")[0];
  const decisionMeta =
    peer.decision === "yes"
      ? { label: "JA", cls: "bg-accent-yes/[0.10] text-accent-yes ring-accent-yes/30" }
      : peer.decision === "no"
        ? { label: "NEE", cls: "bg-accent-no/[0.10] text-accent-no ring-accent-no/30" }
        : { label: "PAS", cls: "bg-accent-maybe/[0.10] text-accent-maybe ring-accent-maybe/30" };
  const hasEdit = peer.editedSuggestion || peer.editedAnswer;

  return (
    <div className="flex-shrink-0 border-t border-line bg-vondr-pop/[0.04] px-5 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${decisionMeta.cls}`}
        >
          {decisionMeta.label}
        </span>
        <span className="text-[11px] text-ink-700">
          <strong className="font-semibold capitalize">{peerName}</strong> stemde
          al
        </span>
      </div>
      {hasEdit && (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-700">
          <span className="text-ink-400">Voorstel: </span>
          &ldquo;{peer.editedSuggestion ?? peer.editedAnswer}&rdquo;
        </p>
      )}
    </div>
  );
}
