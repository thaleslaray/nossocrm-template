# Research: Accessibility Audit & Remediation

**Feature**: 003-a11y-audit  
**Date**: 2024-12-04  
**Status**: Complete

## Executive Summary

Esta pesquisa analisa o estado atual de acessibilidade do NossoCRM, identifica gaps críticos em relação ao WCAG 2.1 AA, e define a abordagem técnica para remediação.

---

## 1. Audit Findings: Current State

### 1.1 Component Inventory

| Categoria | Quantidade | Arquivos Críticos |
|-----------|------------|-------------------|
| **Total Components** | 99 .tsx files | - |
| **UI Base Components** | 6 | Modal.tsx, FormField.tsx, popover.tsx, tooltip.tsx |
| **Feature Pages** | 11 | BoardsPage, ContactsPage, DashboardPage, etc. |
| **Modal Components** | 8+ | ConfirmModal, OnboardingModal, LossReasonModal, etc. |
| **Layout** | 1 | Layout.tsx (sidebar, header, navigation) |

### 1.2 Critical Issues Identified

#### A11Y-01: Modals Missing ARIA Attributes (CRITICAL)
- **Files**: `Modal.tsx`, `ConfirmModal.tsx`, `OnboardingModal.tsx`, `LossReasonModal.tsx`
- **Issue**: Modals não têm `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **WCAG**: 4.1.2 Name, Role, Value
- **Impact**: Screen readers não identificam modals como diálogos

```tsx
// BEFORE (Modal.tsx)
<div className="fixed inset-0 z-50...">
  <div className="bg-white...">
    <h2>{title}</h2>

// AFTER
<div className="fixed inset-0 z-50..." role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div className="bg-white...">
    <h2 id="modal-title">{title}</h2>
```

#### A11Y-02: No Focus Trap in Modals (CRITICAL)
- **Files**: All modal components
- **Issue**: Tab pode escapar do modal para elementos atrás
- **WCAG**: 2.4.3 Focus Order
- **Impact**: Keyboard users can't navigate modals properly

**Decision**: Use `focus-trap-react` library (lightweight, React-friendly)
**Rationale**: Native implementation is complex; library handles edge cases
**Alternatives Rejected**: 
- Manual implementation (error-prone, maintenance burden)
- `react-focus-lock` (larger bundle, more features than needed)

#### A11Y-03: Missing Focus Return on Modal Close (HIGH)
- **Files**: All modal components
- **Issue**: Quando modal fecha, foco não retorna ao trigger
- **WCAG**: 2.4.3 Focus Order
- **Impact**: Users lose context after closing modal

#### A11Y-04: Icon-Only Buttons Missing Labels (HIGH)
- **Files**: `Layout.tsx`, `DealCard.tsx`, `KanbanBoard.tsx`, various
- **Issue**: Botões com apenas ícone (X, Settings, etc.) sem aria-label
- **WCAG**: 1.1.1 Non-text Content, 4.1.2 Name, Role, Value
- **Example**:
```tsx
// BEFORE
<button onClick={onClose}>
  <X size={20} />
</button>

// AFTER
<button onClick={onClose} aria-label="Fechar">
  <X size={20} />
