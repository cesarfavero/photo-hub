"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 50);
}

export function CreateEventDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const create = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Informações incompletas", {
        description: "Preencha o nome e o link do evento.",
      });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").insert({
      name: name.trim(),
      description: description.trim(),
      slug: slug.trim().toLowerCase(),
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Link já em uso", {
          description: "Escolha outro link para o evento.",
        });
      } else {
        toast.error("Não foi possível criar o evento", {
          description: "Tente novamente em alguns instantes.",
        });
      }
      return;
    }
    toast.success("Evento criado!", {
      description: "Agora é só adicionar as molduras e imprimir o QR code.",
    });
    setOpen(false);
    setName("");
    setDescription("");
    setSlug("");
    setSlugTouched(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
        <PlusIcon /> Criar evento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar evento</DialogTitle>
          <DialogDescription>
            Crie um evento e compartilhe o QR code com os convidados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Nome do evento</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex.: Festa de 15 anos da Maria"
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-desc">Descrição (opcional)</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Tire sua foto na cabine e publique na galeria!"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-slug">Link do evento</Label>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 px-3">
              <span className="text-sm text-muted-foreground">
                seu-site.com/
              </span>
              <Input
                id="event-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="festa-maria"
                className="h-11 border-0 bg-transparent pl-0 focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O QR code levará os convidados para esse link.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={create} disabled={loading}>
            {loading ? <LoaderCircleIcon className="animate-spin" /> : null}
            Criar evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
