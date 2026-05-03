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
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-navy-900 p-5 pb-10 scroll-soft"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-steel-400/40" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-steel-400">
              {question.externalId ?? `q-${question.position}`} · in {job.title.split("—")[0].trim()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-steel-200 active:scale-95"
            aria-label="Sluiten"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-3 text-xl font-semibold leading-tight text-steel-100">
          {question.suggestion}
        </h2>

        <section className="mt-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-steel-400">
            Onderbouwing
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-steel-200">
            {question.reasonLong || question.reason}
          </p>
        </section>

        {question.bron && (
          <section className="mt-5">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-steel-400">
              Bron
            </h3>
            <p className="mt-2 text-sm text-steel-200">{question.bron}</p>
          </section>
        )}

        {question.deeplink && (
          <a
            href={question.deeplink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-2 text-sm text-steel-100 active:scale-95"
          >
            Open in bron-systeem
            <ExternalLink size={14} />
          </a>
        )}

        <section className="mt-6 rounded-2xl bg-navy-800/60 p-4">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-steel-400">
            Wat gebeurt er na jouw stem?
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-steel-200">
            {job.approvalMode === "single" && (
              <li>
                <span className="text-steel-400">·</span> Bij <b>ja</b> wordt de
                suggestie direct doorgevoerd in {sourceLabel(job.source)}.
              </li>
            )}
            {job.approvalMode === "double" && (
              <li>
                <span className="text-steel-400">·</span> Twee teamleden moeten
                onafhankelijk stemmen. Andermans stem zie je pas <i>na</i> die
                van jou.
              </li>
            )}
            <li>
              <span className="text-steel-400">·</span> Bron-systeem krijgt een
              webhook met je gesigneerde beslissing.
            </li>
          </ul>
        </section>

        <p className="mt-6 text-center text-[11px] text-steel-400">
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
