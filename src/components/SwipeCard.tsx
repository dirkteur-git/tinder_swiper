"use client";

import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence
} from "framer-motion";
import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import type { Question, Decision } from "@/lib/types";
import { Info } from "lucide-react";

export type SwipeDirection = "left" | "right" | "up";

const decisionFor = (dir: SwipeDirection): Decision =>
  dir === "right" ? "yes" : dir === "left" ? "no" : "maybe";

export interface SwipeCardHandle {
  swipe: (dir: SwipeDirection) => void;
}

interface Props {
  question: Question;
  jobTitle: string;
  isTop: boolean;
  stackIndex: number; // 0 = top
  onSwiped: (dir: SwipeDirection, decision: Decision, q: Question) => void;
  onTap: (q: Question) => void;
}

const SWIPE_THRESHOLD = 110; // px
const VELOCITY_THRESHOLD = 500; // px/s

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { question, jobTitle, isTop, stackIndex, onSwiped, onTap },
  ref
) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Rotation tied to horizontal drag — feels physical
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);

  // Stamp opacities — appear gradually, max out around threshold
  const yesOpacity = useTransform(x, [40, 140], [0, 1]);
  const noOpacity = useTransform(x, [-140, -40], [1, 0]);
  const maybeOpacity = useTransform(y, [-140, -40], [1, 0]);

  // Card-level color overlay (subtle)
  const overlayBg = useTransform(
    [x, y] as const,
    ([latestX, latestY]: number[]) => {
      const ax = Math.abs(latestX);
      const ay = Math.abs(latestY);
      if (latestY < -30 && ay > ax) {
        const a = Math.min(0.35, ay / 400);
        return `rgba(59, 130, 246, ${a})`;
      }
      if (latestX > 30) {
        const a = Math.min(0.35, latestX / 400);
        return `rgba(34, 197, 94, ${a})`;
      }
      if (latestX < -30) {
        const a = Math.min(0.35, -latestX / 400);
        return `rgba(239, 68, 68, ${a})`;
      }
      return "rgba(0,0,0,0)";
    }
  );

  const [exiting, setExiting] = useState(false);
  const haptic = useRef(false);

  function flyAway(dir: SwipeDirection) {
    if (exiting) return;
    setExiting(true);
    try {
      navigator.vibrate?.(15);
    } catch {}

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

    // Up has priority if more vertical than horizontal AND moving upward
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

    animate(x, 0, { type: "spring", stiffness: 380, damping: 32 });
    animate(y, 0, { type: "spring", stiffness: 380, damping: 32 });
  }

  function handleDrag(_e: unknown, info: PanInfo) {
    const ax = Math.abs(info.offset.x);
    const ay = Math.abs(info.offset.y);
    const past = ax > SWIPE_THRESHOLD * 0.85 || ay > SWIPE_THRESHOLD * 0.85;
    if (past && !haptic.current) {
      haptic.current = true;
      try {
        navigator.vibrate?.(8);
      } catch {}
    } else if (!past) {
      haptic.current = false;
    }
  }

  // Stack visual transform — cards behind the top look smaller + lower
  const baseScale = isTop ? 1 : 1 - stackIndex * 0.04;
  const baseTranslateY = isTop ? 0 : stackIndex * 12;

  const tapStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  return (
    <motion.div
      className="absolute inset-0 mx-auto flex max-w-md items-stretch justify-center px-4"
      style={{
        zIndex: 100 - stackIndex,
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
        // Tap: small movement + short duration → open profile
        if (dx < 8 && dy < 8 && dt < 350) {
          onTap(question);
        }
      }}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
      initial={false}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-900 shadow-card no-select">
        {/* Color overlay tied to drag */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 rounded-3xl mix-blend-soft-light"
          style={{ backgroundColor: overlayBg }}
        />

        {/* Stamps */}
        {isTop && (
          <>
            <motion.div
              className="pointer-events-none absolute left-6 top-8 z-30 rotate-[-14deg] rounded-xl border-4 border-accent-yes px-4 py-2 text-3xl font-black uppercase tracking-tight text-accent-yes"
              style={{ opacity: yesOpacity }}
            >
              Ja
            </motion.div>
            <motion.div
              className="pointer-events-none absolute right-6 top-8 z-30 rotate-[14deg] rounded-xl border-4 border-accent-no px-4 py-2 text-3xl font-black uppercase tracking-tight text-accent-no"
              style={{ opacity: noOpacity }}
            >
              Nee
            </motion.div>
            <motion.div
              className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 rounded-xl border-4 border-accent-maybe px-4 py-2 text-2xl font-black uppercase tracking-tight text-accent-maybe"
              style={{ opacity: maybeOpacity }}
            >
              Niet ik
            </motion.div>
          </>
        )}

        {/* Visualisatie / image area */}
        <div className="relative h-44 w-full bg-gradient-to-br from-navy-700 to-navy-800">
          {question.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <PlaceholderViz q={question} />
          )}
          <div className="absolute left-4 top-4 rounded-full bg-navy-950/70 px-3 py-1 text-xs font-medium text-steel-200 backdrop-blur">
            {question.externalId ?? `q-${question.position}`}
          </div>
          <div className="absolute right-4 top-4 rounded-full bg-navy-950/70 px-3 py-1 text-xs text-steel-300 backdrop-blur">
            {jobTitle.split("—")[0].trim()}
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-11rem)] flex-col gap-3 p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-steel-400">
            AI stelt voor
          </div>
          <h2 className="text-xl font-semibold leading-tight text-steel-100">
            {question.suggestion}
          </h2>

          <div className="mt-1 flex items-start gap-2 rounded-xl bg-navy-950/40 p-3 text-sm text-steel-200">
            <Info size={16} className="mt-0.5 flex-shrink-0 text-steel-300" />
            <p className="leading-snug">{question.reason}</p>
          </div>

          {question.bron && (
            <div className="mt-auto text-[11px] text-steel-400">
              Bron: {question.bron}
            </div>
          )}

          <div className="text-[11px] text-steel-400">
            Tik op de kaart voor de volledige onderbouwing →
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function PlaceholderViz({ q }: { q: Question }) {
  // Visually distinct placeholder per question (deterministic from id)
  const seed = q.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = (seed * 37) % 360;
  const hue2 = (hue1 + 40) % 360;
  return (
    <div
      className="relative h-full w-full"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1} 50% 28%), hsl(${hue2} 60% 18%))`
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`g-${q.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="200" height="100" fill={`url(#g-${q.id})`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-5xl font-black tracking-tight text-white/30">
          {q.externalId ?? "•"}
        </div>
      </div>
    </div>
  );
}
