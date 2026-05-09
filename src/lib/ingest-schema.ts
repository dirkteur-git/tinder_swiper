import { z } from "zod";

/**
 * Canonieke type-set voor swipe_candidates.type.
 * Tekst-types (geen media): Nieuwe FAQ, Antwoord-update, Doctrine,
 *   Klant-fact, Project-fact, Risico, Beslissing.
 * Visuele types (media verplicht): Brand-asset, Visual-mockup.
 * Hybride: Brand-regel (token-vergelijking, soms met media), Copy-keuze
 *   (A/B-tekstkeuze).
 */
export const KANDIDAAT_TYPES = [
  "Nieuwe FAQ",
  "Antwoord-update",
  "Doctrine",
  "Klant-fact",
  "Project-fact",
  "Risico",
  "Beslissing",
  "Brand-asset",
  "Brand-regel",
  "Copy-keuze",
  "Visual-mockup"
] as const;
export type KandidaatType = (typeof KANDIDAAT_TYPES)[number];

export const VISUAL_TYPES: readonly KandidaatType[] = [
  "Brand-asset",
  "Visual-mockup"
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MediaSchema = z.object({
  kind: z.enum(["image", "pdf", "video", "url"]),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
  label: z.string().max(40).optional()
});

const FactSchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(280),
  variant: z.enum(["old", "new", "highlight"]).optional()
});

const BatchSchema = z.object({
  external_id: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  klant_naam: z.string().max(200).optional(),
  meeting_datum: z.string().regex(ISO_DATE).optional()
});

const BaseCandidate = z.object({
  external_id: z.string().min(1).max(200),
  type: z.enum(KANDIDAAT_TYPES),
  suggestion: z.string().min(1).max(280),
  proposed_answer: z.string().max(4000).nullable().optional(),
  klant_naam: z.string().max(200).nullable().optional(),
  klant_quote: z.string().max(2000).nullable().optional(),
  meeting_datum: z.string().regex(ISO_DATE).nullable().optional(),
  reason_long: z.string().max(2000).nullable().optional(),
  bron: z.string().max(500).nullable().optional(),
  facts: z.array(FactSchema).max(20).optional(),
  requires_double: z.boolean().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  media: z.array(MediaSchema).max(10).optional()
});

const CandidateSchema = BaseCandidate.superRefine((c, ctx) => {
  // Tekst-types: proposed_answer verplicht
  if (
    (c.type === "Nieuwe FAQ" || c.type === "Antwoord-update") &&
    !c.proposed_answer
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["proposed_answer"],
      message: `${c.type} vereist proposed_answer.`
    });
  }
  // Reason verplicht bij doctrine/risico/beslissing
  if (
    (c.type === "Doctrine" ||
      c.type === "Risico" ||
      c.type === "Beslissing") &&
    !c.reason_long
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason_long"],
      message: `${c.type} vereist reason_long (uitleg waarom).`
    });
  }
  // Media verplicht voor visuele types
  if (VISUAL_TYPES.includes(c.type) && (!c.media || c.media.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["media"],
      message: `${c.type} vereist minimaal 1 media-item (image/pdf/video/url).`
    });
  }
  // Copy-keuze: payload moet optie_a + optie_b hebben
  if (c.type === "Copy-keuze") {
    const p = c.payload ?? {};
    if (typeof p.optie_a !== "string" || typeof p.optie_b !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload"],
        message: `Copy-keuze vereist payload.optie_a en payload.optie_b (beide string).`
      });
    }
  }
});

export const IngestRequestSchema = z.object({
  batch: BatchSchema.optional(),
  candidates: z.array(CandidateSchema).min(1).max(100)
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;
