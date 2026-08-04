import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Galeria do evento · Photo Hub",
};

export default async function EventGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: event }, { data: photos }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("photos")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!event || (user && event.user_id && event.user_id !== user.id)) {
    notFound();
  }

  const approvedCount = (photos ?? []).filter(
    (p) => p.approved && !p.archived,
  ).length;

  return (
    <>
      <AdminHeader
        title={`Galeria · ${event.name}`}
        subtitle={`${approvedCount} fotos na galeria pública · Aprovar, arquivar ou excluir.`}
        backHref="/admin"
      />
      <Button
        variant="outline"
        size="sm"
        className="mb-6 gap-1.5"
        nativeButton={false}
        render={<Link href={`/admin/events/${event.id}`} />}
      >
        <ArrowLeftIcon className="size-4" />
        Voltar para o evento
      </Button>
      <PhotoManager photos={photos ?? []} />
    </>
  );
}
