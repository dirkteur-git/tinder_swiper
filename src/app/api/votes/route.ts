import { NextRequest, NextResponse } from "next/server";
import { VoteCast } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = VoteCast.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    note: "PoC: stem geregistreerd op de client. Voor productie wordt deze in Supabase opgeslagen + outbound webhook getriggerd."
  });
}
