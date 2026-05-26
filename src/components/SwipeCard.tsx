"use client";

import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  animate
} from "framer-motion";
import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import {
  FileText,
  Hand,
  Image as ImageIcon,
  Info,
  Plus,
  Video,
  X as XIcon
} from "lucide-react";
import type { Candidate, Decision, MediaItem, PeerVote } from "@/lib/types";
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

  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);

  // Edge-bar opacity (0..1) per richting — ramping vanaf 30px tot 130px.
  const yesOpacity = useTransform(x, (latestX) => {
    const v = latestX * flip;
    if (v < 30) return 0;
    if (v > 130) return 1;
    return (v - 30) / 100;
  });
  const noOpacity = useTransform(x, (latestX) => {
    const v = latestX * flip;
    if (v > -30) return 0;
    if (v < -130) return 1;
    return (-v - 30) / 100;
  });
  const maybeOpacity = useTransform(y, [-130, -30], [1, 0]);

  // Verkeerslicht-tints: groen=ja, rood=nee, blauw=pas.
  const overlayBg = useTransform(
    [x, y] as const,
    ([latestX, latestY]: number[]) => {
      const xFlipped = latestX * flip;
      const ax = Math.abs(latestX);
      const ay = Math.abs(latestY);
      if (latestY < -30 && ay > ax) {
        const a = Math.min(0.16, ay / 700);
        return `rgba(37, 99, 235, ${a})`; // accent-maybe (blauw)
      }
      if (xFlipped > 30) {
        const a = Math.min(0.16, xFlipped / 700);
        return `rgba(22, 163, 74, ${a})`; // accent-yes (groen)
      }
      if (xFlipped < -30) {
        const a = Math.min(0.16, -xFlipped / 700);
        return `rgba(220, 38, 38, ${a})`; // accent-no (rood)
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
        // Skip als de tap op een no-swipe element zat (Info-knop e.d.)
        const target = e.target as HTMLElement | null;
        if (target?.closest("[data-no-swipe]")) return;
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
      <div className="no-select relative flex h-full w-full flex-col gap-vondr-m overflow-hidden rounded-2xl border border-line bg-surface px-5 py-vondr-l pl-6 shadow-card">
        {/* Topic-spine — 3px verticale lijn links, kleur per type-tone */}
        <div
          className={`absolute left-0 top-[18px] bottom-[18px] w-[3px] rounded-r-full ${spineToneFor(candidate.type)}`}
        />

        {/* Tint-overlay tijdens drag */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl"
          style={{ backgroundColor: overlayBg }}
        />

        {/* Edge-bars: pill met icon + label, fade-in tijdens drag.
            Groen/rood/blauw conventie. */}
        {isTop && (
          <div className="pointer-events-none absolute inset-0 z-30">
            <motion.div
              className={`absolute top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full border-2 border-accent-yes bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-yes ${
                handedness === "left" ? "right-3.5" : "left-3.5"
              }`}
              style={{ opacity: yesOpacity }}
            >
              <Plus size={14} strokeWidth={2.4} />
              Toevoegen
            </motion.div>
            <motion.div
              className={`absolute top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full border-2 border-accent-no bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-no ${
                handedness === "left" ? "left-3.5" : "right-3.5"
              }`}
              style={{ opacity: noOpacity }}
            >
              <XIcon size={14} strokeWidth={2.4} />
              Afwijzen
            </motion.div>
            <motion.div
              className="absolute left-1/2 top-3.5 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-accent-maybe bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-maybe"
              style={{ opacity: maybeOpacity }}
            >
              <Hand size={14} strokeWidth={2.4} />
              Pas
            </motion.div>
          </div>
        )}

        {/* Info-knop voor "meer details" — tap-target rechtsboven (de hele
            kaart-tap werkt ook, dit is gewoon een duidelijkere affordance). */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTap(candidate);
          }}
          aria-label="Meer details"
          data-no-swipe
          className="pointer-events-auto absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-400 ring-1 ring-line transition active:scale-90 hover:text-vondr-dark-blue"
        >
          <Info size={15} strokeWidth={2} />
        </button>

        {/* Hoofd: media (visuele types) of vraag + antwoord */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden pr-8">
          {candidate.media.length > 0 ? (
            <CardMedia
              media={candidate.media}
              suggestion={candidate.suggestion}
            />
          ) : (
            <>
              <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] text-vondr-dark-blue [text-wrap:pretty]">
                {candidate.suggestion}
              </h1>

              {candidate.proposedAnswer && (
                <p className="line-clamp-[10] text-[15px] leading-[1.55] text-ink-700 [text-wrap:pretty]">
                  {candidate.proposedAnswer}
                </p>
              )}
            </>
          )}
        </div>

        {peerVote && <PeerContext peer={peerVote} />}
      </div>
    </motion.div>
  );
});

