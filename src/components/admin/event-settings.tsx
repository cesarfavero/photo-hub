"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, PaletteIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { THEME_COLORS } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { IconPicker } from "@/components/admin/icon-picker";
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
  const [icon, setIcon] = useState(event.icon);
  const [themeColor, setThemeColor] = useState(event.theme_color);
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
        icon,
        theme_color: /^#[0-9a-fA-F]{6}$/.test(themeColor)
          ? themeColor
          : "#171717",
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
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="h-11"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Ícone do evento</Label>
          <p className="text-xs text-muted-foreground">
            Aparece no topo da página do evento.
          </p>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Tema do evento</Label>
          <p className="text-xs text-muted-foreground">
            Escolha a cor dos botões e destaques na página do evento.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {THEME_COLORS.map((preset) => {
              const selected =
                themeColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setThemeColor(preset.color)}
                  aria-label={`Cor ${preset.name}`}
                  title={preset.name}
                  className={cn(
                    "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform duration-150 hover:scale-110 active:scale-95",
                    selected
                      ? "ring-foreground"
                      : "ring-transparent hover:ring-foreground/30",
                  )}
                  style={{ backgroundColor: preset.color }}
                />
              );
            })}
            <label
              className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-foreground/25 text-foreground/60 transition-colors hover:border-foreground/40 hover:text-foreground"
              title="Escolher cor"
            >
              <PaletteIcon className="size-4" />
              <input
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(themeColor)
                    ? themeColor
                    : "#171717"
                }
                onChange={(e) => setThemeColor(e.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                aria-label="Escolher cor personalizada"
              />
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  value={themeColor}
                  onChange={(e) =>
                    setThemeColor(
                      e.target.value
                        .replace(/[^0-9a-fA-F#]/g, "")
                        .slice(0, 7),
                    )
                  }
                  placeholder="#2563eb"
                  className="h-10 w-32 pl-9 font-mono text-sm"
                  maxLength={7}
                  aria-label="Código hex da cor"
                />
                <span
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 rounded-full ring-1 ring-foreground/15"
                  style={{
                    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(themeColor)
                      ? themeColor
                      : "#ffffff",
                  }}
                />
              </div>
            </div>
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
