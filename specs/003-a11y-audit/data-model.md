# Data Model: Accessibility Components & Utilities

**Feature**: 003-a11y-audit  
**Date**: 2024-12-04

## Overview

Esta feature não introduz entidades de dados no banco. O "data model" representa os **componentes React e utilitários** que serão criados ou modificados para suportar acessibilidade.

---

## 1. New Components

### 1.1 FocusTrap

**Location**: `src/components/ui/FocusTrap.tsx`

```typescript
interface FocusTrapProps {
  /** Whether the trap is active */
  active: boolean;
  /** Element(s) to trap focus within */
  children: React.ReactNode;
  /** Callback when user presses Escape */
  onEscape?: () => void;
  /** Initial focus target (selector or ref) */
  initialFocus?: string | React.RefObject<HTMLElement>;
  /** Return focus to this element on deactivate */
  returnFocus?: boolean;
}
```

**Behavior**:
- When `active=true`, Tab/Shift+Tab cycles within children
- Escape key triggers `onEscape` if provided
- On deactivate, returns focus to previously focused element
- Based on `focus-trap-react` library

### 1.2 VisuallyHidden

**Location**: `src/components/ui/VisuallyHidden.tsx`

```typescript
interface VisuallyHiddenProps {
  /** Content only visible to screen readers */
  children: React.ReactNode;
  /** Render as different element (default: span) */
  as?: keyof JSX.IntrinsicElements;
}
```

**CSS**:
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 1.3 SkipLink

**Location**: `src/components/ui/SkipLink.tsx`

```typescript
interface SkipLinkProps {
  /** Target element ID (without #) */
  targetId: string;
  /** Link text */
  children?: React.ReactNode;
}
```

**Behavior**:
- Hidden until focused (appears at top-left)
- On click/Enter, focuses target element
- Default text: "Pular para conteúdo principal"

### 1.4 LiveRegion

**Location**: `src/components/ui/LiveRegion.tsx`

```typescript
interface LiveRegionProps {
  /** Content to announce */
  children: React.ReactNode;
  /** Politeness level */
  mode?: 'polite' | 'assertive';
  /** Atomic announcement (read entire region) */
  atomic?: boolean;
}
```

---

## 2. New Hooks

### 2.1 useFocusReturn

**Location**: `src/lib/a11y/useFocusReturn.ts`

```typescript
interface UseFocusReturnOptions {
  /** Whether to restore focus on unmount */
  enabled?: boolean;
  /** Element to return focus to (defaults to document.activeElement on mount) */
  returnTo?: React.RefObject<HTMLElement>;
}

function useFocusReturn(options?: UseFocusReturnOptions): void;
```

**Behavior**:
- Saves `document.activeElement` on mount
- Restores focus to saved element on unmount
- Respects `enabled` toggle

### 2.2 useAnnounce

**Location**: `src/lib/a11y/useAnnounce.ts`

```typescript
interface UseAnnounceOptions {
  /** Politeness level */
  mode?: 'polite' | 'assertive';
}

function useAnnounce(options?: UseAnnounceOptions): (message: string) => void;
```

**Behavior**:
- Returns function to announce messages to screen readers
- Uses a hidden live region under the hood
- Clears message after delay to avoid re-announcing

### 2.3 useKeyboardShortcut

**Location**: `src/lib/a11y/useKeyboardShortcut.ts`

```typescript
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  handler: (e: KeyboardEvent) => void,
  options?: { enabled?: boolean }
): void;
```

---

## 3. Modified Components

### 3.1 Modal (Enhanced)

**Location**: `src/components/ui/Modal.tsx`

**New Props**:
```typescript
interface ModalProps {
  // ... existing props
  
  /** ID for aria-labelledby (auto-generated if not provided) */
  labelledById?: string;
  /** ID for aria-describedby */
  describedById?: string;
  /** Initial focus target */
  initialFocus?: string | React.RefObject<HTMLElement>;
  /** Whether to return focus on close (default: true) */
  returnFocus?: boolean;
}
```

**New Attributes**:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby={titleId}`

### 3.2 ConfirmModal (Enhanced)

Inherits Modal enhancements plus:
- `aria-describedby` linking to message content
- Autofocus on confirm/cancel button based on variant

### 3.3 Layout (Enhanced)

**Changes**:
- Wrap main content area in `<main id="main-content">`
- Add `<SkipLink targetId="main-content" />` at top
- Ensure sidebar has proper `<nav>` and `<aside>` structure

---

## 4. Component Modifications Summary

| Component | Changes Required |
|-----------|------------------|
| `Modal.tsx` | Add ARIA attrs, FocusTrap, focus return |
| `ConfirmModal.tsx` | Add ARIA attrs, focus management |
| `OnboardingModal.tsx` | Add ARIA attrs, FocusTrap |
| `LossReasonModal.tsx` | Add ARIA attrs, FocusTrap |
| `Layout.tsx` | Add `<main>`, SkipLink |
| `DealCard.tsx` | Add aria-labels to icon buttons |
| `KanbanBoard.tsx` | Add keyboard move option |
| `AudioPlayer.tsx` | Convert clickable div to button |
| `ToastContext.tsx` | Add aria-live region |
| Various icon buttons | Add aria-label attributes |

---

## 5. ARIA Patterns Reference

### 5.1 Modal Pattern

```tsx
<div 
  role="dialog" 
  aria-modal="true" 
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Title</h2>
  <p id="dialog-desc">Description</p>
  {/* content */}
  <button aria-label="Fechar">×</button>
</div>
```

### 5.2 Icon Button Pattern

```tsx
// ❌ Before
<button><X size={20} /></button>

// ✅ After
<button aria-label="Fechar"><X size={20} /></button>
```

### 5.3 Live Region Pattern

```tsx
<div aria-live="polite" aria-atomic="true">
  {notification}
</div>
```

### 5.4 Skip Link Pattern

```tsx
<a href="#main-content" className="skip-link">
  Pular para conteúdo principal
</a>
{/* ... nav ... */}
<main id="main-content" tabIndex={-1}>
  {/* content */}
</main>
```

---

## 6. Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "focus-trap-react": "^10.2.3"
  },
  "devDependencies": {
    "eslint-plugin-jsx-a11y": "^6.8.0",
    "vitest-axe": "^0.1.0"
  }
}
```

### Existing Dependencies (No Changes)

- `@radix-ui/react-popover` - Already accessible
- `@radix-ui/react-tooltip` - Already accessible
- `@testing-library/react` - Has a11y matchers
