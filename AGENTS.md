<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras do projeto

- `main` é **produção** (`hub.ctygroup.co`). Nada é commitado direto nela: desenvolvimento acontece na branch `homologacao` (deploy automático de preview na Vercel) e só vai para `main` após aprovação e merge.
- Banco compartilhado (Supabase): alterações de schema sempre via **migrações aditivas** em `supabase/migrations/` (ex.: `0004_...sql`), sem drop/recreate de colunas de outras migrações.
- Commits em português, curtos e descritivos (ex.: `fix: ...`, `feat: ...`, `style: ...`).
- Ao concluir uma tarefa em `homologacao`, fazer commit e push para `origin/homologacao` (o preview sobe sozinho). Promoção para produção = merge `homologacao` → `main` + push.
- Congelar produção na véspera do evento dia 8; depois disso, qualquer mudança só após merge aprovado em homologação.

Detalhes completos do workflow em `HOMOLOGACAO.md`.
