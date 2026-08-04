import type { Metadata } from "next";
import { DashboardAdmin } from "@/components/admin/dashboard-admin";
import { MyEventsDashboard } from "@/components/admin/my-events";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Painel · Photo Hub",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  if (profile?.is_admin) {
    return <DashboardAdmin />;
  }

  return <MyEventsDashboard />;
}
