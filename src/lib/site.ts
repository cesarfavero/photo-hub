import { createClient } from "@/lib/supabase/server";

export const DEFAULT_SITE_NAME = "Photo Hub";

export async function getSiteName() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("site_name")
    .eq("id", 1)
    .maybeSingle();
  return data?.site_name ?? DEFAULT_SITE_NAME;
}
