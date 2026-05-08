"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Pencil,
  RefreshCw,
  X
} from "lucide-react";
import {
  fetchMyVotesWithCandidates,
  type VoteWithCandidate
} from "@/lib/candidates";
import type { Decision } from "@/lib/types";
import { BrandWordmark } from "./BrandWordmark";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  userEmail: string;
}

interface CategoryGroup {
  id: string; // batch.id of "loose"
  title: string;
  klantNaam: string | null;
  items: VoteWithCandidate[];
  yes: number;
  no: number;
  maybe: number;
  edited: number;
  lastVotedAt: string;
}

export function HistoryClient({ userEmail }: Props) {
  const [items, setItems] = useState<VoteWithCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    try {
      const data = await fetchMyVotesWithCandidates(userEmail);
      // Drafts horen niet in 'jouw spoor' — die zijn nog niet verzonden.
      setItems(data.filter((it) => !it.vote.isDraft));
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kon geschiedenis niet laden."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo<CategoryGroup[]>(
    () => (items ? groupByCategory(items) : []),
    [items]
  );

  const selected =
    selectedId !== null
      ? categories.find((c) => c.id === selectedId) ?? null
      : null;

  return (
    <div className="min-h-[100dvh] bg-bg pb-12">
      <header className="safe-top safe-x sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 pb-3 backdrop-blur">
        {selected ? (
          <button
            onClick={() => setSelectedId(null)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
            aria-label="Terug naar categorieën"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95"
            aria-label="Terug"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-base font-semibold text-vondr-dark-blue">
            {selected ? selected.title : "Geschiedenis"}
          </h1>
          <p className="truncate text-[11px] text-ink-500">
            {selected
              ? `${selected.items.length} ${selected.items.length === 1 ? "beslissing" : "beslissingen"}${
                  selected.klantNaam ? " · " + selected.klantNaam : ""
                }`
              : "Jouw spoor — gegroepeerd per categorie"}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 active:scale-95 disabled:opacity-40"
          aria-label="Vernieuwen"
        >
          <RefreshCw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </header>

      <main className="px-vondr-m pt-vondr-l">
        {error && (
          <div className="mb-3 rounded-vondr-l bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            {error}
          </div>
        )}

        {loading && !items && (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
            <div className="h-20 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
            <div className="h-20 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="rounded-vondr-l border border-dashed border-line-strong bg-surface p-6 text-center">
            <p className="text-sm text-ink-500">
              Nog geen verzonden beslissingen. Beoordeel een categorie en klik
              &lsquo;verzenden&rsquo; om je spoor op te bouwen.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block rounded-full bg-vondr-dark-blue px-5 py-2 text-sm font-medium text-white active:scale-95"
            >
              Naar home
            </Link>
          </div>
        )}

        {!selected && categories.length > 0 && (
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <CategoryTile
                  cat={cat}
                  onClick={() => setSelectedId(cat.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {selected && <DetailList items={selected.items} />}

        <div className="mt-8 text-center">
          <BrandWordmark height={18} className="opacity-40" />
        </div>
      </main>
    </div>
  );
}

function CategoryTile({
  cat,
  onClick
}: {
  cat: CategoryGroup;
  onClick: () => void;
}) {
  const total = cat.items.length;
  const yesPct = total === 0 ? 0 : (cat.yes / total) * 100;
  const noPct = total === 0 ? 0 : (cat.no / total) * 100;
  const maybePct = total === 0 ? 0 : (cat.maybe / total) * 100;

  return (
    <button
      onClick={onClick}
      className="block w-full rounded-vondr-l bg-surface px-vondr-l py-vondr-m text-left ring-1 ring-line transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Layers size={10} className="text-ink-400" />
            {cat.klantNaam ?? "—"}
            <span>· {formatRelativeShort(cat.lastVotedAt)}</span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-vondr-dark-blue">
            {cat.title}
          </h3>
        </div>
        <ChevronRight size={18} className="mt-1 flex-shrink-0 text-ink-400" />
      </div>

      <div className="mt-vondr-m flex h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="bg-accent-yes"
          style={{ width: `${yesPct}%` }}
        />
        <div className="bg-accent-no" style={{ width: `${noPct}%` }} />
        <div
          className="bg-accent-maybe"
          style={{ width: `${maybePct}%` }}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
        <span className="text-accent-yes">
          <Check size={11} className="inline -mt-0.5" strokeWidth={3} /> {cat.yes}
        </span>
        <span className="text-accent-no">
          <X size={11} className="inline -mt-0.5" strokeWidth={3} /> {cat.no}
        </span>
        <span className="text-accent-maybe">
          <ArrowUp size={11} className="inline -mt-0.5" strokeWidth={3} /> {cat.maybe}
        </span>
        {cat.edited > 0 && (
          <span className="text-vondr-pop">
            <Pencil size={10} className="inline -mt-0.5" /> {cat.edited} bewerkt
          </span>
        )}
        <span className="ml-auto text-ink-400">
          {total} {total === 1 ? "suggestie" : "suggesties"}
        </span>
      </div>
    </button>
  );
}

function DetailList({ items }: { items: VoteWithCandidate[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ul className="space-y-2">
      {items.map(({ vote, candidate }) => {
        const isOpen = expanded === vote.id;
        const wasEdited =
          vote.editedSuggestion !== null || vote.editedAnswer !== null;
        return (
          <li
            key={vote.id}
            className="overflow-hidden rounded-vondr-l bg-surface ring-1 ring-line"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : vote.id)}
              className="flex w-full items-start gap-3 p-3 text-left active:bg-bg/60"
            >
              <DecisionIcon decision={vote.decision} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    {decisionLabel(vote.decision)}
                  </span>
                  {wasEdited && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-vondr-pop/[0.1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-vondr-pop">
                      <Pencil size={9} /> bewerkt
                    </span>
                  )}
                  {candidate?.type && (
                    <span className="rounded-full bg-bg px-1.5 py-0.5 text-[9px] font-medium text-ink-500 ring-1 ring-line">
                      {candidate.type}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-vondr-dark-blue">
                  {vote.editedSuggestion ||
                    candidate?.suggestion ||
                    `[verwijderde suggestie · ${vote.externalId}]`}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {formatRelative(vote.votedAt)}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`mt-1 flex-shrink-0 text-ink-400 transition ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-line"
                >
                  <div className="space-y-3 p-3 text-sm">
                    {vote.editedSuggestion && (
                      <DiffField
                        label="Vraag (bewerkt)"
                        original={candidate?.suggestion ?? null}
                        edited={vote.editedSuggestion}
                      />
                    )}
                    {(vote.editedAnswer || candidate?.proposedAnswer) && (
                      <DiffField
                        label={
                          vote.editedAnswer
                            ? "Antwoord (bewerkt)"
                            : "Antwoord"
                        }
                        original={candidate?.proposedAnswer ?? null}
                        edited={vote.editedAnswer}
                      />
                    )}
                    {candidate?.klantQuote && (
                      <Block label="Klant-quote">
                        <p className="italic text-ink-700">
                          &ldquo;{candidate.klantQuote}&rdquo;
                        </p>
                      </Block>
                    )}
                    {candidate?.bron && (
                      <Block label="Bron">
                        <p className="text-ink-700">{candidate.bron}</p>
                      </Block>
                    )}
                    <div className="pt-1 text-[11px] text-ink-400">
                      {formatAbsolute(vote.votedAt)}
                      <span className="ml-2 text-ink-500">
                        · al verzonden naar het geheugen, niet meer terug te
                        trekken
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function groupByCategory(items: VoteWithCandidate[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const it of items) {
    const key = it.batch?.id ?? "loose";
    let cat = map.get(key);
    if (!cat) {
      cat = {
        id: key,
        title: it.batch?.title ?? "Losse suggesties",
        klantNaam: it.batch?.klantNaam ?? null,
        items: [],
        yes: 0,
        no: 0,
        maybe: 0,
        edited: 0,
        lastVotedAt: it.vote.votedAt
      };
      map.set(key, cat);
    }
    cat.items.push(it);
    if (it.vote.decision === "yes") cat.yes++;
    else if (it.vote.decision === "no") cat.no++;
    else cat.maybe++;
    if (it.vote.editedSuggestion || it.vote.editedAnswer) cat.edited++;
    if (it.vote.votedAt > cat.lastVotedAt) cat.lastVotedAt = it.vote.votedAt;
  }
  // Sort items binnen elke cat: meest recent eerst
  for (const cat of map.values()) {
    cat.items.sort((a, b) => (a.vote.votedAt < b.vote.votedAt ? 1 : -1));
  }
  // Sort categorieën: meest recent gevuld eerst
  return [...map.values()].sort((a, b) =>
    a.lastVotedAt < b.lastVotedAt ? 1 : -1
  );
}

function DecisionIcon({ decision }: { decision: Decision }) {
  if (decision === "yes")
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-yes/10 text-accent-yes ring-1 ring-accent-yes/30">
        <Check size={14} strokeWidth={3} />
      </div>
    );
  if (decision === "no")
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-no/10 text-accent-no ring-1 ring-accent-no/30">
        <X size={14} strokeWidth={3} />
      </div>
    );
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-maybe/10 text-accent-maybe ring-1 ring-accent-maybe/30">
      <ArrowUp size={14} strokeWidth={3} />
    </div>
  );
}

function decisionLabel(d: Decision) {
  return d === "yes" ? "Goedgekeurd" : d === "no" ? "Afgewezen" : "Naar afstemming";
}

function Block({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DiffField({
  label,
  original,
  edited
}: {
  label: string;
  original: string | null;
  edited: string | null;
}) {
  if (!edited) {
    return original ? (
      <Block label={label}>
        <p className="text-ink-700">{original}</p>
      </Block>
    ) : null;
  }
  return (
    <Block label={label}>
      {original && original !== edited && (
        <p className="text-ink-400 line-through decoration-ink-400/50">
          {original}
        </p>
      )}
      <p className="font-medium text-vondr-dark-blue">{edited}</p>
    </Block>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "zojuist";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min geleden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}u geleden`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d geleden`;
  return formatAbsolute(iso);
}

function formatRelativeShort(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}u`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}`;
}

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${h}:${m}`;
}
