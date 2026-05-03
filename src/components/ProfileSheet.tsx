"use client";

import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import type { Fact, Job, Question } from "@/lib/types";

interface Props {
  question: Question;
  job: Job;
  onClose: () => void;
}

export function ProfileSheet({ question, job, onClose }: Props) {
  const topic = job.title.split(/[—\-–]/)[0].trim();

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink-900/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface ring-1 ring-line scroll-soft"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-line bg-surface/95 px-5 pb-3 pt-3 backdrop-blur">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {question.type && (
                  <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    {question.type}
                  </span>
                )}
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
                  {question.externalId ?? `q-${question.position}`}
                </span>
              </div>
              <div className="mt-1 truncate text-[11px] text-ink-500">
                in {topic}
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
        </div>

        <div className="px-5 pb-10 pt-4">
          <h2 className="text-xl font-semibold leading-tight text-ink-900">
            {question.suggestion}
          </h2>

          {question.facts && question.facts.length > 0 && (
            <FactsBlock facts={question.facts} />
          )}

          <Section title="Onderbouwing">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {question.reasonLong || question.reason}
            </p>
          </Section>

          {question.bron && (
            <Section title="Bron">
              <p className="text-sm text-ink-700">{question.bron}</p>
            </Section>
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
                  · Bij <b>ja</b> wordt de suggestie direct doorgevoerd in{" "}
                  {sourceLabel(job.source)}.
                </li>
              )}
              {job.approvalMode === "double" && (
                <li>
                  · Twee teamleden moeten onafhankelijk stemmen. Andermans stem
                  zie je pas <i>na</i> die van jou.
                </li>
              )}
              <li>
                · Bron-systeem krijgt een webhook met je gesigneerde
                beslissing.
              </li>
            </ul>
          </section>

          <p className="mt-6 text-center text-[11px] text-ink-400">
            Sluit dit en swipe — links · rechts · omhoog
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FactsBlock({ facts }: { facts: Fact[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-bg ring-1 ring-line">
      {facts.map((f, i) => (
        <FactRow key={i} fact={f} isLast={i === facts.length - 1} />
      ))}
    </div>
  );
}

function FactRow({ fact, isLast }: { fact: Fact; isLast: boolean }) {
  const v = fact.variant;
  return (
    <div
      className={`flex gap-3 px-4 py-3 ${
        isLast ? "" : "border-b border-line"
      } ${v === "old" ? "bg-ink-300/10" : v === "new" ? "bg-accent-yes/[0.06]" : ""}`}
    >
      <div className="w-28 flex-shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {fact.label}
      </div>
      <div
        className={
          v === "old"
            ? "flex-1 text-sm leading-snug text-ink-400 line-through decoration-ink-400/60"
            : v === "new"
              ? "flex-1 text-sm font-semibold leading-snug text-ink-900"
              : v === "highlight"
                ? "flex-1 border-l-2 border-ink-900 pl-3 text-base font-medium leading-snug text-ink-900"
                : "flex-1 text-sm leading-snug text-ink-700"
        }
      >
        {fact.value}
      </div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
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
