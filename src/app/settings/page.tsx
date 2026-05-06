import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  return (
    <SettingsClient
      userEmail={user.email}
      userId={user.id}
      lastSignIn={user.last_sign_in_at ?? null}
    />
  );
}
