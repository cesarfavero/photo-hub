# Workflow de homologação — Photo Hub

## Visão geral

- **`main`** = produção (`hub.ctygroup.co`). Estável, só recebe merges aprovados.
- **`homologacao`** = ambiente de testes/devolutivo. Todo desenvolvimento acontece aqui e o preview da Vercel sobe automaticamente a cada push.
- **Banco Supabase** é compartilhado entre os dois ambientes (uma única instância). Por isso, mudanças de schema são sempre **migrações aditivas** — nunca drop/recreate de coisas usadas por outra migração.

## URLs

| Ambiente   | URL principal                                              | Deploy                            |
|------------|------------------------------------------------------------|-----------------------------------|
| Produção   | `https://hub.ctygroup.co` (alias `photo-hub-alpha.vercel.app`) | merge para `main`                 |
| Homologação| URL de preview gerada pela Vercel (`photo-hub-git-homologacao-*.vercel.app`) | push para `homologacao` |

Para descobrir a URL do preview: `gh run list` → abrir o deployment, ou no painel da Vercel (projeto `photo-hub`) → Deployment.

## Runtime

- **Node 22 (LTS)** é obrigatório (`.nvmrc` + `engines`). O `@tensorflow/tfjs-node` usado na análise de fotos depende de APIs removidas no Node 24+ (ex.: `util.isNullOrUndefined`). Usar `nvm use` / `.nvmrc` para garantir a versão.
- Localmente: `nvm use 22 && npm run dev`.

## Ciclo normal

1. Garantir estar na branch correta: `git checkout homologacao && git pull`.
2. Desenvolver em commits pequenos e descritivos (português, `feat:`/`fix:`/`style:`).
3. Migração de banco necessária? Criar `supabase/migrations/000X_descricao.sql` **aditivo** e aplicar no banco compartilhado (ex.: `psql` via pooler) como parte do mesmo commit/PR.
4. Rodar `npm run lint` e `npm run build` localmente antes de subir.
5. `git push origin homologacao` → preview sobe automaticamente.
6. Testar o preview em homologação (fluxos públicos, dono do evento e admin).
7. Aprovar e promover (ver abaixo).

## Promoção para produção

Somente após aprovação em homologação:

```bash
git checkout main && git pull
git merge homologacao && git push origin main
git checkout homologacao
```

O deploy de produção sobe sozinho. Conferir `hub.ctygroup.co` após o deploy.

## Rollback

- **Código**: `git revert` do(s) commit(s) na branch afetada e push. Se já estava em `main`, reverter em `main` via merge reverso da `homologacao` ou revert direto.
- **Banco**: migrações não são revertidas por padrão (banco compartilhado). Para corrigir, usar uma **nova migração aditiva** que ajuste o schema/dados. Nunca dropar colunas de migração anterior enquanto produção depender delas.

## Migrações de banco

- Numeração sequencial: `0001`, `0002`, `0003`, ...
- Sempre idempotentes (`if not exists` / `if exists`).
- Aplicadas manualmente no banco compartilhado (não há CI de migração ainda).
- RLS habilitado nas tabelas novas; helper functions `SECURITY DEFINER` para regras que o cliente não pode ver.

## Freeze do evento

- Véspera do evento (dia 8): **congelar produção**. Nenhuma mudança direta em produção.
- Correções passam por homologação → aprovação → merge. Priorizar estabilidade e não quebrar fluxos do evento.

## Checklist antes de um merge para `main`

- [ ] Lint e build passando.
- [ ] Testado no preview em homologação (fluxos públicos, dono do evento e admin).
- [ ] Migrações aplicadas no banco compartilhado (se houver).
- [ ] Sem segredos no diff.
