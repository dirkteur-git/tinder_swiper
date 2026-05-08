export type Decision = "yes" | "no" | "maybe";
export type CandidateStatus = "open" | "resolved" | "archived";

export interface Fact {
  label: string;
  value: string;
  /** Visuele variant in detail-views (oud doorgestreept, nieuw vet, highlight als quote). */
  variant?: "old" | "new" | "highlight";
}

export interface Batch {
  id: string;
  externalId: string;
  source: string;
  title: string;
  klantNaam: string | null;
  meetingDatum: string | null;
  createdAt: string;
  /** Verwijzing naar de oorspronkelijke batch waarvan deze een afstem-versie is. NULL = origineel. */
  parentBatchId: string | null;
  /** True als dit een afstem-batch is (conflicten uit de vorige ronde). */
  isFollowup: boolean;
  /** Emails die op deze batch mogen swipen. */
  reviewers: string[];
  /** Tijdstip waarop MegaVondr deze batch vergeleken heeft. NULL = nog niet. */
  comparedAt: string | null;
}

/**
 * Voortgang van één reviewer op één batch. `committed` zijn verzonden
 * stemmen (is_draft=false), `drafts` zijn nog-te-verzenden stemmen.
 */
export interface ReviewerProgress {
  email: string;
  decided: number;     // committed + drafts
  committed: number;
  drafts: number;
  isFullySent: boolean; // committed === totalCandidates
}

/**
 * Batch met afgeleide voortgangs-info. `decided`/`drafts`/`committed` op
 * top-level zijn voor de **huidige gebruiker** (backwards-compat).
 * `reviewerProgress` toont alle reviewers — handig voor "wacht op X".
 */
export interface BatchProgress {
  batch: Batch;
  totalCandidates: number;
  decided: number;          // niet-draft + draft tellen beide mee voor 'klaar om te verzenden'
  drafts: number;           // beslist maar nog niet verzonden
  committed: number;        // verzonden
  isComplete: boolean;      // totalCandidates === decided
  isFullySent: boolean;     // alle decisions zijn committed
  reviewerProgress: ReviewerProgress[];
  /** True als JIJ alles hebt verzonden maar minstens één andere reviewer niet. */
  awaitingPeers: boolean;
  /** True als ALLE reviewers volledig hebben verzonden — wacht op compare-stap. */
  awaitingCompare: boolean;
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
  batchId: string | null;
  /** Bij afstem-kandidaten verwijst dit naar de oorspronkelijke candidate uit ronde 1. */
  originCandidateId: string | null;
}

/** Stem van de andere reviewer op een originele candidate, getoond op de afstem-kaart. */
export interface PeerVote {
  /** ID van de candidate in de huidige (afstem-)batch waar deze peer-vote bij hoort. */
  candidateId: string;
  votedBy: string;
  decision: Decision;
  editedSuggestion: string | null;
  editedAnswer: string | null;
}

export interface Vote {
  id: string;
  candidateId: string;
  externalId: string;
  decision: Decision;
  votedBy: string | null;
  editedSuggestion: string | null;
  editedAnswer: string | null;
  isDraft: boolean;
  votedAt: string;
}

export interface VoteInput {
  candidateId: string;
  externalId: string;
  decision: Decision;
  editedSuggestion?: string | null;
  editedAnswer?: string | null;
  /** True voor batched flow (draft tot verzenden); false voor losse kaarten (direct committed). */
  isDraft?: boolean;
}
