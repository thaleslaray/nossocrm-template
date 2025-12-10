# Implementation Plan: Multi-Tenant Organization ID Migration

**Branch**: `001-org-id-migration` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-org-id-migration/spec.md`

## Summary

Migração completa de nomenclatura multi-tenant: renomear `companies` → `organizations` e `company_id` → `organization_id` em todo o sistema. Também renomear `companyId` → `clientCompanyId` nos tipos TypeScript para entidades CRM (Deal, Contact) para diferenciar claramente tenant de empresa cliente.

**Abordagem técnica**: 
1. Migration SQL para renomear tabela e colunas (preserva dados)
2. Atualização de RLS policies e funções
3. Atualização de tipos TypeScript e services
4. Atualização de Edge Functions
5. Atualização de documentação

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), SQL (PostgreSQL 15+)  
**Primary Dependencies**: React 19, Vite, TanStack Query, Supabase JS, Zod  
**Storage**: Supabase (PostgreSQL with RLS)  
**Testing**: Vitest, React Testing Library, Playwright (E2E)  
**Target Platform**: Web SPA (modern browsers)
**Project Type**: Web application (frontend + backend-as-service)  
**Performance Goals**: Migração < 5 min, zero degradação pós-migração  
**Constraints**: Zero downtime (exceto janela de manutenção curta), preservação de dados  
**Scale/Scope**: ~215 ocorrências de company_id no código, 15+ tabelas afetadas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Dados preservados | ✅ PASS | ALTER TABLE RENAME preserva dados |
| RLS mantido | ✅ PASS | Policies atualizadas na mesma migration |
| Testes passam | ⏳ PENDING | Verificar após implementação |
| TypeScript compila | ⏳ PENDING | Verificar após implementação |
| Zod validation | ✅ PASS | Schemas atualizados junto com types |

## Project Structure

### Documentation (this feature)

```text
specs/001-org-id-migration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output  
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (migration SQL)
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (affected areas)

```text
# Database Layer
supabase/
├── migrations/
│   └── YYYYMMDDHHMMSS_org_id_migration.sql  # NEW: rename migration
└── functions/
    ├── setup-instance/     # UPDATE: company_id → organization_id
    ├── create-user/        # UPDATE: company_id → organization_id
    ├── delete-user/        # UPDATE: company_id → organization_id
    ├── list-users/         # UPDATE: company_id → organization_id
    └── invite-users/       # UPDATE: company_id → organization_id

# TypeScript Layer
src/
├── types.ts                # UPDATE: OrganizationId type, Deal/Contact changes
├── context/
│   └── AuthContext.tsx     # UPDATE: profile.organizationId
├── lib/
│   ├── supabase/
│   │   ├── activities.ts   # UPDATE: company_id → organization_id
│   │   ├── boards.ts       # UPDATE: company_id → organization_id
│   │   ├── contacts.ts     # UPDATE: company_id → organization_id
│   │   ├── deals.ts        # UPDATE: company_id → organization_id
│   │   └── ...             # All services
│   └── query/
│       └── hooks/          # UPDATE: All query hooks
└── features/
    └── */hooks/            # UPDATE: All controller hooks

# Documentation
.github/
└── copilot-instructions.md # UPDATE: New terminology
```

**Structure Decision**: Existing structure maintained. This is a refactoring migration, not new feature development. Changes span all layers but don't add new directories.

## Complexity Tracking

> No violations - this is a nomenclature refactor following established patterns

| Aspect | Complexity | Mitigation |
|--------|------------|------------|
| 15+ tables affected | Medium | Single atomic migration |
| 215+ code occurrences | Medium | Systematic find-replace with type safety |
| RLS policies | Low | Copy-paste with rename |
| Edge Functions | Low | 5 functions, simple string replace |

---

## Phase 0: Research ✅ COMPLETE

### Research Tasks

1. ✅ **Verify JWT Claims**: Supabase JWT usa `company_id` via user metadata (vem do profile)
2. ✅ **Audit Edge Functions**: 8 funções mapeadas - setup-instance, create-user, delete-user, list-users, invite-users, accept-invite, ai-proxy, _shared
3. ✅ **Check External APIs**: Nenhuma integração externa encontrada que dependa de `company_id`
4. ✅ **Supabase Migration Best Practices**: `ALTER TABLE RENAME COLUMN` preserva dados e FKs

### Findings

Ver documento completo: [`research.md`](./research.md)

**Decisões Chave:**
- Market standard: `organization_id` (padrão Clerk/Auth0)
- Migração via RENAME COLUMN (atômico, preserva dados)
- 14 tabelas com FK para tenant
- 2 tabelas com FK para client company
- ~175 mudanças TypeScript estimadas
- 8 Edge Functions para atualizar

---

## Phase 1: Design & Contracts ✅ COMPLETE

### Generated Artifacts

| Artifact | Description | Status |
|----------|-------------|--------|
| [`data-model.md`](./data-model.md) | Entity definitions, column mappings, ERD | ✅ Complete |
| [`contracts/sql-migration.md`](./contracts/sql-migration.md) | Full SQL migration + rollback script | ✅ Complete |
| [`contracts/typescript-interfaces.md`](./contracts/typescript-interfaces.md) | TypeScript interface changes | ✅ Complete |
| [`quickstart.md`](./quickstart.md) | Implementation checklist | ✅ Complete |

### Data Model Changes

**Before:**
```
companies (id, name, ...) -- Tenant table
├── profiles (company_id → companies.id)
├── crm_companies (company_id → companies.id)
├── deals (company_id → companies.id, crm_company_id → crm_companies.id)
└── ... (all tables have company_id)
```

**After:**
```
organizations (id, name, ...) -- Tenant table (RENAMED)
├── profiles (organization_id → organizations.id)
├── crm_companies (organization_id → organizations.id)
├── deals (organization_id → organizations.id, crm_company_id → crm_companies.id)
└── ... (all tables have organization_id)
```

### TypeScript Changes

**Before:**
```typescript
interface Deal {
  companyId: string;  // Ambiguous - is this tenant or client?
}

interface Contact {
  companyId: string;  // Ambiguous
}
```

**After:**
```typescript
/** ID of the tenant organization (who pays for CRM) */
type OrganizationId = string;

/** ID of a client company managed in CRM */
type ClientCompanyId = string;

interface Deal {
  clientCompanyId: ClientCompanyId;  // Clear: this is the CRM client
}

interface Contact {
  clientCompanyId: ClientCompanyId;  // Clear: this is the CRM client
}
```

### Migration Contract

Full SQL migration with RLS policy updates: [`contracts/sql-migration.md`](./contracts/sql-migration.md)
TypeScript interface contracts: [`contracts/typescript-interfaces.md`](./contracts/typescript-interfaces.md)

---

## Phase 2: Implementation Tasks ⏳ NEXT

*(To be generated by `/speckit.tasks`)*

**Estimated task breakdown:**
1. Database migration (1 task)
2. TypeScript types update (1 task)
3. Services update (1 task per service, ~10 tasks)
4. Query hooks update (1 task)
5. Edge Functions update (5 tasks)
6. Documentation update (1 task)
7. Testing & validation (1 task)

**Total estimated tasks**: ~20 tasks
**Estimated effort**: 4-6 hours (experienced developer)
