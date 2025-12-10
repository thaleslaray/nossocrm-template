# Tasks: Migração Single-Tenant

**Input**: Design documents from `/specs/005-single-tenant-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Validação via testes existentes (197 testes devem continuar passando)

**Organization**: Tasks organizadas por fase técnica da migração

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[US#]**: Qual user story esta task pertence
- Inclui caminhos exatos dos arquivos

---

## Phase 1: Setup (Preparação)

**Purpose**: Preparar ambiente e backup antes de modificações

- [ ] T001 Criar backup do schema SQL atual em `supabase/migrations/20231201000000_schema.sql.bak`
- [ ] T002 Verificar que todos os testes passam antes de iniciar: `npm run test:run`
- [ ] T003 [P] Documentar estado atual do build: `npm run build`

---

## Phase 2: Banco de Dados - Políticas RLS

**Purpose**: Simplificar políticas RLS removendo filtros de organization_id

**⚠️ CRITICAL**: Esta fase modifica segurança do banco

### Remover Função de Tenant

- [ ] T004 [US1] Remover função `get_user_organization_id()` do schema em `supabase/migrations/20231201000000_schema.sql`

### Atualizar Políticas RLS - Tabelas de Negócio

- [ ] T005 [P] [US1] Simplificar política RLS de `organizations` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T006 [P] [US1] Simplificar política RLS de `crm_companies` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T007 [P] [US1] Simplificar política RLS de `boards` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T008 [P] [US1] Simplificar política RLS de `board_stages` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T009 [P] [US1] Simplificar política RLS de `contacts` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T010 [P] [US1] Simplificar política RLS de `deals` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T011 [P] [US1] Simplificar política RLS de `deal_items` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T012 [P] [US1] Simplificar política RLS de `activities` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T013 [P] [US1] Simplificar política RLS de `products` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T014 [P] [US1] Simplificar política RLS de `tags` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T015 [P] [US1] Simplificar política RLS de `custom_field_definitions` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T016 [P] [US1] Simplificar política RLS de `leads` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T017 [P] [US1] Simplificar política RLS de `organization_invites` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T018 [P] [US1] Simplificar política RLS de `system_notifications` em `supabase/migrations/20231201000000_schema.sql`

### Manter Políticas RLS - Tabelas Pessoais (apenas auth.uid())

- [ ] T019 [P] [US1] Manter política `user_settings` com `user_id = auth.uid()` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T020 [P] [US1] Manter política `ai_conversations` com `user_id = auth.uid()` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T021 [P] [US1] Manter política `ai_decisions` com `user_id = auth.uid()` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T022 [P] [US1] Manter política `ai_audio_notes` com `user_id = auth.uid()` em `supabase/migrations/20231201000000_schema.sql`

**Checkpoint**: Políticas RLS simplificadas

---

## Phase 3: Banco de Dados - Triggers e Funções

**Purpose**: Remover triggers de auto-populate de organization_id

- [ ] T023 [US1] Remover função `auto_set_organization_id()` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T024 [P] [US1] Remover trigger `auto_organization_id` de `crm_companies` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T025 [P] [US1] Remover trigger `auto_organization_id` de `boards` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T026 [P] [US1] Remover trigger `auto_organization_id` de `board_stages` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T027 [P] [US1] Remover trigger `auto_organization_id` de `contacts` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T028 [P] [US1] Remover trigger `auto_organization_id` de `products` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T029 [P] [US1] Remover trigger `auto_organization_id` de `deals` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T030 [P] [US1] Remover trigger `auto_organization_id` de `deal_items` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T031 [P] [US1] Remover trigger `auto_organization_id` de `activities` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T032 [P] [US1] Remover trigger `auto_organization_id` de `tags` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T033 [P] [US1] Remover trigger `auto_organization_id` de `custom_field_definitions` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T034 [P] [US1] Remover trigger `auto_organization_id` de `leads` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T035 [P] [US1] Remover trigger `auto_organization_id` de `organization_invites` em `supabase/migrations/20231201000000_schema.sql`
- [ ] T036 [P] [US1] Remover trigger `auto_organization_id` de `system_notifications` em `supabase/migrations/20231201000000_schema.sql`

**Checkpoint**: Triggers removidos

---

## Phase 4: Tipos TypeScript

**Purpose**: Remover tipos de organização e tornar campos opcionais

- [ ] T037 [US2] Remover tipo `OrganizationId` de `src/types.ts`
- [ ] T038 [US2] Tornar `organizationId` opcional em interface `Deal` em `src/types.ts`
- [ ] T039 [US2] Tornar `organizationId` opcional em interface `Contact` em `src/types.ts`
- [ ] T040 [US2] Tornar `organizationId` opcional em interface `Activity` em `src/types.ts`
- [ ] T041 [US2] Tornar `organizationId` opcional em interface `Board` em `src/types.ts`
- [ ] T042 [US2] Tornar `organizationId` opcional em interface `DealItem` em `src/types.ts`
- [ ] T043 [US2] Verificar build após mudanças: `npm run build`

**Checkpoint**: Tipos TypeScript atualizados

---

## Phase 5: Serviços Supabase

**Purpose**: Remover passagem de organization_id nos serviços

- [ ] T044 [P] [US2] Remover parâmetro `organizationId` de `dealsService.create()` em `src/lib/supabase/deals.ts`
- [ ] T045 [P] [US2] Remover parâmetro `organizationId` de `contactsService.create()` em `src/lib/supabase/contacts.ts`
- [ ] T046 [P] [US2] Remover parâmetro `organizationId` de `boardsService.create()` em `src/lib/supabase/boards.ts`
- [ ] T047 [P] [US2] Remover parâmetro `organizationId` de `activitiesService.create()` em `src/lib/supabase/activities.ts`
- [ ] T048 [US2] Remover import de `OrganizationId` em `src/lib/supabase/utils.ts`
- [ ] T049 [US2] Verificar build após mudanças: `npm run build`

**Checkpoint**: Serviços Supabase simplificados

---

## Phase 6: Contextos React

**Purpose**: Remover organizationId dos contextos

- [ ] T050 [US3] Remover `organizationId` do `AuthContext` em `src/context/AuthContext.tsx`
- [ ] T051 [US3] Atualizar `useBoardsQuery` para não passar organizationId em `src/lib/query/hooks/useBoardsQuery.ts`
- [ ] T052 [US3] Atualizar `useActivitiesQuery` para não passar organizationId em `src/lib/query/hooks/useActivitiesQuery.ts`
- [ ] T053 [US3] Atualizar `useMoveDeal` para não usar organizationId em `src/lib/query/hooks/useMoveDeal.ts`
- [ ] T054 [US3] Verificar build após mudanças: `npm run build`

**Checkpoint**: Contextos React simplificados

---

## Phase 7: Hooks e Controllers

**Purpose**: Atualizar hooks que usavam organizationId

- [ ] T055 [P] [US3] Remover uso de `organizationId` em `src/features/boards/hooks/useBoardsController.ts`
- [ ] T056 [P] [US3] Remover uso de `organizationId` em `src/features/activities/hooks/useActivitiesController.ts`
- [ ] T057 [P] [US3] Remover uso de `organizationId` em `src/features/inbox/hooks/useInboxController.ts`

**Checkpoint**: Hooks atualizados

---

## Phase 8: Testes

**Purpose**: Atualizar mocks de testes que usavam organizationId

- [ ] T058 [P] [US3] Atualizar mock de AuthContext em `src/components/Layout.test.tsx`
- [ ] T059 [P] [US3] Atualizar mock de AuthContext em `src/test/a11y/pages.test.tsx`
- [ ] T060 [P] [US3] Atualizar mock de AuthContext em `src/features/contacts/ContactsPage.test.tsx`
- [ ] T061 [P] [US3] Atualizar mock de AuthContext em `src/features/contacts/components/ContactFormModal.test.tsx`
- [ ] T062 [US3] Executar todos os testes: `npm run test:run`

**Checkpoint**: Testes passando

---

## Phase 9: Validação Final

**Purpose**: Validação completa da migração

- [x] T063 Executar build de produção: `npm run build`
- [x] T064 Executar todos os testes: `npm run test:run`
- [x] T065 Verificar aplicação local: `npm run dev`
- [x] T066 Testar login e operações básicas (criar deal, contato, atividade)
- [x] T067 Atualizar documentação em `specs/005-single-tenant-migration/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências - pode começar imediatamente
- **Phase 2-3 (SQL)**: Dependem de Phase 1
- **Phase 4-5 (TypeScript/Serviços)**: Dependem de Phase 2-3 (banco pronto)
- **Phase 6-7 (React)**: Dependem de Phase 4-5 (tipos e serviços prontos)
- **Phase 8 (Testes)**: Depende de Phase 6-7
- **Phase 9 (Validação)**: Depende de todas as fases anteriores

