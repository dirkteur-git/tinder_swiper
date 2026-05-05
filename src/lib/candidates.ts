"use client";

import type {
  Candidate,
  Decision,
  Fact,
  Vote,
  VoteInput
} from "./types";
import { getSupabase } from "./supabase/browser";

interface CandidateRow {
  id: string;
  external_id: string;
  source: string;
  type: string;
  suggestion: string;
  proposed_answer: string | null;
  klant_naam: string | null;
  klant_quote: string | null;
  meeting_datum: string | null;
  reason_long: string | null;
  bron: string | null;
  facts_json: Fact[] | null;
  requires_double: boolean;
  status: "open" | "resolved" | "archived";
  created_at: string;
}

interface VoteRow {
  id: string;
  candidate_id: string;
  external_id: string;
  decision: Decision;
  voted_by: string | null;
  edited_suggestion: string | null;
  edited_answer: string | null;
  voted_at: string;
}

function rowToCandidate(r: CandidateRow): Candidate {
  return {
    id: r.id,
    externalId: r.external_id,
    source: r.source,
    type: r.type,
    suggestion: r.suggestion,
    proposedAnswer: r.proposed_answer,
    klantNaam: r.klant_naam,
    klantQuote: r.klant_quote,
    meetingDatum: r.meeting_datum,
    reasonLong: r.reason_long,
    bron: r.bron,
    facts: Array.isArray(r.facts_json) ? r.facts_json : [],
    requiresDouble: r.requires_double,
    status: r.status,
    createdAt: r.created_at
  };
}

function rowToVote(r: VoteRow): Vote {
  return {
    id: r.id,
    candidateId: r.candidate_id,
    externalId: r.external_id,
    decision: r.decision,
    votedBy: r.voted_by,
    editedSuggestion: r.edited_suggestion,
    editedAnswer: r.edited_answer,
    votedAt: r.voted_at
  };
}

export async function fetchOpenCandidates(): Promise<Candidate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_candidates")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToCandidate(r as CandidateRow));
}

export async function fetchMyVotes(email: string): Promise<Vote[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_votes")
    .select("*")
    .eq("voted_by", email)
    .order("voted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToVote(r as VoteRow));
}

export async function castVote(
  input: VoteInput,
  votedBy: string
): Promise<Vote> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_votes")
    .insert({
      candidate_id: input.candidateId,
      external_id: input.externalId,
      decision: input.decision,
      voted_by: votedBy,
      edited_suggestion: input.editedSuggestion ?? null,
      edited_answer: input.editedAnswer ?? null
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToVote(data as VoteRow);
}

export async function deleteVote(voteId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("swipe_votes")
    .delete()
    .eq("id", voteId);
  if (error) throw error;
}
