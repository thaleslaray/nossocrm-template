# Feature Specification: Accessibility Audit & Remediation

**Feature Branch**: `003-a11y-audit`  
**Created**: 2024-12-04  
**Status**: Draft  
**Input**: User description: "Accessibility audit and remediation for WCAG compliance"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Screen Reader Navigation (Priority: P1)

Um usuário cego utiliza leitor de tela (NVDA, VoiceOver, JAWS) para navegar pelo CRM, criar deals, gerenciar contatos e usar o Kanban board.

**Why this priority**: Leitores de tela são a tecnologia assistiva mais comum. Sem suporte adequado, todo um grupo de usuários fica completamente bloqueado de usar o sistema.

**Independent Test**: Pode ser testado navegando por todas as páginas principais usando VoiceOver (macOS) ou NVDA (Windows) e verificando se todas as funcionalidades são acessíveis e anunciadas corretamente.

**Acceptance Scenarios**:

1. **Given** um usuário com leitor de tela na página de Boards, **When** ele navega pelos cards do Kanban, **Then** cada card é anunciado com título, valor, empresa e status de atividade.
2. **Given** um usuário com leitor de tela em um modal aberto, **When** o modal abre, **Then** o foco move automaticamente para o modal e é anunciado seu título/propósito.
3. **Given** um usuário com leitor de tela, **When** ele interage com formulários, **Then** todos os campos têm labels anunciados, erros são comunicados, e o estado do formulário é claro.

---

### User Story 2 - Keyboard-Only Navigation (Priority: P1)

Um usuário com deficiência motora navega pelo CRM usando apenas teclado (Tab, Shift+Tab, Enter, Escape, Arrow keys).

**Why this priority**: Navegação por teclado é fundamental para usuários com deficiências motoras e também beneficia power users. É pré-requisito para compatibilidade com leitores de tela.

**Independent Test**: Pode ser testado desabilitando o mouse e navegando por todas as páginas usando apenas teclado.

**Acceptance Scenarios**:

1. **Given** um usuário navegando com teclado, **When** ele pressiona Tab através da interface, **Then** o indicador de foco é visível e segue uma ordem lógica.
2. **Given** um usuário em um modal, **When** ele pressiona Escape, **Then** o modal fecha e o foco retorna ao elemento que o abriu.
3. **Given** um usuário no Kanban board, **When** ele usa teclado para mover cards entre colunas, **Then** ele consegue arrastar/soltar deals sem usar mouse.
4. **Given** um usuário em qualquer menu dropdown ou popover, **When** ele navega com teclado, **Then** não fica preso (keyboard trap) e pode sair usando Tab ou Escape.

---

### User Story 3 - Color Contrast & Visual Accessibility (Priority: P2)

Um usuário com baixa visão ou daltonismo utiliza o CRM e consegue distinguir todos os elementos, textos e estados importantes.

**Why this priority**: Problemas de contraste afetam um grande número de usuários (8% dos homens têm algum tipo de daltonismo) e impactam a legibilidade geral do sistema.

**Independent Test**: Pode ser testado usando ferramentas de análise de contraste (axe, Lighthouse) e simuladores de daltonismo.

**Acceptance Scenarios**:

1. **Given** o tema claro ou escuro ativo, **When** textos são exibidos, **Then** todos têm ratio de contraste mínimo de 4.5:1 (WCAG AA).
2. **Given** cards do Kanban com diferentes prioridades, **When** usuário visualiza, **Then** a diferenciação não depende apenas de cor (há ícones ou labels de texto).
3. **Given** estados de erro em formulários, **When** exibidos, **Then** são comunicados por texto e/ou ícone, não apenas cor vermelha.

---

### User Story 4 - Semantic HTML & Document Structure (Priority: P2)

Um usuário com leitor de tela navega rapidamente pelo documento usando atalhos de headings, landmarks e listas.

**Why this priority**: Estrutura semântica permite navegação eficiente e compreensão do layout da página. Beneficia SEO e manutenibilidade do código.

**Independent Test**: Pode ser testado verificando hierarquia de headings (H1→H2→H3), presença de landmarks (nav, main, aside), e uso correto de listas.

