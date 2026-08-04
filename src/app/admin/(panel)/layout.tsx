import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="bg-glow flex-1">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
