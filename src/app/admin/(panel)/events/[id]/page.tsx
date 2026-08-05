import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventSettings } from "@/components/admin/event-settings";
import { FrameManager } from "@/components/admin/frame-manager";
import { PhotoManager } from "@/components/admin/photo-manager";
import { PeopleManager } from "@/components/admin/people-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Gerenciar evento · Photo Hub",
};

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: event }, { data: frames }, { data: photos }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase
        .from("frames")
        .select("*")
        .eq("event_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("photos")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!event || (user && event.user_id && event.user_id !== user.id)) {
    notFound();
  }

  return (
    <>
      <AdminHeader
        title={event.name}
        subtitle={`Link: /${event.slug} · Gerenciar molduras, fotos e informações.`}
        backHref="/admin"
      />
      <div className="space-y-6">
        <EventSettings event={event} />
        <FrameManager eventId={event.id} frames={frames ?? []} />
        <PeopleManager eventId={event.id} />
        <PhotoManager photos={photos ?? []} />
      </div>
    </>
  );
}
