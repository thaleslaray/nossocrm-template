# Implementation Plan: Testes de Integração para Cobertura Total

**Branch**: `002-integration-tests` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-integration-tests/spec.md`

## Summary

Criar testes de integração que cubram 100% das jornadas de usuário do CRM, garantindo que regressões sejam detectadas antes de deploy. Os testes usarão Vitest + React Testing Library + mocks de Supabase/IA, simulando fluxos completos de usuário sem dependências externas.

## Technical Context

**Language/Version**: TypeScript 5.9 + React 19  
**Primary Dependencies**: Vitest 4.0, React Testing Library 16.3, TanStack Query 5.x, happy-dom  
**Storage**: Supabase (mockado nos testes)  
**Testing**: Vitest com coverage v8, happy-dom environment  
**Target Platform**: Web (browser) + CI/CD  
**Project Type**: Web application (SPA React)  
**Performance Goals**: Todos os testes < 3 minutos, 0% flaky  
**Constraints**: Sem dependências de APIs externas (Supabase, Gemini mockados)  
**Scale/Scope**: 22 jornadas, ~80 cenários, 11 páginas

## Constitution Check

*GATE: Passed - projeto não tem constitution específica definida*

O projeto segue padrões já estabelecidos:
- ✅ Testes unitários existentes em `src/**/*.test.{ts,tsx}`
- ✅ Mocks de Supabase em `src/test/__mocks__/supabase.ts`
- ✅ Test utils com providers em `src/test/test-utils.tsx`
- ✅ Setup de testes em `src/test/setup.ts`

## Project Structure

### Documentation (this feature)

```text
specs/002-integration-tests/
├── plan.md              # This file
├── research.md          # Phase 0: padrões de testes
├── data-model.md        # Phase 1: estrutura de fixtures
├── quickstart.md        # Phase 1: guia de execução
├── contracts/           # N/A para testes
└── tasks.md             # Phase 2: tasks de implementação
```

### Source Code (repository root)

```text
src/
├── test/
│   ├── setup.ts                    # Existente - setup global
│   ├── test-utils.tsx              # Existente - providers wrapper
│   ├── __mocks__/
│   │   └── supabase.ts             # Existente - mocks base
│   ├── fixtures/                   # NOVO - dados de teste
│   │   ├── activities.ts
│   │   ├── boards.ts
│   │   ├── contacts.ts
│   │   ├── deals.ts
│   │   └── users.ts
│   └── integration/                # NOVO - helpers de integração
│       ├── journey-utils.ts        # Utilitários para jornadas
│       ├── mock-ai.ts              # Mock de respostas IA
│       └── mock-supabase.ts        # Mock configurável de Supabase
│
├── features/
│   ├── inbox/
│   │   └── __tests__/
│   │       └── inbox.journey.test.tsx      # NOVO
│   ├── dashboard/
│   │   └── __tests__/
│   │       └── dashboard.journey.test.tsx  # NOVO
│   ├── boards/
│   │   └── __tests__/
│   │       └── boards.journey.test.tsx     # NOVO
│   ├── contacts/
│   │   └── __tests__/
│   │       └── contacts.journey.test.tsx   # NOVO
│   ├── activities/
│   │   └── __tests__/
│   │       └── activities.journey.test.tsx # NOVO
│   ├── ai-hub/
│   │   └── __tests__/
│   │       └── ai-hub.journey.test.tsx     # NOVO
│   ├── decisions/
│   │   └── __tests__/
│   │       └── decisions.journey.test.tsx  # NOVO
│   ├── reports/
│   │   └── __tests__/
│   │       └── reports.journey.test.tsx    # NOVO
│   ├── settings/
│   │   └── __tests__/
│   │       └── settings.journey.test.tsx   # NOVO
│   └── profile/
│       └── __tests__/
│           └── profile.journey.test.tsx    # NOVO
│
└── pages/
    └── __tests__/
        └── auth.journey.test.tsx           # NOVO - login/setup/join
```

**Structure Decision**: Testes de jornada ficam em `__tests__/` dentro de cada feature com sufixo `.journey.test.tsx` para diferenciá-los de testes unitários.

## Complexity Tracking

Nenhuma violação de constitution - projeto segue estrutura padrão.

---

## Phase Status

| Phase | Status | Artifacts |
|-------|--------|-----------|
| Phase 0: Research | ✅ Complete | `research.md` |
| Phase 1: Design | ✅ Complete | `data-model.md`, `contracts/`, `quickstart.md` |
| Phase 2: Tasks | ✅ Complete | `tasks.md` |
| Phase 3: Implement | ⏳ Pending | Source code |
| Phase 4: Validate | ⏳ Pending | Coverage report |

## Next Steps

Run `/speckit.code` to start implementing tasks from `tasks.md`.
