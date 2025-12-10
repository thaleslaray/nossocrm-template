# Tasks: Server-Side Pagination

**Input**: Design documents from `/specs/004-server-pagination/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tipos base e configurações necessárias para todas as user stories

- [x] T001 [P] Add PaginationState interface in src/types.ts
- [x] T002 [P] Add PaginatedResponse<T> interface in src/types.ts
- [x] T003 [P] Add ContactsServerFilters interface in src/types.ts
- [x] T004 [P] Add PAGE_SIZE_OPTIONS and DEFAULT_PAGE_SIZE constants in src/types.ts
- [x] T005 Add query key contacts.paginated in src/lib/query/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend layer que DEVE estar completo antes de qualquer user story UI

**⚠️ CRITICAL**: Sem esses, nenhuma user story funciona

- [x] T006 Implement contactsService.getAllPaginated() method in src/lib/supabase/contacts.ts
- [x] T007 Add server-side search filter (.or ilike) in getAllPaginated
- [x] T008 Add server-side stage filter (.eq stage) in getAllPaginated
- [x] T009 Add server-side status filter (.eq status) in getAllPaginated
- [x] T010 Add server-side RISK status logic (ACTIVE + lastPurchaseDate > 30 days) in getAllPaginated
- [x] T011 Add server-side date range filters (.gte/.lte created_at) in getAllPaginated
- [x] T012 Implement useContactsPaginated hook with keepPreviousData in src/lib/query/hooks/useContactsQuery.ts
- [x] T013 Export useContactsPaginated from src/lib/query/hooks/index.ts

**Checkpoint**: API layer ready - User story implementation can now begin

---

## Phase 3: User Story 1 - Navegar entre páginas (Priority: P1) 🎯 MVP

**Goal**: Usuário pode navegar entre páginas de contatos com controles ⏮ ◀ ▶ ⏭

**Independent Test**: Acessar /contatos, verificar controles de paginação, clicar próxima/anterior

### Implementation for User Story 1

- [x] T014 [US1] Create PaginationControls component in src/features/contacts/components/PaginationControls.tsx
- [x] T015 [US1] Add navigation buttons (first, prev, next, last) to PaginationControls
- [x] T016 [US1] Add disabled states for buttons (prev disabled on first page, next disabled on last)
- [x] T017 [US1] Add pagination state (pageIndex, pageSize) to useContactsController in src/features/contacts/hooks/useContactsController.ts
- [x] T018 [US1] Replace useContacts with useContactsPaginated in useContactsController
- [x] T019 [US1] Extract contacts and totalCount from paginated response in useContactsController
- [x] T020 [US1] Add setPagination handler for navigation in useContactsController
- [x] T021 [US1] Integrate PaginationControls in ContactsPage UI in src/features/contacts/ContactsPage.tsx
- [x] T022 [US1] Update mock for getAllPaginated in src/features/contacts/ContactsPage.test.tsx
- [x] T023 [US1] Verify existing 57 filter tests still pass after migration

**Checkpoint**: Navegação básica funcional - MVP entregável

---

## Phase 4: User Story 2 - Alterar itens por página (Priority: P1)

**Goal**: Usuário pode escolher ver 25, 50 ou 100 contatos por página

**Independent Test**: Selecionar diferentes valores no dropdown, verificar que tabela mostra quantidade correta

### Implementation for User Story 2

- [x] T024 [US2] Add page size selector (<select>) to PaginationControls component
- [x] T025 [US2] Add onPageSizeChange handler that resets to page 0 in useContactsController
- [x] T026 [US2] Display "Mostrando X-Y de Z contatos" in PaginationControls

**Checkpoint**: Controle de pageSize completo

---

## Phase 5: User Story 3 - Filtrar com paginação server-side (Priority: P2)

**Goal**: Filtros (search, stage, status, date) funcionam com paginação server-side

**Independent Test**: Aplicar filtro, verificar que totalCount e pageCount refletem dados filtrados

### Implementation for User Story 3

- [x] T027 [US3] Build filters object from controller state (search, stage, status, dateRange) in useContactsController
- [x] T028 [US3] Pass filters to useContactsPaginated call
- [x] T029 [US3] Add useEffect to reset pagination.pageIndex to 0 when filters change
- [x] T030 [US3] Remove client-side filtering (useMemo filteredContacts) - now server-side
- [x] T031 [US3] Update stage counter buttons to use totalCount from server (não apenas filtered.length)

**Checkpoint**: Filtros funcionam com paginação server-side

---

## Phase 6: User Story 4 - Feedback visual durante carregamento (Priority: P2)

**Goal**: Indicador de loading aparece durante transições, dados anteriores permanecem visíveis

**Independent Test**: Navegar entre páginas, verificar spinner aparece e tabela não fica vazia

### Implementation for User Story 4

- [x] T032 [US4] Add isFetching and isPlaceholderData props to PaginationControls
- [x] T033 [US4] Show loading indicator (animate-pulse text) when isFetching in PaginationControls
- [x] T034 [US4] Disable navigation buttons while isFetching
- [x] T035 [US4] Verify keepPreviousData keeps old data visible during page transitions

**Checkpoint**: UX suave durante navegação entre páginas

---

## Phase 7: User Story 5 - Ir para página específica (Priority: P3)

**Goal**: Usuário pode digitar número da página e navegar diretamente

**Independent Test**: Digitar "50" no input, verificar navegação para página 50

### Implementation for User Story 5

- [x] T036 [US5] Add page number input field to PaginationControls
- [x] T037 [US5] Add goToPage handler that validates input (clamp to 1-pageCount)
- [x] T038 [US5] Handle edge cases: 0 → 1, negative → 1, > pageCount → pageCount

**Checkpoint**: Navegação direta para página específica funcional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade, acessibilidade e documentação

- [x] T039 [P] Add aria-labels for accessibility to pagination buttons
- [x] T040 [P] Add keyboard navigation support (focus management) to PaginationControls
- [x] T041 [P] Add dark mode styles to PaginationControls (dark: classes)
- [x] T042 Run all 57+ tests and verify pass: npm run test:run -- src/features/contacts/
- [x] T043 Type check entire project: npx tsc --noEmit
- [x] T044 Manual test with 10k contacts in dev environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational completion
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────────────────────►
                        │
Phase 2 (Foundational) ─┴───────────────────────────────────────────────────►
                                │
                    ┌───────────┴───────────┐
                    │                       │
Phase 3 (US1 P1) ───┴──► MVP CHECKPOINT ────┤
                                            │
Phase 4 (US2 P1) ──────────────────────────►│
                                            │
Phase 5 (US3 P2) ──────────────────────────►│
                                            │
Phase 6 (US4 P2) ──────────────────────────►│
                                            │
Phase 7 (US5 P3) ──────────────────────────►│
                                            │
Phase 8 (Polish) ◄─────────────────────────┘
```