/**
 * Spine-tone per type:
 * - "warm" (oranje pop) — creatieve / visuele kandidaten
 * - "cool" (light-blue) — vraag/antwoord-types die nog input nodig hebben
 * - "mono" (dark-blue, default) — feiten, regels, beslissingen
 */
function spineToneFor(type: string): string {
  if (
    type === "Brand-asset" ||
    type === "Visual-mockup" ||
    type === "Brand-regel" ||
    type === "Copy-keuze"
  ) {
    return "bg-vondr-pop";
  }
  if (type === "Nieuwe FAQ" || type === "Antwoord-update") {
    return "bg-vondr-light-blue";
  }
  return "bg-vondr-dark-blue";
}

function CardMedia({
  media,
  suggestion
}: {
  media: MediaItem[];
  suggestion: string;
}) {
  const primary = media[0];
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      <h1 className="line-clamp-2 text-[18px] font-semibold leading-[1.2] tracking-[-0.01em] text-vondr-dark-blue [text-wrap:pretty]">
        {suggestion}
      </h1>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-vondr-l bg-bg ring-1 ring-line">
        {primary.kind === "image" && (
          <img
            src={primary.url}
            alt={primary.alt ?? suggestion}
            draggable={false}
            className="h-full w-full select-none object-contain"
          />
        )}
        {primary.kind === "pdf" && (
          <a
            href={primary.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 px-4 py-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText size={36} className="text-ink-500" />
            <span className="text-sm font-medium text-vondr-dark-blue">
              Open PDF
            </span>
            <span className="text-[11px] text-ink-400">
              {primary.label ?? "voorstel"}
            </span>
          </a>
        )}
        {primary.kind === "video" && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-500">
            <Video size={36} />
            <span className="text-sm font-medium text-vondr-dark-blue">
              Video-voorstel
            </span>
          </div>
        )}
        {primary.kind === "url" && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-500">
            <ImageIcon size={36} />
            <span className="line-clamp-2 text-sm font-medium text-vondr-dark-blue">
              {primary.label ?? "Externe bron"}
            </span>
          </div>
        )}

        {primary.label && primary.kind === "image" && (
          <span className="absolute left-2 top-2 rounded-full bg-vondr-dark-blue/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
            {primary.label}
          </span>
        )}
      </div>

      {/* Thumb-rij voor extra varianten */}
      {media.length > 1 && (
        <div className="flex flex-shrink-0 gap-1.5 overflow-x-auto">
          {media.slice(1, 5).map((m, i) => (
            <div
              key={i}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg ring-1 ring-line"
            >
              {m.kind === "image" ? (
                <img
                  src={m.url}
                  alt={m.alt ?? ""}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <FileText size={14} className="text-ink-400" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PeerContext({ peer }: { peer: PeerVote }) {
  const peerName = peer.votedBy.split("@")[0];
  const decisionMeta =
    peer.decision === "yes"
      ? { label: "Toevoegen", cls: "border-vondr-pop text-vondr-pop" }
      : peer.decision === "no"
        ? {
            label: "Afwijzen",
            cls: "border-vondr-dark-blue text-vondr-dark-blue"
          }
        : {
            label: "Pas",
            cls: "border-vondr-light-blue text-vondr-dark-blue"
          };
  const hasEdit = peer.editedSuggestion || peer.editedAnswer;

  return (
    <div className="-mx-5 -mb-vondr-l mt-1 border-t border-line bg-vondr-pop/[0.04] px-5 py-2.5">
      <div className="flex items-center gap-2 text-[11.5px] text-ink-700">
        <span
          className={`inline-flex items-center rounded-full border-2 bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${decisionMeta.cls}`}
        >
          {decisionMeta.label}
        </span>
        <span>
          <strong className="font-semibold capitalize">{peerName}</strong> stemde
          al
        </span>
      </div>
      {hasEdit && (
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-700">
          <span className="text-ink-400">Voorstel: </span>
          &ldquo;{peer.editedSuggestion ?? peer.editedAnswer}&rdquo;
        </p>
      )}
    </div>
  );
}
