import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { PeopleDirectory } from "@/components/admin/people-directory";
import { createClient } from "@/lib/supabase/server";
import type { GlobalPerson } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pessoas · Photo Hub",
};

export default async function PeoplePage() {
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

  const { data: people } = await supabase.rpc("get_all_people_admin");

  return (
    <>
      <AdminHeader
        title="Pessoas"
        subtitle={
          profile?.is_admin
            ? "Todas as pessoas que criaram perfil, com os eventos em que apareceram."
            : "Pessoas dos seus eventos, com os eventos em que apareceram."
        }
      />
      <PeopleDirectory people={(people as GlobalPerson[]) ?? []} />
    </>
  );
}
