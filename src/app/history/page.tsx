import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { HistoryClient } from "@/components/HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");
  return <HistoryClient userEmail={user.email} />;
}
