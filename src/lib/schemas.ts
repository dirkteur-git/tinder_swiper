import { z } from "zod";

export const QuestionInbound = z.object({
  id: z.string().optional(),
  suggestion: z.string().min(1),
  reason: z.string().min(1),
  reason_long: z.string().optional(),
  image_url: z.string().url().optional(),
  deeplink: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const JobInbound = z.object({
  source: z.enum(["nextbim", "meeting-coach", "brein-curator", "other"]),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  approval_mode: z.enum(["single", "double", "founders_unanimous"]).default("single"),
  assignees: z.array(z.string().email()).min(1),
  deadline: z.string().datetime().optional(),
  questions: z.array(QuestionInbound).min(1)
});

export type JobInboundT = z.infer<typeof JobInbound>;

export const VoteCast = z.object({
  jobId: z.string(),
  questionId: z.string(),
  decision: z.enum(["yes", "no", "maybe"])
});
