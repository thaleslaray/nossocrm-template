# Tasks: Accessibility Audit & Remediation

**Input**: Design documents from `/specs/003-a11y-audit/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Testes de acessibilidade serão incluídos (spec solicita conformidade WCAG e testes automatizados).

**Organization**: Tasks organizadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story associada (US1, US2, etc.)
- Inclui caminhos exatos de arquivos nas descrições

---

## Phase 1: Setup

**Purpose**: Instalação de dependências e estrutura base de acessibilidade

- [X] T001 Install focus-trap-react dependency: `npm install focus-trap-react`
- [X] T002 [P] Install dev dependencies: `npm install -D eslint-plugin-jsx-a11y vitest-axe`
- [X] T003 [P] Create a11y utilities directory structure in src/lib/a11y/
- [X] T004 [P] Add a11y utility CSS classes in src/index.css (.visually-hidden, .skip-link)

---

## Phase 2: Foundational (Shared A11y Components)

**Purpose**: Componentes e hooks base que TODAS as user stories dependem

**⚠️ CRÍTICO**: Nenhuma correção de user story pode começar até esta fase estar completa

- [X] T005 Create FocusTrap wrapper component in src/lib/a11y/components/FocusTrap.tsx
- [X] T006 [P] Create useFocusReturn hook in src/lib/a11y/hooks/useFocusReturn.ts
- [X] T007 [P] Create VisuallyHidden component in src/lib/a11y/components/VisuallyHidden.tsx
- [X] T008 [P] Create LiveRegion component in src/lib/a11y/components/LiveRegion.tsx
- [X] T009 [P] Create useAnnounce hook in src/lib/a11y/hooks/useAnnounce.ts
- [X] T010 Create a11y barrel export in src/lib/a11y/index.ts
- [X] T011 [P] Setup axe-core test utilities in src/lib/a11y/test/a11y-utils.ts

**Checkpoint**: Infraestrutura a11y pronta - implementação das user stories pode começar

---

## Phase 3: User Story 1 - Screen Reader Navigation (Priority: P1) 🎯 MVP

**Goal**: Usuários de leitores de tela conseguem navegar pelo CRM, acessar modais, e interagir com formulários

**Independent Test**: Testar com VoiceOver que modais são anunciados como "dialog" e campos de form têm labels

### Tests for User Story 1

- [X] T012 [P] [US1] Create Modal accessibility test in src/components/ui/Modal.test.tsx
- [X] T013 [P] [US1] Create ConfirmModal accessibility test in src/components/ConfirmModal.test.tsx

### Implementation for User Story 1

- [X] T014 [US1] Add role="dialog", aria-modal, aria-labelledby to Modal.tsx in src/components/ui/Modal.tsx
- [X] T015 [US1] Add FocusTrap to Modal.tsx in src/components/ui/Modal.tsx
- [X] T016 [US1] Add useFocusReturn to Modal.tsx for focus management
- [X] T017 [P] [US1] Add ARIA attributes to ConfirmModal.tsx in src/components/ConfirmModal.tsx
- [X] T018 [P] [US1] Add ARIA attributes to OnboardingModal.tsx in src/components/OnboardingModal.tsx
- [X] T019 [P] [US1] Add ARIA attributes to LossReasonModal.tsx in src/components/ui/LossReasonModal.tsx
- [X] T020 [US1] Add aria-live region to ToastContext.tsx in src/context/ToastContext.tsx
- [X] T021 [US1] Run axe test on Modal components

**Checkpoint**: Modais anunciam título e tipo para screen readers, foco retorna corretamente

---

## Phase 4: User Story 2 - Keyboard-Only Navigation (Priority: P1)

**Goal**: Usuários conseguem navegar completamente pelo CRM usando apenas teclado

**Independent Test**: Testar navegando por toda a aplicação com Tab/Shift+Tab sem usar mouse

### Tests for User Story 2

- [X] T022 [P] [US2] Create focus trap test for Modal in src/components/ui/Modal.test.tsx
- [ ] T023 [P] [US2] Create keyboard navigation test for DealCard in src/features/boards/components/Kanban/DealCard.test.tsx

### Implementation for User Story 2

- [X] T024 [US2] Add aria-label to close button in Modal.tsx in src/components/ui/Modal.tsx
- [X] T025 [P] [US2] Add aria-labels to icon buttons in Layout.tsx (theme toggle, notifications, menu)
- [X] T026 [P] [US2] Add aria-labels to icon buttons in DealCard.tsx in src/features/boards/components/Kanban/DealCard.tsx
- [X] T027 [US2] Convert clickable div to button in AudioPlayer.tsx in src/components/ui/AudioPlayer.tsx
- [X] T028 [US2] Add keyboard "Move to stage" option to DealCard menu in src/features/boards/components/Kanban/DealCard.tsx
- [X] T029 [US2] Create MoveToStageModal for keyboard DnD alternative in src/features/boards/components/Modals/MoveToStageModal.tsx
- [X] T030 [US2] Integrate MoveToStageModal with KanbanBoard in src/features/boards/components/Kanban/KanbanBoard.tsx

**Checkpoint**: Tab navega todos elementos, Escape fecha modais, deals podem ser movidos via teclado

---

## Phase 5: User Story 3 - Color Contrast & Visual (Priority: P2)

**Goal**: Usuários com baixa visão ou daltonismo conseguem distinguir todos os elementos

**Independent Test**: Rodar Lighthouse Accessibility e verificar score ≥90

### Implementation for User Story 3

- [X] T031 [P] [US3] Audit and fix focus ring contrast in tailwind.config.js (ensure focus:ring meets 3:1)
- [X] T032 [P] [US3] Add prefers-reduced-motion support in src/index.css
- [X] T033 [US3] Ensure priority indicators in DealCard have text fallback (already has badges ✓)
- [X] T034 [US3] Run Lighthouse accessibility audit and document baseline score

**Checkpoint**: Lighthouse score ≥90, focus indicators visíveis em ambos os temas

---

## Phase 6: User Story 4 - Semantic HTML & Structure (Priority: P2)

**Goal**: Usuários de screen readers navegam eficientemente usando landmarks e headings

**Independent Test**: VoiceOver consegue listar landmarks (nav, main, aside) e headings corretamente

### Tests for User Story 4

- [X] T035 [P] [US4] Create Layout landmark test in src/components/Layout.test.tsx

### Implementation for User Story 4

- [X] T036 [US4] Add main landmark to Layout.tsx in src/components/Layout.tsx
- [X] T037 [US4] Create SkipLink component in src/components/ui/SkipLink.tsx
- [X] T038 [US4] Add SkipLink to Layout.tsx in src/components/Layout.tsx
- [X] T039 [P] [US4] Audit and fix heading hierarchy in DashboardPage.tsx
- [X] T040 [P] [US4] Audit and fix heading hierarchy in ContactsPage.tsx
- [X] T041 [P] [US4] Audit and fix heading hierarchy in ReportsPage.tsx
- [X] T042 [US4] Ensure nav element in Layout sidebar has aria-label="Menu principal"

**Checkpoint**: Landmarks navegáveis, hierarquia de headings correta em todas as páginas

---

## Phase 7: User Story 5 - Modal & Dialog Accessibility (Priority: P2)

**Goal**: Todos os modais do sistema são acessíveis (ARIA, focus trap, escape)

**Independent Test**: Abrir cada modal, verificar focus trap e retorno de foco

### Tests for User Story 5

- [X] T043 [P] [US5] Create focus return test in src/components/ui/Modal.test.tsx

### Implementation for User Story 5

- [X] T044 [US5] Add ARIA to DealDetailModal in src/features/boards/components/Modals/DealDetailModal.tsx
- [X] T045 [P] [US5] Add ARIA to ContactFormModal in src/features/contacts/components/ContactFormModal.tsx
- [X] T046 [P] [US5] Add ARIA to SelectBoardModal in src/features/contacts/components/SelectBoardModal.tsx
- [X] T047 [P] [US5] Add ARIA to CreateBoardModal in src/features/boards/components/Modals/CreateBoardModal.tsx
- [X] T048 [P] [US5] Add ARIA to LifecycleSettingsModal in src/features/settings/components/LifecycleSettingsModal.tsx
- [X] T049 [US5] Add FocusTrap to all feature modals using shared FocusTrap component
- [X] T050 [US5] Add escape key handler to close modals (verify all modals)

**Checkpoint**: Todos os modais têm role="dialog", focus trap, e escape fecha

---

## Phase 8: User Story 6 - Form Accessibility (Priority: P2)

**Goal**: Formulários têm labels corretos, erros são anunciados, campos obrigatórios são indicados

**Independent Test**: VoiceOver anuncia labels ao focar campos, erros são lidos automaticamente

### Tests for User Story 6

- [X] T051 [P] [US6] Create FormField accessibility test in src/components/ui/FormField.test.tsx

### Implementation for User Story 6

- [X] T052 [US6] Audit FormField.tsx for complete ARIA support (already good, verify aria-required)
- [X] T053 [P] [US6] Add aria-labels to inputs outside FormField in Login.tsx in src/pages/Login.tsx
- [X] T054 [P] [US6] Add aria-labels to inputs in SetupWizard.tsx in src/pages/SetupWizard.tsx
- [X] T055 [P] [US6] Add aria-labels to inputs in JoinPage.tsx in src/pages/JoinPage.tsx
- [X] T056 [US6] Ensure form error focus management (focus first error on submit)

**Checkpoint**: Todos os campos de form têm labels associados, erros são anunciados

---

## Phase 9: Polish & Tooling

**Purpose**: Integração de ferramentas, documentação, validação final

- [X] T057 [P] Configure eslint-plugin-jsx-a11y in eslint.config.js
- [X] T058 [P] Create axe integration tests for main pages in src/test/a11y/
- [X] T059 Add a11y testing documentation in docs/ACCESSIBILITY.md
- [X] T060 Run full Lighthouse audit on all pages and document results
- [X] T061 Run quickstart.md validation (manual VoiceOver test)
- [X] T062 Update copilot-instructions.md with a11y patterns

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Setup - BLOQUEIA todas as user stories
- **User Stories (Phases 3-8)**: Dependem de Foundational
  - US1 e US2 são P1 - fazer primeiro em sequência
  - US3-US6 são P2 - podem ser paralelas após P1
- **Polish (Phase 9)**: Depende de todas as user stories desejadas

### User Story Dependencies

- **US1 (Screen Reader)**: Após Foundational - Base para outros
- **US2 (Keyboard)**: Após Foundational - Paralelo com US1 se time disponível
- **US3 (Contrast)**: Após Foundational - Independente
- **US4 (Semantic)**: Após Foundational - Independente
- **US5 (Modals)**: Após US1 (usa componentes de US1)
- **US6 (Forms)**: Após Foundational - Independente

### Parallel Opportunities

```bash
# Phase 2 - Foundational (após T005):
T006 useFocusReturn | T007 VisuallyHidden | T008 LiveRegion | T009 useAnnounce | T011 test setup

