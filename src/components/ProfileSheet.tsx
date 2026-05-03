"use client";

import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import type { Job, Question } from "@/lib/types";

interface Props {
  question: Question;
  job: Job;
  onClose: () => void;
}

export function ProfileSheet({ question, job, onClose }: Props) {
  return (
    <motion.div
      // Volledig viewport, blokkeert alle interactie eronder
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink-900/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-10 ring-1 ring-line scroll-soft"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
              {question.externalId ?? `q-${question.position}`} · in{" "}
              {job.title.split(/[—\-–]/)[0].trim()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg text-ink-700 ring-1 ring-line active:scale-95"
            aria-label="Sluiten"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-3 text-xl font-semibold leading-tight text-ink-900">
          {question.suggestion}
        </h2>

        <section className="mt-5">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
            Onderbouwing
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">
            {question.reasonLong || question.reason}
          </p>
        </section>

        {question.bron && (
          <section className="mt-5">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
              Bron
            </h3>
            <p className="mt-2 text-sm text-ink-700">{question.bron}</p>
          </section>
        )}

        {question.deeplink && (
          <a
            href={question.deeplink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-bg px-4 py-2 text-sm text-ink-900 ring-1 ring-line active:scale-95"
          >
            Open in bron-systeem
            <ExternalLink size={14} />
          </a>
        )}

        <section className="mt-6 rounded-2xl bg-bg p-4 ring-1 ring-line">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
            Wat gebeurt er na jouw stem?
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
            {job.approvalMode === "single" && (
              <li>
                <span className="text-ink-400">·</span> Bij <b>ja</b> wordt de
                suggestie direct doorgevoerd in {sourceLabel(job.source)}.
              </li>
            )}
            {job.approvalMode === "double" && (
              <li>
                <span className="text-ink-400">·</span> Twee teamleden moeten
                onafhankelijk stemmen. Andermans stem zie je pas <i>na</i> die
                van jou.
              </li>
            )}
            <li>
              <span className="text-ink-400">·</span> Bron-systeem krijgt een
              webhook met je gesigneerde beslissing.
            </li>
          </ul>
        </section>

        <p className="mt-6 text-center text-[11px] text-ink-400">
          Sluit dit en swipe — links · rechts · omhoog
        </p>
      </motion.div>
    </motion.div>
  );
}

function sourceLabel(s: string) {
  return (
    {
      nextbim: "NextBIM",
      "meeting-coach": "Meeting Coach",
      "brein-curator": "Brein Curator",
      other: "het bron-systeem"
    } as Record<string, string>
  )[s] ?? s;
}