</button>
```

#### A11Y-05: Clickable Divs Instead of Buttons (HIGH)
- **Files**: `AudioPlayer.tsx` (line 106), backdrop overlays
- **Issue**: `<div onClick>` não é tabulável nem tem role
- **WCAG**: 4.1.2 Name, Role, Value
- **Impact**: Keyboard users cannot interact

#### A11Y-06: Missing Semantic Landmarks (MEDIUM)
- **Files**: `Layout.tsx`
- **Issue**: Sidebar is `<aside>` but main content area lacks `<main>`
- **WCAG**: 1.3.1 Info and Relationships
- **Impact**: Screen reader users can't jump to main content

#### A11Y-07: Heading Hierarchy Issues (MEDIUM)
- **Files**: Multiple pages
- **Issue**: Algumas páginas pulam níveis (H1 → H3) ou não têm H1
- **WCAG**: 1.3.1 Info and Relationships
- **Example**: `ReportsPage.tsx` has H1, H2, H3 correctly; `BoardsPage` may skip

#### A11Y-08: Form Labels Not Programmatically Associated (MEDIUM)
- **Files**: Various form components, especially outside `FormField.tsx`
- **Issue**: Some inputs lack proper `<label>` or `aria-label`
- **WCAG**: 1.3.1, 4.1.2

#### A11Y-09: Drag-and-Drop Not Keyboard Accessible (HIGH)
- **Files**: `KanbanBoard.tsx`, `DealCard.tsx`
- **Issue**: Kanban drag-and-drop only works with mouse
- **WCAG**: 2.1.1 Keyboard
- **Impact**: Motor-impaired users cannot reorganize deals

**Decision**: Add keyboard-based move via context menu or modal
**Rationale**: Native keyboard DnD is extremely complex; alternatives are more accessible
**Alternatives Rejected**:
- Native keyboard DnD (very complex, poor screen reader support)
- dnd-kit accessibility features (limited, not full solution)

#### A11Y-10: No Skip-to-Content Link (LOW)
- **Files**: `Layout.tsx`
- **Issue**: No way to skip sidebar navigation
- **WCAG**: 2.4.1 Bypass Blocks
- **Impact**: Screen reader users must tab through entire nav on each page

#### A11Y-11: Color-Only Differentiation (MEDIUM)
- **Files**: `DealCard.tsx` (priority colors), various status indicators
- **Issue**: Priority/status communicated only by border-left color
- **WCAG**: 1.4.1 Use of Color
- **Note**: Cards DO have text badges ("✓ GANHO", "✗ PERDIDO") which is good

#### A11Y-12: Focus Indicators May Be Low Contrast (MEDIUM)
- **Files**: Global CSS, Tailwind config
- **Issue**: `focus:ring-2 focus:ring-primary-500/50` may not meet 3:1 contrast
- **WCAG**: 2.4.7 Focus Visible

#### A11Y-13: Live Regions for Dynamic Content (HIGH)
- **Files**: `ToastContext.tsx`, realtime sync components
- **Issue**: Toast notifications may not use aria-live
- **WCAG**: 4.1.3 Status Messages
- **Impact**: Screen reader users miss notifications

#### A11Y-14: alt="" Missing on Decorative Images (LOW)
- **Files**: `KanbanList.tsx` (line 103)
- **Issue**: Avatar image has `alt=""` which is correct for decorative
- **Status**: ✅ Some correct usage found

---

## 2. Technology Decisions

### 2.1 Focus Management Library

**Decision**: `focus-trap-react` v10.x
**Rationale**:
- Small bundle (~3KB gzipped)
- Well-maintained, React 19 compatible
- Handles edge cases (initial focus, return focus, escape key)
- Used by major design systems (Chakra UI, Radix)

**Installation**:
```bash
npm install focus-trap-react
```

### 2.2 Accessibility Testing Tools

**Decision**: Multi-layer testing approach

| Layer | Tool | Purpose |
|-------|------|---------|
| **Linting** | `eslint-plugin-jsx-a11y` | Catch issues at dev time |
| **Unit Tests** | `@testing-library/jest-dom` (existing) | Test a11y attributes |
| **Integration** | `axe-core` + `vitest-axe` | Automated a11y checks in tests |
| **CI** | Lighthouse CI (optional) | Regression prevention |

**Installation**:
```bash
npm install -D eslint-plugin-jsx-a11y vitest-axe
```

### 2.3 Keyboard DnD Alternative

**Decision**: Context menu with "Move to..." action
**Rationale**:
- Screen reader friendly (standard menu pattern)
- Works with keyboard only
- Minimal code changes
- Users understand context menu pattern

**Implementation**:
- Add "Mover para..." option to existing card menu
- Open sub-menu or modal with stage selection
- Execute move on selection

---

## 3. Implementation Strategy

### 3.1 Priority Order

1. **Phase 1 - Critical Fixes (Blockers)**
   - Modal ARIA attributes (A11Y-01)
   - Focus trap in modals (A11Y-02)
   - Icon button labels (A11Y-04)

2. **Phase 2 - High Priority**
   - Focus return on modal close (A11Y-03)
   - Clickable divs → buttons (A11Y-05)
   - Keyboard DnD alternative (A11Y-09)
   - Live regions for toasts (A11Y-13)

3. **Phase 3 - Medium Priority**
   - Semantic landmarks (A11Y-06)
   - Heading hierarchy audit (A11Y-07)
   - Form labels audit (A11Y-08)
   - Focus indicator contrast (A11Y-12)

4. **Phase 4 - Polish**
   - Skip-to-content link (A11Y-10)
   - Color differentiation review (A11Y-11)
   - ESLint a11y plugin integration

### 3.2 Shared Utilities to Create

```typescript
// src/lib/a11y/useFocusReturn.ts
// Hook to manage focus return when component unmounts

