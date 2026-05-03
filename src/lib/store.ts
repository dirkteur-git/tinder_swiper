"use client";

import type { Decision, Vote } from "./types";
import { CURRENT_USER } from "./mock-data";

const STORAGE_KEY = "vondr-swiper-state-v1";

interface StoredState {
  votes: Vote[];
}

function readState(): StoredState {
  if (typeof window === "undefined") return { votes: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { votes: [] };
    return JSON.parse(raw) as StoredState;
  } catch {
    return { votes: [] };
  }
}

function writeState(state: StoredState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function castVote(
  jobId: string,
  questionId: string,
  decision: Decision
): Vote {
  const state = readState();
  const filtered = state.votes.filter(
    (v) => !(v.questionId === questionId && v.userId === CURRENT_USER.id)
  );
  const vote: Vote = {
    jobId,
    questionId,
    userId: CURRENT_USER.id,
    decision,
    votedAt: new Date().toISOString()
  };
  writeState({ votes: [...filtered, vote] });
  return vote;
}

export function undoVote(questionId: string): void {
  const state = readState();
  writeState({
    votes: state.votes.filter(
      (v) => !(v.questionId === questionId && v.userId === CURRENT_USER.id)
    )
  });
}

export function getVotesForJob(jobId: string): Vote[] {
  return readState().votes.filter((v) => v.jobId === jobId);
}

export function getVoteForQuestion(questionId: string): Vote | undefined {
  return readState().votes.find(
    (v) => v.questionId === questionId && v.userId === CURRENT_USER.id
  );
}

export function getAllVotes(): Vote[] {
  return readState().votes;
}

/** Reset all votes — useful during demo */
export function resetAll(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