**Acceptance Scenarios**:

1. **Given** qualquer página do CRM, **When** usuário lista headings, **Then** há hierarquia lógica sem pular níveis (H1, H2, H3...).
2. **Given** a página de layout principal, **When** analisada, **Then** usa landmarks apropriados: `<nav>`, `<main>`, `<aside>`, `<header>`.
3. **Given** listas de contatos ou deals, **When** renderizadas, **Then** usam elementos `<ul>`/`<ol>`/`<li>` semanticamente corretos.

---

### User Story 5 - Modal & Dialog Accessibility (Priority: P2)

Um usuário interage com modais do sistema (criar deal, editar contato, confirmação) de forma acessível.

**Why this priority**: Modais são usados extensivamente no CRM. Modais inacessíveis bloqueiam funcionalidades críticas.

**Independent Test**: Pode ser testado abrindo cada modal do sistema e verificando foco, escape, e anúncios de tela.

**Acceptance Scenarios**:

1. **Given** um modal é aberto, **When** renderizado, **Then** tem `role="dialog"` e `aria-modal="true"`.
2. **Given** um modal aberto, **When** usuário tenta Tab para fora, **Then** o foco permanece "preso" dentro do modal (focus trap intencional).
3. **Given** um modal com título, **When** aberto, **Then** título está associado via `aria-labelledby`.
4. **Given** um modal fechado, **When** fecha via ESC ou botão, **Then** foco retorna ao elemento que disparou a abertura.

---

### User Story 6 - Form Accessibility (Priority: P2)

Um usuário preenche formulários (criar contato, configurações, login) com feedback claro e labels adequados.

**Why this priority**: Formulários são a principal forma de entrada de dados. Formulários inacessíveis impedem criação de dados no CRM.

**Independent Test**: Pode ser testado navegando por formulários com leitor de tela e verificando anúncios de labels, erros e estados.

**Acceptance Scenarios**:

1. **Given** um campo de formulário, **When** focado, **Then** leitor de tela anuncia label, tipo de campo, e estado (obrigatório/opcional).
2. **Given** um formulário submetido com erros, **When** erros aparecem, **Then** foco move para primeiro erro e mensagem é anunciada.
3. **Given** campos obrigatórios, **When** renderizados, **Then** têm indicação visual E `aria-required="true"`.
4. **Given** grupos de campos relacionados, **When** renderizados, **Then** usam `<fieldset>` e `<legend>` apropriadamente.

---

### Edge Cases

- Como o sistema lida com conteúdo dinâmico do Kanban (drag-and-drop) para usuários de teclado?
- O que acontece quando modais estão aninhados ou múltiplos modais abrem em sequência?
- Como são comunicadas atualizações em tempo real (realtime sync) para leitores de tela?
- Botões com apenas ícone (sem texto visível) têm aria-label adequado?
- Como funcionam os toasts/notificações para leitores de tela?

## Requirements *(mandatory)*

### Functional Requirements

**Navegação por Teclado:**

- **FR-001**: Sistema DEVE permitir navegação completa usando apenas teclado (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys)
- **FR-002**: Sistema DEVE exibir indicador de foco visível em todos os elementos interativos
- **FR-003**: Sistema DEVE seguir ordem de tabulação lógica (top-to-bottom, left-to-right)
- **FR-004**: Sistema DEVE evitar keyboard traps exceto em modais (onde é intencional)

**Leitores de Tela:**

- **FR-005**: Todos os elementos interativos DEVEM ter nome acessível (label, aria-label, ou aria-labelledby)
- **FR-006**: Imagens de conteúdo DEVEM ter alt text descritivo; decorativas DEVEM ter alt=""
- **FR-007**: Atualizações dinâmicas DEVEM usar aria-live regions para anunciar mudanças
- **FR-008**: Estados de componentes (expandido, selecionado, desabilitado) DEVEM ser comunicados via ARIA

**Modais e Diálogos:**

- **FR-009**: Modais DEVEM ter role="dialog" e aria-modal="true"
- **FR-010**: Modais DEVEM implementar focus trap enquanto abertos
- **FR-011**: Foco DEVE mover para o modal quando aberto e retornar ao trigger quando fechado
- **FR-012**: Modais DEVEM ter título associado via aria-labelledby

