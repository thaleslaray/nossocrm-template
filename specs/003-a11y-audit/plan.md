# Implementation Plan: Accessibility Audit & Remediation

**Branch**: `003-a11y-audit` | **Date**: 2024-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-a11y-audit/spec.md`

## Summary

Auditoria de acessibilidade do NossoCRM para conformidade WCAG 2.1 Level AA, cobrindo navegação por teclado, suporte a leitores de tela, contraste de cores, semântica HTML, e acessibilidade de modais e formulários. Abordagem: correções incrementais em 4 fases, começando pelos bloqueadores críticos (modais sem ARIA, falta de focus trap) e terminando com polish (skip link, ESLint).

## Technical Context

**Language/Version**: TypeScript 5.9, React 19  
**Primary Dependencies**: React 19, Tailwind CSS 3.4, focus-trap-react (novo), Radix UI (tooltip, popover)  
**Storage**: N/A (feature não afeta banco de dados)  
**Testing**: Vitest + React Testing Library + vitest-axe (novo), eslint-plugin-jsx-a11y (novo)  
**Target Platform**: Web (Chrome, Firefox, Safari, Edge), suporte a screen readers (VoiceOver, NVDA)  
**Project Type**: Web application (SPA React)  
**Performance Goals**: Lighthouse Accessibility score ≥90  
**Constraints**: Mínima regressão visual, sem redesign de componentes  
**Scale/Scope**: 99 componentes .tsx, ~11 páginas, ~8 modais a corrigir

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Library-First | ✅ N/A | Feature é correção de código existente |
| Test-First | ✅ Pass | Testes de a11y serão adicionados para cada correção |
| Simplicity | ✅ Pass | Usa biblioteca existente (focus-trap-react) vs implementação custom |

**Gate Result**: ✅ PASS - Nenhuma violação

## Project Structure

### Documentation (this feature)

```text
specs/003-a11y-audit/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Audit findings and decisions
├── data-model.md        # Component interfaces
├── quickstart.md        # Quick implementation guide
├── contracts/           # Component contracts
│   └── a11y-components.md
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/
│   │   ├── Modal.tsx           # MODIFY: Add ARIA, focus trap
│   │   ├── FormField.tsx       # MODIFY: Audit labels (already good)
│   │   ├── FocusTrap.tsx       # NEW: Focus trap wrapper
│   │   ├── VisuallyHidden.tsx  # NEW: SR-only content
│   │   ├── SkipLink.tsx        # NEW: Skip to content
│   │   ├── LiveRegion.tsx      # NEW: Announcements
│   │   └── AudioPlayer.tsx     # MODIFY: Fix clickable div
│   ├── Layout.tsx              # MODIFY: Add main, skip link
│   ├── ConfirmModal.tsx        # MODIFY: Add ARIA, focus trap
│   ├── OnboardingModal.tsx     # MODIFY: Add ARIA, focus trap
│   └── ...
├── features/
│   ├── boards/
│   │   └── components/
│   │       ├── Kanban/
│   │       │   ├── DealCard.tsx      # MODIFY: aria-labels, keyboard move
│   │       │   └── KanbanBoard.tsx   # MODIFY: keyboard DnD alternative
│   │       └── Modals/
│   │           └── DealDetailModal.tsx  # MODIFY: Add ARIA
│   └── ...
├── context/
│   └── ToastContext.tsx        # MODIFY: Add aria-live
├── lib/
│   └── a11y/                   # NEW: A11y utilities
│       ├── useFocusReturn.ts
│       ├── useAnnounce.ts
│       └── index.ts
└── index.css                   # MODIFY: Add a11y utility classes

tests/
└── a11y/                       # NEW: A11y test utilities
    └── axe-setup.ts
```

**Structure Decision**: Mantém estrutura existente do projeto. Adiciona novo diretório `src/lib/a11y/` para hooks de acessibilidade e `src/components/ui/` para novos componentes base.

## Implementation Phases

### Phase 1: Critical Fixes (Blockers)
**Issues**: A11Y-01, A11Y-02, A11Y-04  
**Effort**: 4-6 hours

- Install `focus-trap-react`
- Create `FocusTrap.tsx` wrapper component
- Update `Modal.tsx`: Add role="dialog", aria-modal, aria-labelledby, focus trap
- Update `ConfirmModal.tsx`: Add ARIA attributes, focus trap
- Update all icon-only buttons with aria-label
- Add basic a11y tests for Modal

### Phase 2: High Priority
**Issues**: A11Y-03, A11Y-05, A11Y-09, A11Y-13  
**Effort**: 6-8 hours

- Create `useFocusReturn` hook
- Implement focus return on modal close
- Convert clickable divs to buttons (AudioPlayer)
- Add keyboard move alternative for Kanban (context menu)
- Add aria-live to ToastContext
- Create `LiveRegion` component

### Phase 3: Medium Priority
**Issues**: A11Y-06, A11Y-07, A11Y-08, A11Y-12  
**Effort**: 4-6 hours

- Add `<main id="main-content">` to Layout
- Create `SkipLink` component
- Audit and fix heading hierarchy across pages
- Audit and fix form labels
- Review and improve focus indicator contrast
- Create `VisuallyHidden` component

### Phase 4: Polish & Tooling
**Issues**: A11Y-10, A11Y-11, ESLint  
**Effort**: 2-4 hours

- Install and configure `eslint-plugin-jsx-a11y`
- Install `vitest-axe` for automated testing
- Add axe tests for major pages
- Review color-only differentiation
- Document a11y patterns for team

## Complexity Tracking

> **No violations to justify** - All changes are incremental fixes to existing components using established patterns (ARIA, focus-trap-react library).
