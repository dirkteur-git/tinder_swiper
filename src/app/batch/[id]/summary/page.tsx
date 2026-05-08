import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BatchSummaryClient } from "@/components/BatchSummaryClient";

export const dynamic = "force-dynamic";

export default async function BatchSummaryPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: batch, error } = await supabase
    .from("swipe_batches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw error;
  if (!batch) notFound();

  return (
    <BatchSummaryClient
      batchId={params.id}
      batchTitle={batch.title}
      klantNaam={batch.klant_naam}
      meetingDatum={batch.meeting_datum}
      isFollowup={Boolean(batch.is_followup)}
      userEmail={user.email}
    />
  );
}
