"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SiteSettingsForm({
  initialSiteName,
}: {
  initialSiteName: string;
}) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(initialSiteName);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const name = siteName.trim();
    if (!name) {
      toast.error("Informações incompletas", {
        description: "Informe um nome para o site.",
      });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_settings")
      .update({ site_name: name })
      .eq("id", 1);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success("Configurações salvas!", {
      description: "O novo nome já está valendo.",
    });
    router.refresh();
  };

  return (
    <div className="max-w-md rounded-2xl border bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="site-name">Nome do site</Label>
        <Input
          id="site-name"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="Ex.: Photo Hub"
          className="h-11 text-base"
        />
        <p className="text-xs text-muted-foreground">
          Aparece no navegador, no título das páginas e ao instalar como app.
        </p>
      </div>
      <Button
        onClick={() => void save()}
        disabled={loading}
        className="mt-4 gap-2"
      >
        {loading ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <SaveIcon className="size-4" />
        )}
        Salvar
      </Button>
    </div>
  );
}
