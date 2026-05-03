"use client";

import Link from "next/link";
import { ChevronRight, Clock, Users } from "lucide-react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job;
  remaining: number;
  total: number;
}

function splitTitle(title: string): { topic: string; subject: string } {
  const parts = title.split(/[—\-–]\s*/, 2);
  if (parts.length === 2) {
    return { topic: parts[0].trim(), subject: parts[1].trim() };
  }
  return { topic: "Beslissing", subject: title.trim() };
}

export function JobTile({ job, remaining, total }: Props) {
  const done = total - remaining;
  const progress = total === 0 ? 0 : (done / total) * 100;
  const isComplete = remaining === 0;
  const { topic, subject } = splitTitle(job.title);

  return (
    <Link
      href={`/j/${job.id}`}
      className="group block rounded-2xl bg-surface p-4 ring-1 ring-line shadow-tile transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SourceBadge source={job.source} />
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
              {modeLabel(job.approvalMode)}
            </span>
          </div>
          <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-400">
            {topic}
          </div>
          <h3 className="text-base font-semibold leading-snug text-ink-900">
            {subject}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-ink-500">
            {job.description}
          </p>
        </div>
        <ChevronRight
          size={20}
          className="mt-1 flex-shrink-0 text-ink-400 transition group-active:translate-x-0.5"
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-500">
        <span className="font-semibold text-ink-900">
          {isComplete ? "klaar" : `${remaining} over`}
        </span>
        <span className="text-ink-300">·</span>
        <span>{total} totaal</span>
        {job.deadline && (
          <>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDeadline(job.deadline)}
            </span>
          </>
        )}
        {job.assignees.length > 1 && (
          <>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {job.assignees.length}
            </span>
          </>
        )}
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full transition-all ${
            isComplete ? "bg-accent-yes" : "bg-ink-900"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    nextbim: {
      label: "NextBIM",
      cls: "bg-blue-50 text-blue-700 ring-blue-100"
    },
    "meeting-coach": {
      label: "Meeting Coach",
      cls: "bg-purple-50 text-purple-700 ring-purple-100"
    },
    "brein-curator": {
      label: "Brein",
      cls: "bg-amber-50 text-amber-700 ring-amber-100"
    },
    other: { label: "Overig", cls: "bg-bg text-ink-700 ring-line" }
  };
  const m = map[source] ?? map.other;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${m.cls}`}
    >
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
