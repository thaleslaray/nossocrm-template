# Implementation Tasks: AI Code Auditors Team

**Feature**: `006-ai-code-auditors`
**Status**: Pending

## Phase 1: Setup & Infrastructure
**Goal**: Initialize the feature structure and API contracts.

- [ ] T001 Create feature directory structure in `src/features/ai-auditors` (components, hooks, stores, utils)
- [ ] T002 Implement `AuditorPersona`, `AuditFinding`, `AuditSession` interfaces in `src/features/ai-auditors/types.ts`
- [ ] T003 Create `useAuditStore` with Zustand (mock data initially) in `src/features/ai-auditors/stores/useAuditStore.ts`
- [ ] T004 Update `ai-proxy` contract definition in `src/lib/supabase/ai-proxy.ts` to include `auditCodeBase` action

## Phase 2: Meet the Auditors (User Story 1 - P2)
**Goal**: Users can view the 10 expert AI personas.

- [ ] T005 [P] [US1] Define constant `AUDITOR_ROSTER` with 10 personas (System Prompts, Avatars, Roles) in `src/features/ai-auditors/constants.ts`
- [ ] T006 [P] [US1] Create `PersonaAvatar` component in `src/features/ai-auditors/components/PersonaAvatar.tsx`
- [ ] T007 [US1] Create `AuditorCard` component displaying bio and expertise in `src/features/ai-auditors/components/AuditorCard.tsx`
- [ ] T008 [US1] Implement `AuditDashboard` to render the grid of 10 auditors in `src/features/ai-auditors/components/AuditDashboard.tsx`
- [ ] T009 [US1] Add "AI Auditors" route/view to the main application navigation

## Phase 3: Run Comprehensive Audit (User Story 2 - P1)
**Goal**: Execute a full codebase audit using client-side batching.

- [ ] T010 [US2] Implement `file-batcher.ts` to list and chunk project files (mock file list for browser env) in `src/features/ai-auditors/utils/file-batcher.ts`
- [ ] T011 [US2] Implement `analyzeFile` functionality in `src/lib/supabase/ai-proxy.ts` (client wrapper)
- [ ] T012 [US2] Implement `useAuditController` to manage batch processing logic (queue, concurrency, progress) in `src/features/ai-auditors/hooks/useAuditController.ts`
- [ ] T013 [US2] Connect `useAuditController` to `AuditDashboard` "Run Full Audit" button
- [ ] T014 [US2] Add progress indicators (files processed, current auditor) to `AuditDashboard.tsx`

## Phase 4: View Expert Findings (User Story 3 - P1)
**Goal**: Display audit results grouped by expert.

- [ ] T015 [US3] Create `FindingSeverityBadge` component in `src/features/ai-auditors/components/FindingSeverityBadge.tsx`
- [ ] T016 [US3] Create `FindingsList` component to list issues with code snippets in `src/features/ai-auditors/components/FindingsList.tsx`
- [ ] T017 [US3] Update `AuditDashboard` to display results view when audit is complete
- [ ] T018 [US3] Implement grouping by Auditor (Tabs or Sections) in `src/features/ai-auditors/components/AuditResults.tsx`

## Phase 5: Persistence & Export (FR-003)
**Goal**: Save session data and allow Markdown export.

- [ ] T019 [P] Implement `persist` middleware in `useAuditStore` for LocalStorage saving
- [ ] T020 [P] Implement `generateMarkdownReport` utility functions in `src/features/ai-auditors/utils/report-generator.ts`
- [ ] T021 Connect "Download Report" button in `AuditDashboard` to the generator utility

## Phase 6: Polish & Verification
**Goal**: Final styling and edge case handling.

- [ ] T022 Style all components with `shadcn/ui` and responsive design
- [ ] T023 Verify token limits and handle API errors (rate limits) gracefully in UI
- [ ] T024 Perform manual test of full audit flow
