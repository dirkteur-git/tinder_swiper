"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { Candidate, PeerVote } from "@/lib/types";
import * as haptic from "@/lib/haptic";

interface Props {
  candidate: Candidate;
  /** In afstem-batches: voorstel van de andere reviewer dat we gebruiken als startwaarde. */
  peerVote?: PeerVote;
  onApprove: (edits: { suggestion?: string; answer?: string }) => void;
  onReject: () => void;
  onClose: () => void;
}

/**
 * Edit-before-accept bottom-sheet. Twee bewerkbare velden (vraag, antwoord)
 * + read-only context. Submitten schrijft een vote met edited_-velden ingevuld
 * als de tekst is gewijzigd, anders NULL (per spec).
 *
 * Bij afstem-batches (peerVote aanwezig met edits): startwaarde is peer's
 * voorstel zodat de gebruiker meteen ziet waar hij op stemt en eventueel
 * kan finetunen. "Bewerkt"-badge vergelijkt tegen de startwaarde, niet het
 * origineel.
 */
export function EditSheet({
  candidate,
  peerVote,
  onApprove,
  onReject,
  onClose
}: Props) {
  const baseSuggestion = peerVote?.editedSuggestion ?? candidate.suggestion;
  const baseAnswer = peerVote?.editedAnswer ?? candidate.proposedAnswer ?? "";

  const [suggestion, setSuggestion] = useState(baseSuggestion);
  const [answer, setAnswer] = useState(baseAnswer);

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    haptic.unlock();
  }, []);

  const suggestionEdited = suggestion.trim() !== baseSuggestion.trim();
  const answerEdited = answer.trim() !== baseAnswer.trim();

  function handleApprove() {
    // Schrijf altijd onze versie als edit als deze afwijkt van het
    // candidate-origineel (niet van de peer-base) — MegaVondr verwerkt dit als
    // *jouw* finale tekst.
    const origSuggestion = candidate.suggestion.trim();
    const origAnswer = (candidate.proposedAnswer ?? "").trim();
    onApprove({
      suggestion:
        suggestion.trim() !== origSuggestion ? suggestion.trim() : undefined,
      answer: answer.trim() !== origAnswer ? answer.trim() : undefined
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink-900/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={sheetRef}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface ring-1 ring-line scroll-soft"
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
              <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                {candidate.type}
              </span>
              <div className="mt-1 truncate text-[11px] text-ink-500">
                {candidate.klantNaam ?? "—"}
                {candidate.meetingDatum
                  ? ` · ${candidate.meetingDatum}`
                  : ""}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg text-ink-700 ring-1 ring-line active:scale-95"
              aria-label="Annuleren"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-6 pt-4">
          {peerVote && (
            <PeerBanner
              peer={peerVote}
              hasEditedSuggestion={
                peerVote.editedSuggestion !== null &&
                peerVote.editedSuggestion !== candidate.suggestion
              }
              hasEditedAnswer={
                peerVote.editedAnswer !== null &&
                peerVote.editedAnswer !== candidate.proposedAnswer
              }
            />
          )}

          {/* Bewerkbaar: vraag */}
          <Section
            label="Vraag"
            edited={suggestionEdited}
            hint={
              peerVote?.editedSuggestion
                ? `Voorstel van ${peerVote.votedBy.split("@")[0]} — pas aan of laat staan.`
                : "Bewerk vóór je goedkeurt — dit komt zo in de FAQ."
            }
          >
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl bg-surface-soft px-3 py-2.5 text-base leading-snug text-ink-900 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
          </Section>

          {/* Bewerkbaar: antwoord */}
          <Section
            label="Antwoord"
            edited={answerEdited}
            hint={
              peerVote?.editedAnswer
                ? `Voorstel van ${peerVote.votedBy.split("@")[0]} — pas aan of laat staan.`
                : "Hoe het brein deze vraag straks beantwoordt."
            }
          >
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              placeholder="Voorgesteld antwoord..."
              className="w-full resize-none rounded-xl bg-surface-soft px-3 py-2.5 text-sm leading-snug text-ink-900 ring-1 ring-line placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
          </Section>

          {/* Read-only context */}
          {candidate.klantQuote && (
            <ReadOnly label="Letterlijke quote">
              <p className="text-sm italic leading-snug text-ink-700">
                &ldquo;{candidate.klantQuote}&rdquo;
              </p>
            </ReadOnly>
          )}

          {candidate.reasonLong && (
            <ReadOnly label="Context">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {candidate.reasonLong}
              </p>
            </ReadOnly>
          )}

          {candidate.facts && candidate.facts.length > 0 && (
            <ReadOnly label="Feiten">
              <dl className="space-y-1.5">
                {candidate.facts.map((f, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <dt className="w-24 flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                      {f.label}
                    </dt>
                    <dd className="flex-1 text-ink-700">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </ReadOnly>
          )}

          {candidate.bron && (
            <ReadOnly label="Bron">
              <p className="text-sm text-ink-700">{candidate.bron}</p>
            </ReadOnly>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="safe-bottom sticky bottom-0 z-10 border-t border-line bg-surface/95 px-5 pb-4 pt-3 backdrop-blur">
          <div className="flex gap-2">
            <button
              onClick={onReject}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-no/[0.08] py-3 text-sm font-semibold text-accent-no ring-1 ring-accent-no/25 active:scale-[0.98]"
            >
              <X size={16} strokeWidth={3} />
              Afwijzen
            </button>
            <button
              onClick={handleApprove}
              className="flex flex-[1.6] items-center justify-center gap-2 rounded-xl bg-accent-yes py-3 text-sm font-semibold text-white active:scale-[0.98]"
            >
              <Check size={16} strokeWidth={3} />
              Goedkeuren
              {(suggestionEdited || answerEdited) && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  bewerkt
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({
  label,
  edited,
  hint,
  children
}: {
  label: string;
  edited: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-700">
          {label}
        </h3>
        {edited && (
          <span className="rounded-full bg-accent-maybe/[0.1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent-maybe">
            Bewerkt
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function PeerBanner({
  peer,
  hasEditedSuggestion,
  hasEditedAnswer
}: {
  peer: PeerVote;
  hasEditedSuggestion: boolean;
  hasEditedAnswer: boolean;
}) {
  const peerName = peer.votedBy.split("@")[0];
  const decisionLabel =
    peer.decision === "yes" ? "JA" : peer.decision === "no" ? "NEE" : "PAS";
  const cls =
    peer.decision === "yes"
      ? "bg-accent-yes/[0.08] text-accent-yes ring-accent-yes/30"
      : peer.decision === "no"
        ? "bg-accent-no/[0.08] text-accent-no ring-accent-no/30"
        : "bg-accent-maybe/[0.08] text-accent-maybe ring-accent-maybe/30";
  return (
    <section className="mb-4 rounded-xl bg-vondr-pop/[0.06] p-3 ring-1 ring-vondr-pop/20">
      <div className="flex items-center gap-2 text-[11px] text-ink-700">
        <span
          className={`flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ${cls}`}
        >
          {decisionLabel}
        </span>
        <span>
          <strong className="font-semibold capitalize">{peerName}</strong> stemde
          al
        </span>
      </div>
      {(hasEditedSuggestion || hasEditedAnswer) && (
        <p className="mt-1 text-[11px] text-ink-500">
          De velden hieronder zijn voorgevuld met {peerName}&apos;s voorstel.
          Pas aan of laat staan.
        </p>
      )}
    </section>
  );
}

function ReadOnly({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </h3>
      <div className="mt-1.5 rounded-xl bg-bg p-3 ring-1 ring-line">
        {children}
      </div>
    </section>
  );
}
