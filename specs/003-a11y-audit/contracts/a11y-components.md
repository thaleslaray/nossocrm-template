# Accessibility Component Contracts

**Feature**: 003-a11y-audit  
**Date**: 2024-12-04

## 1. FocusTrap Contract

### Interface

```typescript
// src/components/ui/FocusTrap.tsx
import FocusTrap from 'focus-trap-react';

interface FocusTrapWrapperProps {
  active: boolean;
  children: React.ReactNode;
  onEscape?: () => void;
  initialFocus?: string | false;
  returnFocus?: boolean;
}

export const FocusTrapWrapper: React.FC<FocusTrapWrapperProps>;
```

### Usage Contract

```tsx
// ✅ Correct usage
<FocusTrapWrapper 
  active={isOpen} 
  onEscape={handleClose}
  returnFocus={true}
>
  <div>Modal content with focusable elements</div>
</FocusTrapWrapper>

// ❌ Invalid - must have focusable children when active
<FocusTrapWrapper active={true}>
  <div>Text only, no buttons</div>
</FocusTrapWrapper>
```

### Test Contract

```typescript
describe('FocusTrap', () => {
  it('traps focus within children when active', async () => {
    render(
      <FocusTrapWrapper active={true}>
        <button>First</button>
        <button>Second</button>
      </FocusTrapWrapper>
    );
    
    await userEvent.tab();
    expect(screen.getByText('First')).toHaveFocus();
    
    await userEvent.tab();
    expect(screen.getByText('Second')).toHaveFocus();
    
    await userEvent.tab();
    expect(screen.getByText('First')).toHaveFocus(); // cycles
  });

  it('calls onEscape when Escape pressed', async () => {
    const onEscape = vi.fn();
    render(
      <FocusTrapWrapper active={true} onEscape={onEscape}>
        <button>Button</button>
      </FocusTrapWrapper>
    );
    
    await userEvent.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalled();
  });
});
```

---

## 2. Modal Contract (Enhanced)

### Interface

```typescript
// src/components/ui/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  // New a11y props
  initialFocus?: string | React.RefObject<HTMLElement>;
  returnFocus?: boolean;
}
```

### ARIA Contract

Modal MUST have these attributes when rendered:

| Attribute | Value | Required |
|-----------|-------|----------|
| `role` | `"dialog"` | ✅ Yes |
| `aria-modal` | `"true"` | ✅ Yes |
| `aria-labelledby` | ID of title element | ✅ Yes |

### Behavior Contract

1. **Focus Management**
   - On open: Focus moves to first focusable element inside modal
   - Tab cycling: Focus stays within modal (trapped)
   - On close: Focus returns to element that triggered modal
   - Escape key: Closes modal

2. **Backdrop Behavior**
   - Click on backdrop: Closes modal
   - Backdrop is not focusable (no tab stop)

### Test Contract

```typescript
describe('Modal accessibility', () => {
  it('has correct ARIA attributes', () => {
    render(<Modal isOpen title="Test Modal" onClose={() => {}}>
      <p>Content</p>
    </Modal>);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Test Modal');
  });

  it('returns focus to trigger on close', async () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    const { rerender } = render(
      <>
        <button ref={triggerRef}>Open</button>
        <Modal isOpen={true} title="Test" onClose={() => {}}>
          <button>Inside</button>
        </Modal>
      </>
    );
    
    // Simulate closing
    rerender(
      <>
        <button ref={triggerRef}>Open</button>
        <Modal isOpen={false} title="Test" onClose={() => {}}>
          <button>Inside</button>
        </Modal>
      </>
    );
    
    expect(triggerRef.current).toHaveFocus();
  });
});
```

---

## 3. VisuallyHidden Contract

### Interface

```typescript
// src/components/ui/VisuallyHidden.tsx
interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps>;
```

### Visual Contract

- Element is NOT visible on screen
- Element IS readable by screen readers
- Element does NOT affect layout

### Test Contract

```typescript
describe('VisuallyHidden', () => {
  it('renders content accessible to screen readers', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);
    expect(screen.getByText('Hidden text')).toBeInTheDocument();
  });

  it('applies visually-hidden styles', () => {
    render(<VisuallyHidden>Hidden</VisuallyHidden>);
    const el = screen.getByText('Hidden');
    expect(el).toHaveClass('visually-hidden');
  });
});
```

---

## 4. SkipLink Contract

### Interface

```typescript
// src/components/ui/SkipLink.tsx
interface SkipLinkProps {
  targetId: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps>;
```

### Behavior Contract

1. Hidden when not focused
2. Visible when focused (fixed position, top-left)
3. On click/Enter: focuses target element
4. Target element must have `tabIndex={-1}` to receive focus

### Visual Contract

```css
/* Hidden state */
.skip-link {
  position: absolute;
  left: -9999px;
}

/* Focused state */
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  z-index: 9999;
}
```

### Test Contract

```typescript
describe('SkipLink', () => {
  it('focuses target element on activation', async () => {
    render(
      <>
        <SkipLink targetId="main" />
        <main id="main" tabIndex={-1}>Content</main>
      </>
    );
    
    const link = screen.getByText('Pular para conteúdo principal');
    await userEvent.click(link);
    
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
```

---

## 5. Icon Button Contract

### Pattern

All icon-only buttons MUST have `aria-label`:

```tsx
// ❌ Invalid
<button onClick={onClose}>
  <X size={20} />
</button>

// ✅ Valid
<button onClick={onClose} aria-label="Fechar">
  <X size={20} />
</button>

// ✅ Also valid - with VisuallyHidden
<button onClick={onClose}>
  <X size={20} aria-hidden="true" />
  <VisuallyHidden>Fechar</VisuallyHidden>
</button>
```

### Standard Labels (Portuguese)

| Icon | aria-label |
|------|------------|
| X (close) | "Fechar" |
| Settings/Cog | "Configurações" |
| Menu/Dots | "Menu de opções" |
| Edit/Pencil | "Editar" |
| Delete/Trash | "Excluir" |
| Add/Plus | "Adicionar" |
| Search | "Buscar" |
| Sun/Moon | "Alternar tema" |
| Bell | "Notificações" |

---

## 6. useFocusReturn Contract

### Interface

```typescript
// src/lib/a11y/useFocusReturn.ts
interface UseFocusReturnOptions {
  enabled?: boolean;
  returnTo?: React.RefObject<HTMLElement>;
}

function useFocusReturn(options?: UseFocusReturnOptions): void;
```

### Behavior Contract

1. On mount: saves `document.activeElement`
2. On unmount (if enabled): restores focus to saved element
3. If `returnTo` provided: uses that instead of saved element

### Test Contract

```typescript
describe('useFocusReturn', () => {
  it('returns focus to previously focused element on unmount', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    
    const TestComponent = () => {
      useFocusReturn();
      return <button>Inside</button>;
    };
    
    const { unmount } = render(<TestComponent />);
    
    screen.getByText('Inside').focus();
    expect(document.activeElement).not.toBe(trigger);
    
    unmount();
    expect(document.activeElement).toBe(trigger);
    
    document.body.removeChild(trigger);
  });
});
```

---

## 7. ESLint a11y Rules Contract

### Required Rules (Error Level)

```javascript
// .eslintrc.js or eslint.config.js
{
  plugins: ['jsx-a11y'],
  rules: {
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
  }
}
```

### Recommended Rules (Warning Level)

```javascript
{
  rules: {
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/heading-has-content': 'warn',
    'jsx-a11y/label-has-associated-control': 'warn',
  }
}
```
