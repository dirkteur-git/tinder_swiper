export type Decision = "yes" | "no" | "maybe";
export type CandidateStatus = "open" | "resolved" | "archived";

export interface Fact {
  label: string;
  value: string;
  /** Visuele variant in detail-views (oud doorgestreept, nieuw vet, highlight als quote). */
  variant?: "old" | "new" | "highlight";
}

export interface Candidate {
  id: string;
  externalId: string;
  source: string;
  type: string;
  suggestion: string;
  proposedAnswer: string | null;
  klantNaam: string | null;
  klantQuote: string | null;
  meetingDatum: string | null;
  reasonLong: string | null;
  bron: string | null;
  facts: Fact[];
  requiresDouble: boolean;
  status: CandidateStatus;
  createdAt: string;
}

export interface Vote {
  id: string;
  candidateId: string;
  externalId: string;
  decision: Decision;
  votedBy: string | null;
  editedSuggestion: string | null;
  editedAnswer: string | null;
  votedAt: string;
}

/** Wat naar de DB gaat bij het casten van een stem. */
export interface VoteInput {
  candidateId: string;
  externalId: string;
  decision: Decision;
  editedSuggestion?: string | null;
  editedAnswer?: string | null;
}
