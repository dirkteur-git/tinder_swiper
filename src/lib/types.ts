export type ApprovalMode = "single" | "double" | "founders_unanimous";
export type Decision = "yes" | "no" | "maybe";
export type Outcome = "matched_yes" | "rejected" | "conflict" | "pending";
export type SourceSystem = "nextbim" | "meeting-coach" | "brein-curator" | "other";

export interface Question {
  id: string;
  jobId: string;
  externalId?: string;
  suggestion: string;
  reason: string;
  reasonLong?: string;
  imageUrl?: string;
  deeplink?: string;
  bron?: string;
  metadata?: Record<string, unknown>;
  position: number;
  isCalibration?: boolean;
}

export interface Job {
  id: string;
  source: SourceSystem;
  title: string;
  description: string;
  approvalMode: ApprovalMode;
  deadline?: string;
  assignees: string[];
  createdAt: string;
  questions: Question[];
}

export interface Vote {
  questionId: string;
  jobId: string;
  userId: string;
  decision: Decision;
  votedAt: string;
}

export interface OutcomeRecord {
  questionId: string;
  outcome: Outcome;
  resolvedAt: string;
}
