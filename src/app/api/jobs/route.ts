import { NextRequest, NextResponse } from "next/server";
import { getAllJobs } from "@/lib/mock-data";
import { JobInbound } from "@/lib/schemas";

export async function GET() {
  return NextResponse.json({ jobs: getAllJobs() });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing api key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = JobInbound.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const jobId = `job-${Math.random().toString(36).slice(2, 10)}`;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return NextResponse.json(
    {
      job_id: jobId,
      url: `${appUrl}/j/${jobId}`,
      note: "PoC: ingestie wordt nog niet persistent opgeslagen. Voeg Supabase toe voor productie."
    },
    { status: 201 }
  );
}
