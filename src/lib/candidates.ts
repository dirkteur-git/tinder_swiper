"use client";

import type {
  Batch,
  BatchProgress,
  Candidate,
  Decision,
  Fact,
  MediaItem,
  PeerVote,
  ReviewerProgress,
  Vote,
  VoteInput
} from "./types";
import { getSupabase } from "./supabase/browser";

interface BatchRow {
  id: string;
  external_id: string;
  source: string;
  title: string;
  klant_naam: string | null;
  meeting_datum: string | null;
  created_at: string;
  parent_batch_id: string | null;
  is_followup: boolean;
  reviewers: string[];
  compared_at: string | null;
}

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
  batch_id: string | null;
  origin_candidate_id: string | null;
  payload: Record<string, unknown> | null;
  media: MediaItem[] | null;
}

interface VoteRow {
  id: string;
  candidate_id: string;
  external_id: string;
  decision: Decision;
  voted_by: string | null;
  edited_suggestion: string | null;
  edited_answer: string | null;
  is_draft: boolean;
  voted_at: string;
}

function rowToBatch(r: BatchRow): Batch {
  return {
    id: r.id,
    externalId: r.external_id,
    source: r.source,
    title: r.title,
    klantNaam: r.klant_naam,
    meetingDatum: r.meeting_datum,
    createdAt: r.created_at,
    parentBatchId: r.parent_batch_id ?? null,
    isFollowup: Boolean(r.is_followup),
    reviewers: Array.isArray(r.reviewers) ? r.reviewers : [],
    comparedAt: r.compared_at ?? null
  };
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
    createdAt: r.created_at,
    batchId: r.batch_id,
    originCandidateId: r.origin_candidate_id ?? null,
    payload:
      r.payload && typeof r.payload === "object" ? r.payload : {},
    media: Array.isArray(r.media) ? r.media : []
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
    isDraft: r.is_draft,
    votedAt: r.voted_at
  };
}

/* ─────── Candidates ─────── */

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

export async function fetchOpenCandidatesByBatch(
  batchId: string
): Promise<Candidate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_candidates")
    .select("*")
    .eq("status", "open")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToCandidate(r as CandidateRow));
}

export async function fetchOpenLooseCandidates(): Promise<Candidate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_candidates")
    .select("*")
    .eq("status", "open")
    .is("batch_id", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToCandidate(r as CandidateRow));
}

/* ─────── Batches ─────── */

export async function fetchBatches(): Promise<Batch[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_batches")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToBatch(r as BatchRow));
}

export async function fetchBatchById(id: string): Promise<Batch | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_batches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBatch(data as BatchRow) : null;
}

/* ─────── Votes ─────── */

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

export interface VoteWithCandidate {
  vote: Vote;
  candidate: Candidate | null;
  batch: { id: string; title: string; klantNaam: string | null } | null;
}

interface BatchSlimRow {
  id: string;
  title: string;
  klant_naam: string | null;
}

export async function fetchMyVotesWithCandidates(
  email: string
): Promise<VoteWithCandidate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_votes")
    .select(
      "*, swipe_candidates ( *, swipe_batches ( id, title, klant_naam ) )"
    )
    .eq("voted_by", email)
    .order("voted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as VoteRow & {
      swipe_candidates:
        | (CandidateRow & { swipe_batches: BatchSlimRow | null })
        | null;
    };
    const cand = r.swipe_candidates;
    return {
      vote: rowToVote(r),
      candidate: cand ? rowToCandidate(cand) : null,
      batch: cand?.swipe_batches
        ? {
            id: cand.swipe_batches.id,
            title: cand.swipe_batches.title,
            klantNaam: cand.swipe_batches.klant_naam
          }
        : null
    };
  });
}

/**
 * Voor een afstem-batch: haal per candidate de laatste committed vote op
 * van een **andere reviewer** uit de origineel-candidate (ronde 1).
 *
 * Werkt door eerst de candidates op te halen (origin_candidate_id), dan
 * voor elk origin de votes ervan te trekken en alleen die van anderen
 * dan `currentUserEmail` te houden — meest recent eerst.
 */
