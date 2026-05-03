"use client";

import Link from "next/link";
import { ChevronRight, Clock, Users } from "lucide-react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job;
  remaining: number;
  total: number;
}

export function JobTile({ job, remaining, total }: Props) {
  const done = total - remaining;
  const progress = total === 0 ? 0 : (done / total) * 100;
  const isComplete = remaining === 0;

  return (
    <Link
      href={`/j/${job.id}`}
      className="group block rounded-2xl bg-navy-800 p-4 transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SourceBadge source={job.source} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-steel-400">
              {modeLabel(job.approvalMode)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-snug text-steel-100">
            {job.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-steel-300">
            {job.description}
          </p>
        </div>
        <ChevronRight
          size={20}
          className="mt-1 flex-shrink-0 text-steel-400 transition group-active:translate-x-0.5"
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-steel-300">
        <span className="font-medium">
          {isComplete ? "klaar" : `${remaining} over`}
        </span>
        <span className="text-steel-400">·</span>
        <span>{total} totaal</span>
        {job.deadline && (
          <>
            <span className="text-steel-400">·</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDeadline(job.deadline)}
            </span>
          </>
        )}
        {job.assignees.length > 1 && (
          <>
            <span className="text-steel-400">·</span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {job.assignees.length}
            </span>
          </>
        )}
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-navy-900">
        <div
          className={`h-full transition-all ${
            isComplete ? "bg-accent-yes" : "bg-steel-200"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    nextbim: { label: "NextBIM", cls: "bg-blue-500/15 text-blue-300" },
    "meeting-coach": {
      label: "Meeting Coach",
      cls: "bg-purple-500/15 text-purple-300"
    },
    "brein-curator": {
      label: "Brein",
      cls: "bg-amber-500/15 text-amber-300"
    },
    other: { label: "Overig", cls: "bg-navy-700 text-steel-300" }
  };
  const m = map[source] ?? map.other;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function modeLabel(mode: string) {
  if (mode === "single") return "1 stem";
  if (mode === "double") return "2 stemmen";
  if (mode === "founders_unanimous") return "Founders unaniem";
  return mode;
}

function formatDeadline(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 0) return "verstreken";
  if (diffH < 24) return `nog ${diffH}u`;
  const diffD = Math.round(diffH / 24);
  return `nog ${diffD}d`;
}
