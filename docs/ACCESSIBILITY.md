# Accessibility Guidelines - NossoCRM

Este documento descreve as práticas de acessibilidade implementadas no NossoCRM para conformidade com WCAG 2.1 Level AA.

## Visão Geral

O NossoCRM foi auditado e remediado para atender aos seguintes critérios:

- **WCAG 2.1 Level A e AA** (conformidade parcial)
- **Navegação por teclado completa**
- **Suporte a leitores de tela** (VoiceOver, NVDA)
- **Contraste de cores adequado** (≥ 4.5:1 para texto)

## Estrutura de Acessibilidade

### Biblioteca A11y (`src/lib/a11y/`)

Componentes e hooks reutilizáveis para acessibilidade:

```
src/lib/a11y/
├── components/
│   ├── FocusTrap.tsx        # Wrapper para focus-trap-react
│   ├── VisuallyHidden.tsx   # Texto oculto visualmente, visível para SR
│   ├── SkipLink.tsx         # Link para pular navegação
│   └── LiveRegion.tsx       # Anúncios para screen readers
├── hooks/
│   ├── useFocusReturn.ts    # Retorno de foco ao fechar modal
│   ├── useAnnounce.ts       # Anunciar mensagens via aria-live
│   ├── useKeyboardShortcut.ts # Atalhos de teclado
│   └── useFormErrorFocus.ts # Foco em erros de formulário
├── test/
│   └── a11y-utils.ts        # Utilitários de teste com axe-core
└── index.ts                 # Barrel export
```

## Padrões de Implementação

### 1. Modais Acessíveis

Todo modal deve incluir:

```tsx
import { FocusTrap, useFocusReturn } from '@/lib/a11y';

function MyModal({ isOpen, onClose }) {
  const triggerRef = useFocusReturn(isOpen);
  
  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title">Título do Modal</h2>
        {/* conteúdo */}
      </div>
    </FocusTrap>
  );
}
```

**Checklist:**
- [ ] `role="dialog"` e `aria-modal="true"`
- [ ] `aria-labelledby` apontando para título
- [ ] FocusTrap ativo quando modal aberto
- [ ] Escape fecha o modal
- [ ] Foco retorna ao elemento que abriu

### 2. Formulários Acessíveis

```tsx
import { FormField } from '@/components/ui/FormField';

// FormField automaticamente adiciona ARIA attributes
<FormField label="Email" required error={errors.email}>
  <input type="email" />
</FormField>
```

**Implementado automaticamente:**
- `aria-required` para campos obrigatórios
- `aria-invalid` quando há erro
- `aria-describedby` linking erro/hint ao campo
- Mensagens de erro com `role="alert"`

### 3. Botões com Ícones

Botões que contêm apenas ícones DEVEM ter `aria-label`:

```tsx
// ✓ Correto
<button aria-label="Fechar modal">
  <XIcon />
</button>

// ✗ Incorreto
<button>
  <XIcon />
</button>
```

### 4. Landmarks e Estrutura

O Layout inclui:

- `<header>` com logo e controles
- `<nav aria-label="Menu principal">` na sidebar
- `<main id="main-content">` para conteúdo
- `<SkipLink />` no topo para pular navegação

### 5. Hierarquia de Headings

Cada página deve seguir hierarquia correta:

```tsx
// ✓ Correto
<h1>Dashboard</h1>
  <h2>Resumo de Vendas</h2>
    <h3>Este Mês</h3>
  <h2>Atividades Recentes</h2>

// ✗ Incorreto
<h1>Dashboard</h1>
  <h3>Resumo de Vendas</h3>  // Pulou h2
```

## Testes de Acessibilidade

### Testes Automatizados (axe-core)

```tsx
import { expectNoA11yViolations } from '@/lib/a11y/test/a11y-utils';

it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  await expectNoA11yViolations(container);
});
```

### ESLint Plugin

O projeto inclui `eslint-plugin-jsx-a11y` configurado em `eslint.config.js`:

```bash
npm run lint        # Lint completo
npm run lint:a11y   # Apenas regras de acessibilidade
```

### Testes Manuais (Recomendados)

1. **Navegação por teclado**: Tab através de toda a página
2. **VoiceOver (Mac)**: Cmd+F5 para ativar
3. **NVDA (Windows)**: Testar fluxos principais
4. **Lighthouse**: DevTools > Lighthouse > Accessibility

## Critérios WCAG Atendidos

### Nível A

| Critério | Status | Notas |
|----------|--------|-------|
| 1.1.1 Non-text Content | ✅ | Alt text em imagens |
| 1.3.1 Info and Relationships | ✅ | Labels em forms, landmarks |
| 1.3.2 Meaningful Sequence | ✅ | DOM order = visual order |
| 2.1.1 Keyboard | ✅ | Todos elementos focáveis |
| 2.1.2 No Keyboard Trap | ✅ | Escape fecha modais |
| 2.4.1 Bypass Blocks | ✅ | Skip link implementado |
| 2.4.2 Page Titled | ✅ | Títulos descritivos |
| 4.1.1 Parsing | ✅ | HTML válido |
| 4.1.2 Name, Role, Value | ✅ | ARIA em widgets |

### Nível AA

| Critério | Status | Notas |
|----------|--------|-------|
| 1.4.3 Contrast (Minimum) | ✅ | 4.5:1 para texto |
| 1.4.4 Resize Text | ✅ | Funciona até 200% |
| 2.4.6 Headings and Labels | ✅ | Headings descritivos |
| 2.4.7 Focus Visible | ✅ | Focus ring de alto contraste |
| 3.2.3 Consistent Navigation | ✅ | Menu consistente |
| 3.2.4 Consistent Identification | ✅ | Componentes consistentes |

## Recursos

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/)

## Suporte

Para reportar problemas de acessibilidade:
1. Abra uma issue com label "accessibility"
2. Descreva o problema e como reproduzir
3. Inclua tecnologia assistiva usada (ex: VoiceOver 14.5)
