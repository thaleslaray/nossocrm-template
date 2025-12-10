# Implementation Plan: Migração Single-Tenant

**Branch**: `005-single-tenant-migration` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-single-tenant-migration/spec.md`

---

## Summary

Migrar o CRM de arquitetura multi-tenant para single-tenant, removendo toda a complexidade de isolamento por `organization_id`. A abordagem técnica envolve:

1. **Banco de Dados**: Simplificar políticas RLS para apenas `auth.uid()`, remover triggers de auto-populate
2. **Frontend**: Remover `organizationId` dos contextos e serviços  
3. **Tipos**: Remover `OrganizationId` e tornar campos opcionais

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x, SQL (PostgreSQL via Supabase)  
**Primary Dependencies**: Supabase (Auth, Database, Storage), TanStack Query, Vite, Tailwind CSS  
**Storage**: PostgreSQL via Supabase Cloud  
**Testing**: Vitest, React Testing Library  
**Target Platform**: Web Application (Browser)  
**Project Type**: Web (Frontend SPA + Supabase Backend)  
**Performance Goals**: Manter performance atual, queries mais rápidas sem JOINs de tenant  
**Constraints**: Zero downtime durante migração, dados existentes preservados  
**Scale/Scope**: ~26 tabelas afetadas, ~50 arquivos frontend, ~12 triggers a remover

---

## Constitution Check

*GATE: Constitution não preenchida - usando princípios padrão*

| Gate | Status | Notes |
|------|--------|-------|
| Testes existentes passam | ✅ | 197 passando |
| Build sem erros | ✅ | Verificar após cada fase |
| Zero breaking changes na API | ✅ | Manter compatibilidade |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-single-tenant-migration/
├── plan.md              # Este arquivo
├── spec.md              # Especificação aprovada
├── research.md          # Análise de impacto
├── data-model.md        # Modelo de dados simplificado
├── quickstart.md        # Guia de execução
├── contracts/           # Não aplicável (sem API nova)
└── tasks.md             # Tarefas de implementação
```

### Source Code (repository root)

```text
# Arquivos a modificar

supabase/
└── migrations/
    └── 20231201000000_schema.sql    # RLS, triggers, funções

src/
├── context/
│   ├── AuthContext.tsx              # Remover organizationId
│   ├── CRMContext.tsx               # Remover organizationId
│   ├── deals/DealsContext.tsx       # Simplificar
│   ├── contacts/ContactsContext.tsx # Simplificar
│   └── settings/SettingsContext.tsx # Simplificar
├── lib/supabase/
│   ├── deals.ts                     # Remover organization_id
│   ├── contacts.ts                  # Remover organization_id
│   ├── boards.ts                    # Remover organization_id
│   ├── activities.ts                # Remover organization_id
│   └── companies.ts                 # Remover organization_id
├── types.ts                          # Remover OrganizationId
└── hooks/                            # Diversos hooks
```

**Structure Decision**: Modificações in-place, sem criar novos diretórios. Todas as mudanças são simplificações de código existente.

---

## Fases de Implementação (Schema Rewrite)

> **Abordagem atualizada**: Criar schema novo simplificado ao invés de 50+ edições individuais.

### Fase 1: Schema SQL Simplificado

**Objetivo**: Criar novo arquivo de migração com schema single-tenant

1. Criar `schema_v2_single_tenant.sql` baseado no original
2. Remover todas as políticas RLS com organization_id
3. Remover triggers auto_organization_id
4. Remover função get_user_organization_id
5. Manter políticas simples (auth.uid() onde necessário)
6. Manter colunas organization_id (opcional, para histórico)

**Arquivos**: `supabase/migrations/schema_v2_single_tenant.sql` (novo)

---

### Fase 2: Tipos TypeScript

**Objetivo**: Remover tipos de organização

1. Remover type alias `OrganizationId`
2. Tornar `organizationId` opcional em todas as interfaces
3. Atualizar imports em arquivos afetados

**Arquivos**: `src/types.ts`

---

### Fase 3: Serviços Supabase

**Objetivo**: Remover passagem de organization_id

1. Remover parâmetro `organizationId` de todas as funções de serviço
2. Remover inserção de `organization_id` em creates

**Arquivos**: `src/lib/supabase/*.ts`

---

### Fase 4: Contextos React e Hooks

**Objetivo**: Simplificar contextos removendo lógica de tenant

1. Remover `organizationId` do AuthContext
2. Atualizar hooks que usavam organizationId
3. Atualizar testes

**Arquivos**: `src/context/**/*.tsx`, `src/lib/query/hooks/*.ts`

---

### Fase 5: Validação e Substituição

**Objetivo**: Testar e aplicar schema

1. Verificar build e testes
2. Revisar schema lado a lado
3. Substituir schema original (quando aprovado)

---

## Complexity Tracking

> Nenhuma violação de complexidade identificada. A migração é uma **simplificação**.

| Aspecto | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Linhas SQL (RLS) | ~500 | ~100 | 80% |
| Triggers | 12 | 0 | 100% |
| Funções tenant | 3 | 0 | 100% |
| Parâmetros organizationId | ~50 | 0 | 100% |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebra de queries existentes | Média | Alto | Testar cada fase isoladamente |
| Dados órfãos | Baixa | Médio | Manter colunas, não deletar dados |
| Regressão de segurança | Baixa | Alto | Verificar políticas RLS após migração |