### Within Each User Story

- Modelo/Hook antes de componente
- Componente antes de integração
- Integração antes de testes

### Parallel Opportunities

```bash
# Phase 1: All Setup tasks can run in parallel
T001, T002, T003, T004 [P]  # All types in types.ts

# Phase 8: All Polish tasks marked [P] can run in parallel
T039, T040, T041 [P]  # Accessibility, keyboard, dark mode
```

---

## Implementation Strategy

### MVP First (User Stories 1+2)

1. ✅ Complete Phase 1: Setup (tipos)
2. ✅ Complete Phase 2: Foundational (API layer)
3. ✅ Complete Phase 3: User Story 1 (navegação)
4. ✅ Complete Phase 4: User Story 2 (pageSize)
5. **STOP and VALIDATE**: Testar navegação e pageSize
6. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → API pronta
2. User Story 1 → MVP navegação → Deploy/Demo
3. User Story 2 → pageSize → Deploy/Demo
4. User Story 3 → Filtros server-side → Deploy/Demo
5. User Story 4 → Loading feedback → Deploy/Demo
6. User Story 5 → GoTo page → Deploy/Demo
7. Polish → Acessibilidade, testes finais

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências
- [US1-5] = mapa para user story específica
- Verificar 57 testes existentes após cada fase
- Commit após cada task ou grupo lógico
- RISK filter requer lógica especial (ACTIVE + lastPurchaseDate > 30 dias)
