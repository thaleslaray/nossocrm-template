# Quickstart: Organization ID Migration

## Overview

Guia rápido para implementar a migração de `company_id` para `organization_id`.

---

## 1. Pre-requisitos

- [ ] Branch `001-org-id-migration` ativo
- [ ] Backup do banco de dados
- [ ] Ambiente de staging disponível
- [ ] Todos os testes passando na main

---

## 2. Ordem de Execução

### Fase 1: Database (Supabase)

```bash
# 1. Criar arquivo de migração
cp .specify/specs/001-org-id-migration/contracts/sql-migration.md \
   supabase/migrations/$(date +%Y%m%d%H%M%S)_rename_company_to_organization.sql

# 2. Aplicar em staging primeiro
supabase db push --db-url $STAGING_DB_URL

# 3. Verificar migração
supabase db diff
```

### Fase 2: TypeScript Types (src/types.ts)

```typescript
// Adicionar type aliases
export type OrganizationId = string;
export type ClientCompanyId = string;

// Renomear Company → Organization
// Atualizar interfaces conforme contracts/typescript-interfaces.md
```

### Fase 3: Services (src/lib/supabase/)

1. `contacts.ts` - `company_id` → `organization_id`
2. `deals.ts` - `company_id` → `organization_id`, `crm_company_id` → `client_company_id`
3. `activities.ts` - `company_id` → `organization_id`
4. `boards.ts` - `company_id` → `organization_id`
5. `settings.ts` - conforme necessário

### Fase 4: Query Hooks (src/lib/query/hooks/)

```typescript
// Padrão antigo
useCreateActivity({ activity, companyId })

// Padrão novo
useCreateActivity({ activity, organizationId })
```

### Fase 5: Controllers (src/features/*/hooks/)

Buscar e substituir em todos os controllers:
- `profile?.company_id` → `profile?.organizationId`
- `companyId: profile?.company_id` → `organizationId: profile?.organizationId`

### Fase 6: Edge Functions (supabase/functions/)

1. `setup-instance/index.ts`
2. `create-user/index.ts`
3. `delete-user/index.ts`
4. `list-users/index.ts`
5. `invite-users/index.ts`
6. `accept-invite/index.ts`
7. `_shared/*.ts`

---

## 3. Comandos de Verificação

```bash
# Verificar nenhum company_id restante no TypeScript
grep -rn "company_id\|companyId" src/ --include="*.ts" --include="*.tsx" | wc -l
# Esperado: 0 (ou apenas em comentários/tipos deprecated)

# Rodar testes
npm test

# Verificar tipos
npx tsc --noEmit

# Lint
npm run lint
```

---

## 4. Checklist Final

- [ ] Migração SQL aplicada em staging
- [ ] Todos os testes passando
- [ ] TypeScript sem erros
- [ ] Edge Functions atualizadas
- [ ] Documentação atualizada
- [ ] PR criado e revisado
- [ ] Deploy em produção

---

## 5. Rollback

Se algo der errado:

```bash
# 1. Rollback do banco
# Executar script de rollback do sql-migration.md

# 2. Reverter código
git revert HEAD

# 3. Deploy
vercel --prod
```

---

## Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `research.md` | Pesquisa de mercado e decisões |
| `data-model.md` | Modelo de dados atualizado |
| `contracts/sql-migration.md` | Script SQL completo |
| `contracts/typescript-interfaces.md` | Interfaces TypeScript |
| `plan.md` | Plano de implementação detalhado |
