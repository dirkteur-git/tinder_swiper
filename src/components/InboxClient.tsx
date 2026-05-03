"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Job, Vote } from "@/lib/types";
import { CURRENT_USER } from "@/lib/mock-data";
import { getAllVotes, resetAll } from "@/lib/store";
import { JobTile } from "./JobTile";
import { BrandWordmark } from "./BrandWordmark";
import { MessagesSquare, RotateCcw, Inbox as InboxIcon } from "lucide-react";

interface Props {
  jobs: Job[];
}

type Tab = "inbox" | "bespreken";

export function InboxClient({ jobs }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [tab, setTab] = useState<Tab>("inbox");

  useEffect(() => {
    setVotes(getAllVotes());
    setHydrated(true);
  }, []);

  const totalRemaining = jobs.reduce((acc, j) => {
    const decided = new Set(
      votes
        .filter((v) => v.jobId === j.id && v.userId === CURRENT_USER.id)
        .map((v) => v.questionId)
    );
    return acc + j.questions.filter((q) => !decided.has(q.id)).length;
  }, 0);

  function handleReset() {
    if (confirm("Alle stemmen wissen? (alleen voor demo)")) {
      resetAll();
      setVotes([]);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-navy-950">
      <header className="safe-top sticky top-0 z-20 border-b border-navy-800 bg-navy-950/90 px-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <BrandWordmark className="text-2xl" />
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-full bg-navy-800 px-3 py-1.5 text-[11px] text-steel-300 active:scale-95"
            title="Reset (demo)"
          >
            <RotateCcw size={12} />
            reset
          </button>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <h1 className="text-lg font-medium text-steel-100">
            Hoi {CURRENT_USER.name}
          </h1>
          {hydrated && (
            <span className="text-sm text-steel-400">
              {totalRemaining > 0
                ? `${totalRemaining} kaart${totalRemaining === 1 ? "" : "en"} wachten`
                : "alles afgehandeld"}
            </span>
          )}
        </div>

        <nav className="mt-4 flex gap-1 rounded-full bg-navy-800 p-1">
          <TabButton
            active={tab === "inbox"}
            onClick={() => setTab("inbox")}
            icon={<InboxIcon size={14} />}
            label="Inbox"
            count={jobs.length}
          />
          <TabButton
            active={tab === "bespreken"}
            onClick={() => setTab("bespreken")}
            icon={<MessagesSquare size={14} />}
            label="Bespreken"
            count={0}
          />
        </nav>
      </header>

      <main className="px-4 py-4">
        <AnimatePresence mode="wait">
          {tab === "inbox" ? (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              {!hydrated ? (
                <div className="space-y-3">
                  <div className="h-32 animate-pulse rounded-2xl bg-navy-800/50" />
                  <div className="h-32 animate-pulse rounded-2xl bg-navy-800/50" />
                </div>
              ) : (
                jobs
                  .map((job) => {
                    const decided = new Set(
                      votes
                        .filter(
                          (v) => v.jobId === job.id && v.userId === CURRENT_USER.id
                        )
                        .map((v) => v.questionId)
                    );
                    const remaining = job.questions.filter(
                      (q) => !decided.has(q.id)
                    ).length;
                    return { job, remaining };
                  })
                  .sort((a, b) => {
                    const da = a.job.deadline
                      ? new Date(a.job.deadline).getTime()
                      : Infinity;
                    const db = b.job.deadline
                      ? new Date(b.job.deadline).getTime()
                      : Infinity;
                    if (da !== db) return da - db;
                    return b.remaining - a.remaining;
                  })
                  .map(({ job, remaining }) => (
                    <JobTile
                      key={job.id}
                      job={job}
                      remaining={remaining}
                      total={job.questions.length}
                    />
                  ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="bespreken"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-dashed border-navy-700 bg-navy-900 p-6 text-center"
            >
              <MessagesSquare
                size={32}
                className="mx-auto mb-3 text-steel-400"
              />
              <h3 className="text-base font-medium text-steel-100">
                Nog geen besprekingen
              </h3>
              <p className="mt-1 text-sm text-steel-300">
                Hier komen kaarten te staan waar jij en een teamlid het
                oneens over zijn.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-[11px] text-steel-400">
          Vondr · jij instrueert, AI voert uit, jij beslist
        </p>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-steel-100 text-navy-900"
          : "text-steel-300 active:bg-navy-700"
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-[10px] ${
            active ? "bg-navy-900/15 text-navy-900" : "bg-navy-700 text-steel-300"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
