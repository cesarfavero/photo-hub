import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsIcon } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Configurações · Photo Hub",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/admin");

  const { data: settings } = await supabase
    .from("site_settings")
    .select("site_name")
    .eq("id", 1)
    .maybeSingle();

  return (
    <>
      <AdminHeader
        title="Configurações"
        subtitle="Personalize o Photo Hub da forma que você quiser."
        isAdmin
      />
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground/70">
          <SettingsIcon className="size-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Identidade do site</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Em breve mais opções de personalização por aqui.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <SiteSettingsForm
          initialSiteName={settings?.site_name ?? "Photo Hub"}
        />
      </div>
    </>
  );
}