# Phase 3 - US1 Tests:
T012 Modal test | T013 ConfirmModal test

# Phase 4 - US2 aria-labels:
T025 Layout buttons | T026 DealCard buttons

# Phase 5 - US3 contrast:
T031 tailwind focus | T032 reduced-motion

# Phase 6 - US4 headings:
T039 Dashboard | T040 Contacts | T041 Reports

# Phase 7 - US5 modals:
T045 ContactForm | T046 SelectBoard | T047 CreateBoard | T048 LifecycleSettings
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - Screen Reader Navigation
4. Complete Phase 4: US2 - Keyboard Navigation
5. **VALIDATE**: Testar com VoiceOver e navegação por teclado
6. Deploy - CRM é navegável por screen readers e teclado

### Incremental Delivery

1. Setup + Foundational → Infraestrutura pronta
2. US1 + US2 → MVP acessível (P1s concluídos)
3. US3 + US4 → Contraste e semântica (P2s iniciais)
4. US5 + US6 → Modais e forms completos
5. Polish → Tooling e documentação

### Task Count Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| Setup | 4 | 30 min |
| Foundational | 7 | 2h |
| US1 (P1) | 10 | 2-3h |
| US2 (P1) | 9 | 3-4h |
| US3 (P2) | 4 | 1h |
| US4 (P2) | 8 | 2h |
| US5 (P2) | 8 | 2h |
| US6 (P2) | 6 | 1.5h |
| Polish | 6 | 2h |
| **Total** | **62** | **16-20h** |

---

## Notes

- Tasks [P] = arquivos diferentes, sem dependências
- [Story] mapeia task para user story específica
- Cada user story deve ser completável e testável independentemente
- Commit após cada task ou grupo lógico
- Validar com VoiceOver/NVDA após cada user story P1
