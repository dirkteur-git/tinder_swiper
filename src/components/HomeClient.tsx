"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Hourglass,
  Layers,
  RefreshCw,
  Send,
  Settings as SettingsIcon
} from "lucide-react";
import {
  fetchBatchProgress,
  fetchMyVotesWithCandidates,
  fetchOpenLooseCandidates,
  type VoteWithCandidate
} from "@/lib/candidates";
import type { BatchProgress } from "@/lib/types";
import { BrandWordmark } from "./BrandWordmark";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import * as haptic from "@/lib/haptic";

interface Props {
  userEmail: string;
  displayName: string;
}

interface MyStats {
  contributed: number;       // committed JA-votes
  totalCommitted: number;    // alle committed votes
  avgResponseMs: number | null; // tijd tussen candidate-binnen en jouw stem
}

export function HomeClient({ userEmail, displayName }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchProgress[]>([]);
  const [looseCount, setLooseCount] = useState(0);
  const [recent, setRecent] = useState<VoteWithCandidate[]>([]);
  const [stats, setStats] = useState<MyStats>({
    contributed: 0,
    totalCommitted: 0,
    avgResponseMs: null
  });

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [progress, loose, mine] = await Promise.all([
        fetchBatchProgress(userEmail),
        fetchOpenLooseCandidates(),
        fetchMyVotesWithCandidates(userEmail)
      ]);
      setBatches(progress);
      setLooseCount(loose.length);
      const committed = mine.filter((m) => !m.vote.isDraft);
      setRecent(committed.slice(0, 4));
      setStats(computeStats(committed));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon gegevens niet laden.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const ptr = usePullToRefresh({
    onRefresh: async () => {
      haptic.tick();
      await load();
    }
  });

  // Batches waar JIJ nog moet beslissen of verzenden
  const openBatches = batches.filter(
    (b) => !b.isFullySent && b.batch.comparedAt === null
  );
  // Batches waar jij klaar bent maar de cyclus nog draait —
  // wachtend op andere reviewer of op compare-stap.
  const inBehandeling = batches.filter(
    (b) =>
      b.batch.comparedAt === null &&
      b.isFullySent &&
      (b.awaitingPeers || b.awaitingCompare)
  );
  // Drafts tellen NIET als "wacht op oordeel" — die zijn al beslist,
  // alleen nog niet verzonden. Daarom decided i.p.v. committed.
  const totalOpenCards =
    openBatches.reduce(
      (acc, b) => acc + (b.totalCandidates - b.decided),
      0
    ) + looseCount;
  const firstName = capitalize(displayName.split(/[._-]/)[0]);
  const contributedCount = stats.contributed;

  return (
    <div className="min-h-[100dvh] bg-bg pb-20">
      <header className="safe-top safe-x relative z-30 flex items-center gap-1 pb-3">
        <BrandWordmark height={22} />
        <div className="flex-1" />
        <IconBtn
          onClick={() => void load()}
          disabled={refreshing}
          label="Vernieuwen"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
        </IconBtn>
        <IconBtnLink href="/history" label="Geschiedenis">
          <Clock size={16} />
        </IconBtnLink>
        <IconBtnLink href="/settings" label="Instellingen">
          <SettingsIcon size={16} />
        </IconBtnLink>
      </header>

      {(ptr.pullDistance > 0 || ptr.refreshing) && (
        <motion.div
          className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex justify-center"
          style={{
            paddingTop: `calc(env(safe-area-inset-top) + ${ptr.pullDistance}px)`
          }}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-tile ring-1 ring-line ${
              ptr.armed || ptr.refreshing
                ? "text-vondr-pop"
                : "text-ink-500"
            }`}
          >
            <RefreshCw
              size={16}
              className={ptr.refreshing ? "animate-spin" : ""}
            />
          </div>
        </motion.div>
      )}

      <main className="mx-auto max-w-[28rem] px-vondr-l">
        {/* HERO */}
        <section className="pt-vondr-xl">
          <p className="text-sm font-medium text-ink-500">Hoi {firstName}.</p>

          <h1 className="mt-vondr-l text-[2rem] font-semibold leading-[1.15] tracking-tight text-vondr-dark-blue sm:text-[2.25rem]">
            Jouw beslissingen worden het{" "}
            <span className="text-vondr-pop">collectieve geheugen</span> van
            vondr.
          </h1>

          <p className="mt-vondr-m text-base leading-relaxed text-ink-700">
            <ContributionLine
              loading={loading}
              contributed={contributedCount}
              openCards={totalOpenCards}
            />
          </p>

          {!loading && stats.avgResponseMs !== null && (
            <p className="mt-vondr-s text-[11px] text-ink-400">
              Gemiddeld reageer je binnen {formatDuration(stats.avgResponseMs)}.
            </p>
          )}
        </section>

        {error && (
          <div className="mt-vondr-l rounded-vondr-l bg-accent-no/[0.06] p-3 text-sm text-accent-no ring-1 ring-accent-no/20">
            {error}
          </div>
        )}

        {/* BATCHES */}
        <section className="pt-vondr-xl">
          <h2 className="mb-vondr-m px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
            Te beoordelen
          </h2>

          {loading && batches.length === 0 ? (
            <div className="space-y-2">
              <div className="h-24 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
              <div className="h-24 animate-pulse rounded-vondr-l bg-surface ring-1 ring-line" />
            </div>
          ) : openBatches.length === 0 && looseCount === 0 ? (
            <div className="rounded-vondr-l border border-line bg-surface px-vondr-l py-vondr-l">
              <p className="text-sm text-ink-500">
                Niks te beoordelen. MegaVondr stuurt vanzelf nieuwe categorieën
                zodra er gesprekken zijn verwerkt.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {openBatches.map((bp) => (
                <li key={bp.batch.id}>
                  <BatchTile bp={bp} />
                </li>
              ))}
              {looseCount > 0 && (
                <li>
                  <Link
                    href="/swipe"
                    className="group flex items-center justify-between gap-3 rounded-vondr-l border border-dashed border-line-strong bg-surface px-vondr-l py-vondr-m text-vondr-dark-blue active:scale-[0.99]"
                  >
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                        Losse suggesties
                      </div>
                      <div className="mt-0.5 text-base font-semibold">
                        {looseCount}{" "}
                        {looseCount === 1 ? "suggestie" : "suggesties"} zonder
                        categorie
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-ink-500 transition group-active:translate-x-0.5"
                    />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* IN BEHANDELING — door jou verzonden, wacht op anderen of compare */}
        {inBehandeling.length > 0 && (
          <section className="pt-vondr-xl">
            <h2 className="mb-vondr-m px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
              In behandeling
            </h2>
            <ul className="space-y-2">
              {inBehandeling.map((bp) => (
                <li key={bp.batch.id}>
                  <InBehandelingTile bp={bp} userEmail={userEmail} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* RECENT */}
        <section className="pt-vondr-xxl">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
              Jouw spoor
            </h2>
            {recent.length > 0 && (
              <Link
                href="/history"
                className="text-[12px] font-medium text-vondr-pop hover:underline"
              >
                Alles zien →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="mt-vondr-m space-y-2">
              <div className="h-12 animate-pulse rounded bg-line/50" />
              <div className="h-12 animate-pulse rounded bg-line/50" />
            </div>
          ) : recent.length === 0 ? (
            <p className="mt-vondr-m text-sm text-ink-500">
              Nog geen verzonden beslissingen. Beoordeel een categorie en klik
              &lsquo;verzenden&rsquo; om iets aan het geheugen toe te voegen.
            </p>
          ) : (
            <ul className="mt-vondr-m divide-y divide-line">
              {recent.map(({ vote, candidate, batch }) => (
                <li
                  key={vote.id}
                  className="flex items-start gap-3 py-vondr-m"
                >
                  <DecisionDot decision={vote.decision} />
                  <div className="min-w-0 flex-1">
                    {batch && (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                        <Layers size={9} className="text-ink-400" />
                        <span className="line-clamp-1">{batch.title}</span>
                      </div>
                    )}
                    <p className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug text-vondr-dark-blue">
                      {vote.editedSuggestion ||
                        candidate?.suggestion ||
                        `[${vote.externalId}]`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      <span className={decisionColor(vote.decision)}>
                        {decisionLabel(vote.decision)}
                      </span>
                      {" · "}
                      {formatRelative(vote.votedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pt-vondr-xxl">
          <p className="text-[13px] italic leading-relaxed text-ink-500">
            &ldquo;Jij instrueert, AI voert uit, jij beslist.&rdquo;
          </p>
          <p className="mt-1 text-[11px] text-ink-400">vondr · brand-as-code</p>
        </footer>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────── */

function BatchTile({ bp }: { bp: BatchProgress }) {
  const { batch, totalCandidates, decided, drafts } = bp;
  const isReady = bp.isComplete && drafts > 0;
  const isFollowup = batch.isFollowup;
  const remaining = totalCandidates - decided;

  // Donker tile als batch klaar is om te verzenden — visueel-prominent
  if (isReady) {
    return (
      <Link
        href={`/batch/${batch.id}/summary`}
        className="group flex items-center justify-between gap-4 rounded-vondr-l bg-vondr-dark-blue px-vondr-l py-5 text-white shadow-card transition active:scale-[0.99]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-vondr-light-blue">
            {isFollowup && (
              <span className="rounded-full bg-vondr-pop/30 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-white">
                Afstemming
              </span>
            )}
            Klaar om te verzenden
          </div>
          <div className="mt-1 truncate text-base font-semibold">
            {batch.title}
          </div>
          <div className="mt-0.5 text-[11px] text-vondr-light-blue">
            {decided} {decided === 1 ? "beslissing" : "beslissingen"} ·{" "}
            {batch.klantNaam ?? "—"}
            {batch.meetingDatum ? ` · ${formatDate(batch.meetingDatum)}` : ""}
          </div>
        </div>
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-vondr-pop text-white">
          <Send size={18} strokeWidth={2.4} />
        </span>
      </Link>
    );
  }

  const progressPct =
    totalCandidates === 0 ? 0 : (decided / totalCandidates) * 100;

  return (
    <Link
      href={`/batch/${batch.id}`}
      className={`group block rounded-vondr-l px-vondr-l py-vondr-m ring-1 transition active:scale-[0.99] ${
        isFollowup
          ? "bg-vondr-pop/[0.04] ring-vondr-pop/25"
          : "bg-surface ring-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {isFollowup ? (
              <span className="rounded-full bg-vondr-pop/[0.12] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-vondr-pop">
                Afstemming
              </span>
            ) : (
              <Layers size={10} className="text-ink-400" />
            )}
            {batch.klantNaam ?? "—"}
            {batch.meetingDatum && (
              <span>· {formatDate(batch.meetingDatum)}</span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-vondr-dark-blue">
            {batch.title}
          </h3>
        </div>
        <ArrowRight
          size={18}
          className="mt-1 flex-shrink-0 text-ink-400 transition group-active:translate-x-0.5"
        />
      </div>

      <div className="mt-vondr-m">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-vondr-dark-blue transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
          <span>
            {decided === 0
              ? `${totalCandidates} ${totalCandidates === 1 ? "suggestie" : "suggesties"} te beoordelen`
              : remaining === 0
                ? "alles beslist"
                : `${remaining} te gaan · ${decided} klaar`}
          </span>
          {drafts > 0 && (
            <span className="text-vondr-pop">
              {drafts} concept
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function InBehandelingTile({
  bp,
  userEmail
}: {
  bp: BatchProgress;
  userEmail: string;
}) {
  const { batch, totalCandidates, awaitingCompare } = bp;
  const peers = bp.reviewerProgress.filter((rp) => rp.email !== userEmail);

  // Statusregel + icoon
  let icon: React.ReactNode;
  let statusLabel: string;
  let statusTone: "wait" | "ready";
  if (awaitingCompare) {
    icon = <CheckCircle2 size={14} className="text-accent-yes" />;
    statusLabel = "Klaar voor vergelijk";
    statusTone = "ready";
  } else {
    icon = <Hourglass size={14} className="text-vondr-pop" />;
    const waitingNames = peers
      .filter((p) => !p.isFullySent)
      .map((p) => capitalize(p.email.split("@")[0]));
    statusLabel =
      waitingNames.length === 0
        ? "Wacht op vergelijk"
        : `Wacht op ${waitingNames.join(" + ")}`;
    statusTone = "wait";
  }

  return (
    <Link
      href={`/batch/${batch.id}/summary`}
      className="group block rounded-vondr-l bg-surface px-vondr-l py-vondr-m ring-1 ring-line transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Layers size={10} className="text-ink-400" />
            {batch.klantNaam ?? "—"}
            {batch.meetingDatum && (
              <span>· {formatDate(batch.meetingDatum)}</span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-vondr-dark-blue">
            {batch.title}
          </h3>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bg ring-1 ring-line">
          {icon}
        </div>
      </div>

      <div className="mt-vondr-m flex items-center justify-between gap-2 text-[11px]">
        <span
          className={
            statusTone === "ready" ? "text-accent-yes" : "text-vondr-pop"
          }
        >
          {statusLabel}
        </span>
        <span className="flex items-center gap-2 text-ink-500">
          {bp.reviewerProgress.map((rp) => (
            <ReviewerDot
              key={rp.email}
              name={
                rp.email === userEmail
                  ? "jij"
                  : capitalize(rp.email.split("@")[0])
              }
              total={totalCandidates}
              committed={rp.committed}
            />
          ))}
        </span>
      </div>
    </Link>
  );
}

function ReviewerDot({
  name,
  total,
  committed
}: {
  name: string;
  total: number;
  committed: number;
}) {
  const done = total > 0 && committed === total;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          done ? "bg-accent-yes" : "bg-line-strong"
        }`}
      />
      <span className="lowercase">
        {name} {committed}/{total}
      </span>
    </span>
  );
}

function ContributionLine({
  loading,
  contributed,
  openCards
}: {
  loading: boolean;
  contributed: number;
  openCards: number;
}) {
  if (loading) return <span className="text-ink-400">…</span>;

  if (contributed === 0 && openCards === 0)
    return (
      <>
        Niks open en nog geen bijdrage. MegaVondr stuurt nieuwe suggesties zodra
        er gesprekken zijn verwerkt.
      </>
    );

  if (contributed === 0)
    return (
      <>
        Vondr wacht op jouw eerste bijdrage.{" "}
        {openCards > 0 && (
          <>
            <b className="text-vondr-dark-blue">{openCards}</b>{" "}
            {openCards === 1 ? "suggestie" : "suggesties"} klaar — beoordeel,{" "}
            <b className="text-vondr-dark-blue">verzend</b>, en het systeem
            wordt scherper.
          </>
        )}
      </>
    );

  return (
    <>
      Met jouw{" "}
      <b className="text-vondr-dark-blue">
        {contributed} {contributed === 1 ? "beslissing" : "beslissingen"}
      </b>{" "}
      is vondr al rijker geworden — voor altijd vindbaar voor het hele team.
      {openCards > 0 ? (
        <>
          {" "}
          Maak het systeem nu{" "}
          <b className="text-vondr-pop">{openCards}× rijker</b>:{" "}
          {openCards === 1
            ? "er wacht 1 suggestie"
            : `er wachten ${openCards} suggesties`}{" "}
          op jouw oordeel.
        </>
      ) : (
        <> Geen open suggesties — even pauze.</>
      )}
    </>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:text-vondr-dark-blue active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function IconBtnLink({
  href,
  label,
  children
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:text-vondr-dark-blue active:scale-95"
    >
      {children}
    </Link>
  );
}

function DecisionDot({ decision }: { decision: "yes" | "no" | "maybe" }) {
  const cls =
    decision === "yes"
      ? "bg-accent-yes/10 text-accent-yes"
      : decision === "no"
        ? "bg-accent-no/10 text-accent-no"
        : "bg-accent-maybe/10 text-accent-maybe";
  const Icon =
    decision === "yes" ? "✓" : decision === "no" ? "✕" : "↑";
  return (
    <div
      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${cls}`}
    >
      {Icon}
    </div>
  );
}

function decisionLabel(d: "yes" | "no" | "maybe") {
  return d === "yes"
    ? "Toegevoegd aan het geheugen"
    : d === "no"
      ? "Afgewezen"
      : "Naar afstemming";
}

function decisionColor(d: "yes" | "no" | "maybe") {
  return d === "yes"
    ? "text-accent-yes"
    : d === "no"
      ? "text-accent-no"
      : "text-accent-maybe";
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function computeStats(votes: VoteWithCandidate[]): MyStats {
  let contributed = 0;
  const deltas: number[] = [];
  for (const { vote, candidate } of votes) {
    if (vote.decision === "yes") contributed++;
    if (candidate?.createdAt) {
      const delta =
        new Date(vote.votedAt).getTime() -
        new Date(candidate.createdAt).getTime();
      if (Number.isFinite(delta) && delta >= 0) deltas.push(delta);
    }
  }
  const avgResponseMs =
    deltas.length > 0
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : null;
  return {
    contributed,
    totalCommitted: votes.length,
    avgResponseMs
  };
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = min / 60;
  if (hr < 24) return `${hr.toFixed(hr < 10 ? 1 : 0)}u`;
  const day = hr / 24;
  return `${day.toFixed(day < 10 ? 1 : 0)} dagen`;
}

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}`;
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
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}`;
}
