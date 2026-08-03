# Photo Hub 📸

Cabine de fotos digital para eventos. O convidado lê um **QR code**, escolhe a **moldura**, tira a foto com a câmera do celular, coloca o **nome (opcional)** e a foto cai na **galeria** ao vivo. O dono do evento gerencia tudo pelo **painel admin**.

- **Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui (Base UI)
- **Backend:** Supabase (Postgres + Storage + Auth + Realtime)

## Fluxo

1. O dono cria o evento no painel e imprime o QR code (`/admin`).
2. O convidado lê o QR → cai na página `/<slug>` do evento.
3. Escolhe a moldura, tira a foto e publica na galeria (com nome opcional).
4. A galeria atualiza ao vivo (Supabase Realtime).
5. O dono aprova/exclui fotos e gerencia molduras no painel.

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor** e rode o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) (cria tabelas, RLS, buckets e políticas de storage).
3. Em **Project Settings → API**, copie a `URL` e a `anon public key`.

### 2. Variáveis de ambiente

Crie um arquivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key

# habilita o cadastro de conta no /admin/signup (1ª vez)
NEXT_PUBLIC_ADMIN_SIGNUP=true
```

Rode `npm run dev` e acesse `http://localhost:3000/admin/signup` para criar sua conta de administrador.

### 3. Molduras

As molduras são imagens **PNG com o centro transparente** em proporção **3:4** (ex.: 1080×1440). Envie pelo painel em **Gerenciar → Molduras**.

> Dica: uma moldura é uma imagem que "emoldura" a foto — as bordas têm a decoração (festas, flores, textos) e o centro, onde a pessoa aparece, é transparente. A foto da pessoa é desenhada por trás dela.

### 4. Deploy na Vercel

```bash
vercel --prod
```

Configure as mesmas variáveis de ambiente no painel da Vercel (Settings → Environment Variables). Após configurar o domínio final, adicione:

```bash
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

## Estrutura

```
supabase/schema.sql            # SQL completo (tabelas, RLS, buckets)
src/app/
  page.tsx                     # landing
  [slug]/page.tsx              # página pública do evento (QR)
  admin/
    login|signup               # autenticação do dono
    page.tsx                   # dashboard: eventos + QR codes
    events/[id]/page.tsx       # gerenciar molduras e fotos
src/components/
  photo-booth.tsx              # câmera + moldura + captura (canvas)
  gallery.tsx                  # galeria com realtime + lightbox
  admin/...                    # componentes do painel
src/lib/supabase/              # clientes do Supabase (browser/server)
```
