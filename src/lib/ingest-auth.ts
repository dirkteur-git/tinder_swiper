import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type IngestAuth =
  | { ok: true; source: string; tokenId: string }
  | { ok: false; reason: IngestAuthFailure; status: number };

export type IngestAuthFailure =
  | "missing_bearer"
  | "empty_token"
  | "invalid_token"
  | "insufficient_scope"
  | "db_error";

function hashToken(plain: string): string {
  return createHash("sha256").update(plain.trim()).digest("hex");
}

let _serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY moeten gezet zijn voor /api/v1-routes."
    );
  }
  _serviceClient = createClient(url, key, {
    auth: { persistSession: false }
  });
  return _serviceClient;
}

/**
 * Verifieer een Bearer-token uit de Authorization-header tegen
 * `swipe_ingest_tokens`. Return source-naam zodat de schrijver kan worden
 * gekoppeld aan de batch/candidate-rows.
 */
export async function verifyIngestToken(
  authHeader: string | null,
  requiredScope: string = "candidates:write"
): Promise<IngestAuth> {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, reason: "missing_bearer", status: 401 };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, reason: "empty_token", status: 401 };

  const hash = hashToken(token);
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("swipe_ingest_tokens")
    .select("id, source, scopes")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) return { ok: false, reason: "db_error", status: 500 };
  if (!data) return { ok: false, reason: "invalid_token", status: 403 };

  const scopes = (data.scopes as string[] | null) ?? [];
  if (!scopes.includes(requiredScope)) {
    return { ok: false, reason: "insufficient_scope", status: 403 };
  }

  // Fire-and-forget last_used_at update
  void supabase
    .from("swipe_ingest_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { ok: true, source: data.source as string, tokenId: data.id as string };
}