### User Story Dependencies

- **US1** (Sistema Funciona): Fases 2-3 (banco de dados)
- **US2** (Código Simplificado): Fases 4-5 e depende de US1
- **US3** (Tests Passando): Fases 6-8 e depende de US2

---

## Parallel Opportunities

### Fase 2 (RLS)

```bash
# Todas as políticas podem ser modificadas em paralelo:
T005-T018 podem rodar em paralelo (diferentes tabelas)
```

### Fase 3 (Triggers)

```bash
# Todos os triggers podem ser removidos em paralelo:
T024-T036 podem rodar em paralelo (diferentes tabelas)
```

### Fases 4-5 (TypeScript)

```bash
# Tipos e serviços podem ser modificados em paralelo:
T038-T042 podem rodar em paralelo (diferentes interfaces)
T044-T047 podem rodar em paralelo (diferentes serviços)
```

---

## Implementation Strategy

### Abordagem Recomendada

1. **SQL primeiro**: Fases 2-3
2. **Frontend depois**: Fases 4-7
3. **Testes por último**: Fase 8
4. **Validação**: Fase 9

Esta ordem minimiza erros - o banco aceita tanto com quanto sem organization_id durante a transição.

### MVP (Mínimo Viável)

1. Completar Fases 1-3 (banco de dados)
2. Testar diretamente no Supabase
3. Se funcionar, continuar com frontend

---

## Summary

| Métrica | Valor |
|---------|-------|
| Total de Tasks | 67 |
| Fases | 9 |
| Tasks Paralelizáveis | 42 |
| User Stories Cobertas | 3 |

### Tasks por User Story

| User Story | Tasks | Descrição |
|------------|-------|-----------|
| US1 | T004-T036 (33) | Banco de dados |
| US2 | T037-T049 (13) | Tipos e serviços |
| US3 | T050-T062 (13) | React e testes |
| Setup/Validação | T001-T003, T063-T067 (8) | Preparação e validação |