// src/lib/a11y/useAnnounce.ts  
// Hook for aria-live announcements

// src/lib/a11y/FocusTrap.tsx
// Wrapper component using focus-trap-react

// src/components/ui/VisuallyHidden.tsx
// For screen-reader-only text

// src/components/ui/SkipLink.tsx
// Skip to main content link
```

---

## 4. Testing Strategy

### 4.1 Unit Test Patterns

```typescript
// Example: Testing modal accessibility
describe('Modal accessibility', () => {
  it('has correct ARIA attributes', () => {
    render(<Modal isOpen title="Test" onClose={vi.fn()}>Content</Modal>);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Test');
  });

  it('traps focus when open', async () => {
    render(<Modal isOpen title="Test" onClose={vi.fn()}>
      <button>First</button>
      <button>Last</button>
    </Modal>);
    
    await userEvent.tab();
    expect(screen.getByText('First')).toHaveFocus();
    
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByText('First')).toHaveFocus(); // Wraps around
  });
});
```

### 4.2 Integration Test with axe

```typescript
// Example: Page-level a11y test
import { axe, toHaveNoViolations } from 'vitest-axe';
expect.extend(toHaveNoViolations);

describe('ContactsPage accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ContactsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## 5. WCAG 2.1 AA Mapping

| WCAG Criterion | Status | Related Issues |
|----------------|--------|----------------|
| 1.1.1 Non-text Content | 🟡 Partial | A11Y-04, A11Y-14 |
| 1.3.1 Info and Relationships | 🟡 Partial | A11Y-06, A11Y-07, A11Y-08 |
| 1.4.1 Use of Color | ✅ Good | A11Y-11 (mostly ok) |
| 1.4.3 Contrast (Minimum) | 🟡 Needs Audit | A11Y-12 |
| 2.1.1 Keyboard | 🔴 Fail | A11Y-05, A11Y-09 |
| 2.4.1 Bypass Blocks | 🔴 Fail | A11Y-10 |
| 2.4.3 Focus Order | 🔴 Fail | A11Y-02, A11Y-03 |
| 2.4.7 Focus Visible | 🟡 Needs Audit | A11Y-12 |
| 4.1.2 Name, Role, Value | 🔴 Fail | A11Y-01, A11Y-04, A11Y-05 |
| 4.1.3 Status Messages | 🟡 Needs Audit | A11Y-13 |

---

## 6. Estimates

| Phase | Effort | Issues Covered |
|-------|--------|----------------|
| Phase 1 - Critical | 4-6 hours | A11Y-01, A11Y-02, A11Y-04 |
| Phase 2 - High | 6-8 hours | A11Y-03, A11Y-05, A11Y-09, A11Y-13 |
| Phase 3 - Medium | 4-6 hours | A11Y-06, A11Y-07, A11Y-08, A11Y-12 |
| Phase 4 - Polish | 2-4 hours | A11Y-10, A11Y-11, ESLint setup |
| **Total** | **16-24 hours** | 14 issues |

---

## 7. References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [APG: ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [focus-trap-react Documentation](https://github.com/focus-trap/focus-trap-react)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