**Formulários:**

- **FR-013**: Todos os campos DEVEM ter labels programaticamente associados (for/id ou aria-labelledby)
- **FR-014**: Campos obrigatórios DEVEM ter aria-required="true" e indicação visual
- **FR-015**: Mensagens de erro DEVEM ser anunciadas e associadas via aria-describedby
- **FR-016**: Formulários DEVEM ter validação de erro com foco automático no primeiro erro

**Contraste e Cores:**

- **FR-017**: Todo texto normal DEVE ter ratio de contraste ≥4.5:1 (WCAG AA)
- **FR-018**: Texto grande (18pt+) e elementos gráficos DEVEM ter ratio ≥3:1
- **FR-019**: Informações NÃO DEVEM ser comunicadas apenas por cor

**Estrutura Semântica:**

- **FR-020**: Páginas DEVEM usar hierarquia de headings correta (H1 único, H2, H3... sem pular)
- **FR-021**: Layout DEVE usar landmarks semânticos (nav, main, aside, header, footer)
- **FR-022**: Listas de dados DEVEM usar elementos ul/ol/li apropriados
- **FR-023**: Botões DEVEM usar `<button>`, não `<div onClick>`

**Componentes Customizados:**

- **FR-024**: Elementos interativos customizados DEVEM implementar padrões ARIA apropriados
- **FR-025**: Drag-and-drop DEVE ter alternativa de teclado acessível
- **FR-026**: Tooltips e popovers DEVEM ser acessíveis via teclado e anunciados

### Key Entities

- **Componente Acessível**: Um componente React que implementa padrões ARIA, navegação por teclado e é testável por leitores de tela
- **Focus Management**: Sistema de controle de foco para modais, menus e navegação
- **Aria Live Region**: Área que anuncia mudanças dinâmicas para tecnologias assistivas
- **Keyboard Shortcut**: Atalhos de teclado documentados e acessíveis

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das páginas principais passam em auditoria automatizada Lighthouse Accessibility com score ≥90
- **SC-002**: 0 erros críticos reportados por ferramentas axe-core ou similar
- **SC-003**: Usuário consegue completar fluxos principais (criar deal, gerenciar contato, navegar Kanban) usando apenas teclado em menos de 5 minutos
- **SC-004**: Todos os modais implementam focus trap e retorno de foco corretamente (100% compliance)
- **SC-005**: 100% dos campos de formulário têm labels programaticamente associados
- **SC-006**: Ratio de contraste de texto atende WCAG AA (4.5:1) em 100% dos casos
- **SC-007**: Hierarquia de headings correta em 100% das páginas (validado via ferramenta automatizada)
- **SC-008**: Tempo para primeiro elemento interativo após abertura de página < 3 segundos com leitor de tela

## Assumptions

- **A-001**: O padrão de conformidade alvo é WCAG 2.1 Level AA, não AAA
- **A-002**: Tecnologias assistivas principais suportadas: VoiceOver (macOS/iOS), NVDA (Windows), TalkBack (Android)
- **A-003**: Drag-and-drop no Kanban terá alternativa de botões/menus, não suporte nativo a11y de DnD
- **A-004**: Correções serão implementadas em componentes React existentes, sem redesign completo
- **A-005**: Focus visible usará estilos Tailwind existentes (ring-*) padronizados globalmente
- **A-006**: Teste automatizado será adicionado ao CI/CD (eslint-plugin-jsx-a11y, axe)
- **A-007**: Animações respeitarão `prefers-reduced-motion` para usuários sensíveis

## Out of Scope

- Conformidade WCAG 2.1 Level AAA (apenas AA)
- Testes com usuários reais com deficiências (apenas testes técnicos/automatizados)
- Suporte a dispositivos assistivos especializados (switch devices, eye tracking)
- Tradução para LIBRAS (Língua Brasileira de Sinais)
- Personalização de tamanho de fonte pelo usuário (zoom do navegador é suficiente)
- Audio descriptions para conteúdo de vídeo (não há vídeos no CRM atualmente)
