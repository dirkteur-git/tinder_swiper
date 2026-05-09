/**
 * POST /api/v1/candidates
 *
 * Inbound endpoint voor externe schrijvers (MegaVondr, klant-tooling, ...)
 * om suggesties (en optioneel een batch) toe te voegen aan de Vondr Swiper.
 *
 * Auth: Authorization: Bearer <token> waar token tegen swipe_ingest_tokens
 *   gehasht (sha256) wordt vergeleken. Token bepaalt source-veld op de rows.
 *
 * Body: zie src/lib/ingest-schema.ts (IngestRequestSchema).
 *
 * Volledige spec: docs/api.md.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, verifyIngestToken } from "@/lib/ingest-auth";
import { IngestRequestSchema } from "@/lib/ingest-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await verifyIngestToken(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  // 2. Body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = IngestRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message
        }))
      },
      { status: 400 }
    );
  }

  const { batch, candidates } = parsed.data;
  const supabase = getServiceClient();

  // 3. Upsert batch (optioneel)
  let batchId: string | null = null;
  if (batch) {
    const { data, error } = await supabase
      .from("swipe_batches")
      .upsert(
        {
          external_id: batch.external_id,
          source: auth.source,
          title: batch.title,
          klant_naam: batch.klant_naam ?? null,
          meeting_datum: batch.meeting_datum ?? null
        },
        { onConflict: "external_id" }
      )
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { error: "batch_failed", detail: error.message },
        { status: 500 }
      );
    }
    batchId = data?.id ?? null;
  }

  // 4. Upsert candidates
  const rows = candidates.map((c) => ({
    external_id: c.external_id,
    source: auth.source,
    type: c.type,
    suggestion: c.suggestion,
    proposed_answer: c.proposed_answer ?? null,
    klant_naam: c.klant_naam ?? null,
    klant_quote: c.klant_quote ?? null,
    meeting_datum: c.meeting_datum ?? null,
    reason_long: c.reason_long ?? null,
    bron: c.bron ?? null,
    facts_json: c.facts ?? [],
    requires_double: c.requires_double ?? false,
    status: "open" as const,
    batch_id: batchId,
    payload: c.payload ?? {},
    media: c.media ?? []
  }));

  const { data, error } = await supabase
    .from("swipe_candidates")
    .upsert(rows, { onConflict: "external_id" })
    .select("id, external_id");
  if (error) {
    return NextResponse.json(
      { error: "candidates_failed", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    source: auth.source,
    batch: batchId ? { id: batchId, external_id: batch?.external_id } : null,
    candidates: (data ?? []).map((d) => ({
      id: d.id,
      external_id: d.external_id
    }))
  });
}

export async function GET() {
  return NextResponse.json(
    {
      error: "method_not_allowed",
      hint: "Gebruik POST. Spec: /docs/api.md (zie repo)."
    },
    { status: 405 }
  );
}
