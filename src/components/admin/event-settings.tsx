"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 50);
}

export function EventSettings({ event }: { event: Event }) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description);
  const [slug, setSlug] = useState(event.slug);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Informações incompletas", {
        description: "Nome e link são obrigatórios.",
      });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({
        name: name.trim(),
        description: description.trim(),
        slug: slug.trim().toLowerCase(),
      })
      .eq("id", event.id);
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Link já em uso", {
          description: "Escolha outro link para o evento.",
        });
      } else {
        toast.error("Não foi possível salvar", {
          description: "Tente novamente em alguns instantes.",
        });
      }
      return;
    }
    toast.success("Evento atualizado!", {
      description: "As alterações já estão no ar.",
    });
    router.refresh();
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">Informações do evento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="slug">Link</Label>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 px-3">
            <span className="text-sm text-muted-foreground">
              seu-site.com/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="h-11 border-0 bg-transparent pl-0 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={saving}>
          {saving ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
