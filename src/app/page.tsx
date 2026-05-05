import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { CardStack } from "@/components/CardStack";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  return <CardStack userEmail={user.email} />;
}
