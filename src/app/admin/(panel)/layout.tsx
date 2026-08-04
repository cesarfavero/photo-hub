import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";
import { getSiteName } from "@/lib/site";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.is_admin && !profile.active) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  const siteName = await getSiteName();

  return (
    <AdminShell
      siteName={siteName}
      userEmail={user.email ?? ""}
      isAdmin={profile?.is_admin ?? false}
    >
      {children}
    </AdminShell>
  );
}
