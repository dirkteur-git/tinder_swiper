"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, ExternalLink, Mic, User } from "lucide-react";
import { useEffect, useState } from "react";
import type { Candidate } from "@/lib/types";
import * as haptic from "@/lib/haptic";

interface Props {
  /** Item dat zojuist is toegevoegd. Optioneel — zonder item toont een
   *  generieke "geregistreerd"-melding (compat met losse-flow). */
  item?: Candidate;
  /** Optionele stats voor de mini-grid. */
  stats?: { total: number; week: number; consensus: number };
  onDismiss: () => void;
}

const UNDO_SEC = 3;

export function MatchOverlay({ item, stats, onDismiss }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SEC);

  useEffect(() => {
    haptic.success();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Achtergrond: vondr-white met subtiele grid-overlay */}
      <motion.div
        className="absolute inset-0 bg-bg/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(19,16,45,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(19,16,45,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      <motion.div
        className="relative mx-6 flex w-full max-w-sm flex-col items-center gap-vondr-m rounded-2xl bg-surface px-vondr-l py-vondr-xl shadow-card ring-1 ring-line"
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pulse-stamp */}
        <div className="relative mt-2 h-[88px] w-[88px]">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-vondr-pop"
            animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.25, 0.9] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-[10px] flex items-center justify-center rounded-full bg-vondr-pop text-vondr-white">
            <Check size={32} strokeWidth={2.6} />
          </div>
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-vondr-pop">
          Toegevoegd aan vondr
        </div>

        {item ? (
          <>
            <h2 className="line-clamp-3 text-center text-[22px] font-semibold leading-[1.22] tracking-[-0.015em] text-vondr-dark-blue [text-wrap:balance]">
              &ldquo;{item.suggestion}&rdquo;
            </h2>

            <div className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-500">
              {item.bron && (
                <>
                  <Mic size={13} className="text-ink-400" />
                  <span>{item.bron.replace(/^transcript\s+/i, "")}</span>
                </>
              )}
              {item.klantNaam && (
                <>
                  <span className="text-ink-300">·</span>
                  <User size={13} className="text-ink-400" />
                  <span>{item.klantNaam}</span>
                </>
              )}
            </div>

            {stats && (
              <div className="mt-1 grid w-full grid-cols-3 gap-2">
                <Stat value={String(stats.total)} label="Items" />
                <Stat value={`+${stats.week}`} label="Deze week" />
                <Stat value={`${stats.consensus}%`} label="Consensus" />
              </div>
            )}
          </>
        ) : (
          <h2 className="text-center text-2xl font-semibold tracking-tight text-vondr-dark-blue">
            Beslissing geregistreerd
          </h2>
        )}

        <div className="mt-2 grid w-full grid-cols-[1fr_1.4fr] gap-2">
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-line bg-surface px-3 py-2.5 text-[13px] font-semibold text-vondr-dark-blue transition hover:border-vondr-dark-blue active:scale-[0.97]"
          >
            <ExternalLink size={14} />
            In KB
          </button>
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-vondr-pop bg-vondr-pop px-3 py-2.5 text-[13px] font-semibold text-white transition hover:border-vondr-dark-blue hover:bg-vondr-dark-blue active:scale-[0.97]"
          >
            Volgende kaart
            <ArrowRight size={14} />
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="text-[11px] font-medium text-ink-400 underline-offset-2 hover:underline disabled:opacity-40"
          disabled={secondsLeft <= 0}
        >
          undo {secondsLeft > 0 ? `(${secondsLeft}s)` : "(verlopen)"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-bg px-2 py-2.5 text-center">
      <div className="text-[18px] font-semibold leading-none text-vondr-dark-blue">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.04em] text-ink-400">
        {label}
      </div>
    </div>
  );
}
