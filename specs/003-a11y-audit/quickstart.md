# Quickstart: Accessibility Remediation

**Feature**: 003-a11y-audit  
**Date**: 2024-12-04

## Prerequisites

```bash
# Install new dependencies
npm install focus-trap-react
npm install -D eslint-plugin-jsx-a11y vitest-axe
```

## Quick Wins (5 minutes each)

### 1. Add aria-label to close buttons

```tsx
// Find all icon-only close buttons and add aria-label
// Before:
<button onClick={onClose}>
  <X size={20} />
</button>

// After:
<button onClick={onClose} aria-label="Fechar">
  <X size={20} />
</button>
```

**Files to check**: `Modal.tsx`, `ConfirmModal.tsx`, `OnboardingModal.tsx`

### 2. Add role="dialog" to modals

```tsx
// Before (Modal.tsx):
<div className="fixed inset-0 z-50...">
  <div className="bg-white...">

// After:
<div className="fixed inset-0 z-50..." role="dialog" aria-modal="true" aria-labelledby={titleId}>
  <div className="bg-white...">
    <h2 id={titleId}>{title}</h2>
```

### 3. Add main landmark

```tsx
// Layout.tsx - wrap content area
<main id="main-content" className="flex-1 overflow-y-auto">
  {children}
</main>
```

## Testing Your Changes

### Manual Test Checklist

- [ ] Tab through entire page - can you reach all interactive elements?
- [ ] Is focus indicator visible on each element?
- [ ] Press Escape on open modal - does it close?
- [ ] After modal closes - is focus back on trigger button?
- [ ] Turn on VoiceOver/NVDA - are modals announced as "dialog"?

### Automated Test

```typescript
// Add to any component test
import { axe, toHaveNoViolations } from 'vitest-axe';
expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Lighthouse Quick Check

1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Check only "Accessibility"
4. Click "Analyze page load"
5. Target: Score ≥ 90

## Component Patterns

### Accessible Modal Template

```tsx
import { useId, useRef, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';

export const AccessibleModal = ({ isOpen, onClose, title, children }) => {
  const titleId = useId();
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg p-6">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          {children}
          <button onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
      </div>
    </FocusTrap>
  );
};
```

### Icon Button Pattern

```tsx
// Create a reusable component
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

export const IconButton = ({ icon, label, ...props }: IconButtonProps) => (
  <button aria-label={label} {...props}>
    {icon}
  </button>
);

// Usage
<IconButton icon={<X size={20} />} label="Fechar" onClick={onClose} />
```

### Skip Link Pattern

```tsx
// Add at very top of Layout.tsx
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:p-2 focus:rounded"
>
  Pular para conteúdo principal
</a>

// Ensure main content has id and tabIndex
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

## Common Fixes Reference

| Issue | Fix |
|-------|-----|
| Missing button label | Add `aria-label="Description"` |
| Div with onClick | Change to `<button>` or add `role="button" tabIndex={0} onKeyDown` |
| Modal without role | Add `role="dialog" aria-modal="true"` |
| Focus escapes modal | Wrap content with `<FocusTrap>` |
| Form field no label | Add `<label htmlFor="id">` or `aria-label` |
| Image no alt | Add `alt="description"` or `alt=""` for decorative |
| Color-only info | Add icon or text alongside color |
| No skip link | Add `<a href="#main-content">` at top |

## Debug Tips

### Check Focus Order

```javascript
// Paste in browser console
document.addEventListener('focusin', e => console.log('Focus:', e.target));
```

### Check ARIA Attributes

```javascript
// Paste in browser console
document.querySelectorAll('[role="dialog"]').forEach(el => {
  console.log('Dialog:', el);
  console.log('aria-modal:', el.getAttribute('aria-modal'));
  console.log('aria-labelledby:', el.getAttribute('aria-labelledby'));
});
```

### VoiceOver Quick Commands (macOS)

| Action | Keys |
|--------|------|
| Turn on/off | Cmd + F5 |
| Read next | VO + Right Arrow |
| Read previous | VO + Left Arrow |
| Interact | VO + Shift + Down Arrow |
| Stop interaction | VO + Shift + Up Arrow |
| List headings | VO + U, then H |
| List landmarks | VO + U, then L |

(VO = Control + Option)