export async function fetchPeerVotesForBatch(
  batchId: string,
  currentUserEmail: string
): Promise<PeerVote[]> {
  const supabase = getSupabase();
  const { data: cands, error: cErr } = await supabase
    .from("swipe_candidates")
    .select("id, origin_candidate_id")
    .eq("batch_id", batchId);
  if (cErr) throw cErr;

  const candByOrigin = new Map<string, string>(); // origin_candidate_id → candidateId in deze batch
  const originIds: string[] = [];
  for (const c of cands ?? []) {
    const row = c as { id: string; origin_candidate_id: string | null };
    if (!row.origin_candidate_id) continue;
    candByOrigin.set(row.origin_candidate_id, row.id);
    originIds.push(row.origin_candidate_id);
  }
  if (originIds.length === 0) return [];

  const { data: votes, error: vErr } = await supabase
    .from("swipe_votes")
    .select("*")
    .in("candidate_id", originIds)
    .eq("is_draft", false)
    .order("voted_at", { ascending: false });
  if (vErr) throw vErr;

  // Eerste-vote-per-(origin+user) wint omdat we descending sorteren.
  const seen = new Set<string>();
  const out: PeerVote[] = [];
  for (const row of votes ?? []) {
    const v = row as VoteRow;
    if (v.voted_by === currentUserEmail) continue;
    const key = `${v.candidate_id}::${v.voted_by}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const candidateId = candByOrigin.get(v.candidate_id);
    if (!candidateId) continue;
    out.push({
      candidateId,
      votedBy: v.voted_by ?? "",
      decision: v.decision,
      editedSuggestion: v.edited_suggestion,
      editedAnswer: v.edited_answer
    });
  }
  return out;
}

/** Wat je hebt gestemd op kandidaten in deze batch (zowel draft als committed). */
export async function fetchMyVotesForBatch(
  batchId: string,
  email: string
): Promise<Vote[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("swipe_votes")
    .select("*, swipe_candidates!inner ( id, batch_id )")
    .eq("voted_by", email)
    .eq("swipe_candidates.batch_id", batchId)
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
      edited_answer: input.editedAnswer ?? null,
      is_draft: input.isDraft ?? false
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

/**
 * Verzend alle draft-votes van deze user voor deze batch — flip is_draft
 * naar false. MegaVondr ziet ze nu en gaat verwerken.
 */
export async function commitDraftsForBatch(
  batchId: string,
  email: string
): Promise<number> {
  const drafts = await fetchMyVotesForBatch(batchId, email);
  const draftIds = drafts.filter((v) => v.isDraft).map((v) => v.id);
  if (draftIds.length === 0) return 0;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("swipe_votes")
    .update({ is_draft: false })
    .in("id", draftIds);
  if (error) throw error;
  return draftIds.length;
}

/* ─────── Aggregaten voor home-dashboard ─────── */

export async function fetchBatchProgress(
  email: string
): Promise<BatchProgress[]> {
  const supabase = getSupabase();

  const [
    { data: batchData, error: batchErr },
    { data: candData, error: candErr },
    { data: voteData, error: voteErr }
  ] = await Promise.all([
    supabase
      .from("swipe_batches")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("swipe_candidates").select("id, batch_id, status"),
    // Alle votes (van iedereen) zodat we per-reviewer voortgang kunnen
    // tonen. RLS geeft authenticated users leesrecht op alle votes.
    supabase
      .from("swipe_votes")
      .select("candidate_id, voted_by, decision, is_draft, voted_at")
  ]);
  if (batchErr) throw batchErr;
  if (candErr) throw candErr;
  if (voteErr) throw voteErr;

  const batches = (batchData ?? []).map((r) => rowToBatch(r as BatchRow));
  const cands =
    (candData as Array<{ id: string; batch_id: string | null; status: string }>) ??
    [];
  const allVotes =
    (voteData as Array<{
      candidate_id: string;
      voted_by: string | null;
      decision: Decision;
      is_draft: boolean;
      voted_at: string;
    }>) ?? [];

  const candByBatch = new Map<string, string[]>();
  for (const c of cands) {
    if (!c.batch_id) continue;
    const arr = candByBatch.get(c.batch_id) ?? [];
    arr.push(c.id);
    candByBatch.set(c.batch_id, arr);
  }

  // Laatste vote per (candidate, reviewer)
  const latestByCandReviewer = new Map<string, (typeof allVotes)[number]>();
  for (const v of allVotes) {
    if (!v.voted_by) continue;
    const key = `${v.candidate_id}::${v.voted_by}`;
    const existing = latestByCandReviewer.get(key);
    if (!existing || v.voted_at > existing.voted_at) {
      latestByCandReviewer.set(key, v);
    }
  }

  return batches.map((b) => {
    const ids = candByBatch.get(b.id) ?? [];
    const reviewers = b.reviewers.length > 0 ? b.reviewers : [email];

    // Per reviewer: tel committed/drafts/decided
    const reviewerProgress: ReviewerProgress[] = reviewers.map((r) => {
      let decided = 0;
      let drafts = 0;
      let committed = 0;
      for (const cid of ids) {
        const v = latestByCandReviewer.get(`${cid}::${r}`);
        if (!v) continue;
        decided++;
        if (v.is_draft) drafts++;
        else committed++;
      }
      return {
        email: r,
        decided,
        drafts,
        committed,
        isFullySent: ids.length > 0 && committed === ids.length
      };
    });

    // Eigen voortgang (top-level) — backwards-compat
    const my = reviewerProgress.find((rp) => rp.email === email);
    const decided = my?.decided ?? 0;
    const drafts = my?.drafts ?? 0;
    const committed = my?.committed ?? 0;

    const meSent = my?.isFullySent ?? false;
    const allSent = reviewerProgress.every((rp) => rp.isFullySent);
    const someoneElseNotSent = reviewerProgress.some(
      (rp) => rp.email !== email && !rp.isFullySent
    );

    return {
      batch: b,
      totalCandidates: ids.length,
      decided,
      drafts,
      committed,
      isComplete: ids.length > 0 && decided === ids.length,
      isFullySent: ids.length > 0 && committed === ids.length,
      reviewerProgress,
      awaitingPeers:
        ids.length > 0 && meSent && someoneElseNotSent && b.comparedAt === null,
      awaitingCompare: ids.length > 0 && allSent && b.comparedAt === null
    };
  });
}
