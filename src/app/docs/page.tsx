import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";

export default function DocsPage() {
  return (
    <div className="min-h-[100dvh] bg-bg px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
        >
          <ChevronLeft size={16} /> Terug
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <BrandWordmark className="text-2xl" />
          <span className="text-sm text-ink-500">/ API-docs</span>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-ink-900">
          Inbound API
        </h1>
        <p className="mt-2 text-sm text-ink-700">
          Bron-systemen sturen Jobs hierheen. Eén Job bevat één of meer
          Questions; elke Question wordt één swipe-card.
        </p>

        <Section title="POST /api/jobs">
          <p className="text-sm text-ink-700">
            Authenticatie:{" "}
            <code className="rounded bg-surface px-1 ring-1 ring-line">
              Authorization: Bearer &lt;api-key&gt;
            </code>
          </p>
          <Code>{`POST /api/jobs
Authorization: Bearer vondr_sk_xxxx
Content-Type: application/json

{
  "source": "nextbim",
  "title": "Datakwaliteit — Project Westflank",
  "description": "...",
  "approval_mode": "single",
  "assignees": ["dirk@vondr.ai"],
  "deadline": "2026-05-10T17:00:00Z",
  "questions": [
    {
      "id": "q-001",
      "suggestion": "Object 'WND-3F-021' hernoemen naar 'WND-03-021'",
      "reason": "Naamgeving op deze verdieping volgt patroon WND-{verdieping}-{nummer}.",
      "image_url": "https://...",
      "deeplink": "https://nextbim.../object/WND-3F-021"
    }
  ]
}`}</Code>
          <p className="mt-3 text-sm text-ink-700">Response 201:</p>
          <Code>{`{
  "job_id": "job-xyz",
  "url": "https://app.example/j/job-xyz"
}`}</Code>
        </Section>

        <Section title="Outbound webhook">
          <p className="text-sm text-ink-700">
            Vondr POST'et bij elke beslissing naar de webhook-URL die je per
            bron-systeem hebt geregistreerd. Header{" "}
            <code className="rounded bg-surface px-1 ring-1 ring-line">
              X-Vondr-Signature
            </code>{" "}
            bevat een HMAC-SHA256 over de raw body.
          </p>
          <Code>{`POST <jouw-webhook-url>
X-Vondr-Signature: sha256=ab12...
Content-Type: application/json

{
  "delivery_id": "wd-xyz",
  "job_id": "job-xyz",
  "question_id": "q-001",
  "decision": "yes",
  "voter": "dirk@vondr.ai",
  "voted_at": "2026-05-03T14:22:00Z",
  "is_final": true,
  "match": true,
  "all_votes": [
    { "voter": "dirk@vondr.ai", "decision": "yes", "voted_at": "..." }
  ]
}`}</Code>
          <p className="mt-3 text-sm text-ink-700">Verificatie in Node:</p>
          <Code>{`import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, secret, signatureHeader) {
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}`}</Code>
        </Section>

        <Section title="Approval modes">
          <ul className="space-y-2 text-sm text-ink-700">
            <li>
              <b>single</b> — één swipe is genoeg. Voor werkkennis (FAQ, kleine
              datakwaliteit-correcties).
            </li>
            <li>
              <b>double</b> — twee teamleden swipen onafhankelijk. Beiden ja →
              match. Mixed → conflict, gaat naar Bespreken.
            </li>
            <li>
              <b>founders_unanimous</b> — alle founders moeten ja stemmen. Voor
              constitutie-wijzigingen.
            </li>
          </ul>
        </Section>

        <Section title="Curl voorbeeld">
          <Code>{`curl -X POST http://localhost:3000/api/jobs \\
  -H "Authorization: Bearer test" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "nextbim",
    "title": "Test job",
    "description": "Een testje",
    "approval_mode": "single",
    "assignees": ["dirk@vondr.ai"],
    "questions": [
      {
        "suggestion": "Doe iets",
        "reason": "Waarom we dit voorstellen"
      }
    ]
  }'`}</Code>
        </Section>

        <p className="mt-8 text-center text-[11px] text-ink-400">
          Dit is een PoC. Authenticatie, persistentie en webhooks worden in
          productie via Supabase + Vercel Cron afgehandeld.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-700">
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 text-[12px] leading-relaxed text-white/90">
      <code>{children}</code>
    </pre>
  );
}
