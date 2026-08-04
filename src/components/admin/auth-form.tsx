"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error("Não foi possível entrar", {
          description:
            error.code === "email_not_confirmed"
              ? "Confirme seu email antes de entrar."
              : "Email ou senha incorretos.",
        });
        setLoading(false);
        return;
      }
      toast.success("Login realizado!", {
        description: "Bem-vindo de volta ao painel.",
      });
      router.push("/admin");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    if (error) {
      toast.error("Não foi possível criar a conta", {
        description: error.message,
      });
      setLoading(false);
      return;
    }
    if (data.session) {
      toast.success("Conta criada!", {
        description: "Seu painel está pronto para uso.",
      });
      router.push("/admin");
      router.refresh();
      return;
    }
    toast.success("Quase lá!", {
      description:
        "Conta criada. Confirme seu email para começar a usar o painel.",
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="h-11 pl-9 text-base"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 pr-10 pl-9 text-base"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </Button>
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
        {loading ? <LoaderCircleIcon className="animate-spin" /> : null}
        {mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
    </form>
  );
}
