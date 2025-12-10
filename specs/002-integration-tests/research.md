# Research: Testes de Integração para NossoCRM

**Date**: 2025-12-03  
**Status**: Complete

## Research Tasks

### 1. Padrão de Testes de Integração para React + Vitest

**Decision**: Usar React Testing Library com `userEvent` para simular interações reais de usuário

**Rationale**: 
- RTL já está configurado no projeto (`@testing-library/react`)
- `userEvent` simula interações reais (click, type, keyboard) vs `fireEvent`
- `waitFor` e `findBy*` lidam bem com async/mutations do TanStack Query

**Alternatives Rejected**:
- Playwright/Puppeteer: Overhead de browser real, mais lento, já temos para E2E
- Enzyme: Deprecated, não suporta React 19
- Testing Library puro sem userEvent: Menos realista para UX testing

### 2. Estratégia de Mock para Supabase

**Decision**: Mockar no nível de `lib/supabase/*.ts` services, não no cliente HTTP

**Rationale**:
- Já existe `src/test/__mocks__/supabase.ts` com mocks dos services
- Mockar services é mais estável (interface interna) vs HTTP (detalhes)
- Permite controlar retornos específicos por teste com `mockResolvedValueOnce`

**Alternatives Rejected**:
- MSW (Mock Service Worker): Adiciona dependência, overkill para nosso caso
- Mockar fetch global: Frágil, muito baixo nível
- Supabase local via Docker: Lento, complexidade de setup

**Validation Strategy**: Cada mock inclui validação inline de tipos usando TypeScript satisfies para garantir estrutura correta.

### 3. Estratégia de Mock para IA (Gemini/OpenAI/Anthropic)

**Decision**: Mockar `services/geminiService.ts` inteiro com respostas predefinidas

**Rationale**:
- Evita custos de API em testes
- Respostas determinísticas (sempre iguais)
- Permite testar cenários de erro/timeout facilmente

**Mock Structure**:
```typescript
// src/test/integration/mock-ai.ts
export const mockGenerateBoardStructure = vi.fn().mockResolvedValue({
  boardName: 'Pipeline de Vendas',
  description: 'Board gerado para cursos online',
  stages: [
    { name: 'Leads', color: 'bg-blue-500', description: 'Novos interessados' },
    { name: 'Qualificação', color: 'bg-yellow-500', description: 'Em análise' },
    { name: 'Proposta', color: 'bg-orange-500', description: 'Negociação' },
    { name: 'Fechamento', color: 'bg-green-500', description: 'Conclusão' },
  ],
  automationSuggestions: ['Email automático ao entrar', 'Lembrete em 3 dias'],
});
```

### 4. Padrão de Fixtures para Dados de Teste

**Decision**: Criar factory functions que geram dados com Faker.js

**Rationale**:
- Dados únicos por teste evitam colisões
- Factories permitem override de campos específicos
- Faker já está instalado (`@faker-js/faker`)

**Structure**:
```typescript
// src/test/fixtures/contacts.ts
import { faker } from '@faker-js/faker';

export const createContact = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  lifecycleStage: 'LEAD',
  company_id: 'test-company-id',
  created_at: faker.date.recent().toISOString(),
  ...overrides,
});

export const createContacts = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createContact(overrides));
```

### 5. Organização de Testes por Jornada

**Decision**: Um arquivo `.journey.test.tsx` por feature/página

**Rationale**:
- Separa testes de integração (jornadas) de testes unitários
- Fácil identificar qual página está testada
- Permite rodar só jornadas com `vitest --grep journey`

**Naming Convention**:
```
src/features/inbox/__tests__/inbox.journey.test.tsx
src/features/boards/__tests__/boards.journey.test.tsx
```

### 6. Setup de TanStack Query para Testes

**Decision**: QueryClient fresh por teste com retry=false

**Rationale**:
- Evita estado compartilhado entre testes
- Retry false evita flakiness por retentativas
- gcTime=0 e staleTime=0 garantem dados fresh

**Implementation** (já existe em test-utils.tsx):
```typescript
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
```

### 7. Tratamento de Async/Loading States

**Decision**: Usar `waitFor` + `findBy*` para aguardar estados async

**Rationale**:
- TanStack Query é async por natureza
- `findBy*` automaticamente aguarda até timeout
- `waitFor` para assertions complexas

**Pattern**:
```typescript
// Aguarda loading terminar
await waitFor(() => {
  expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
});

// Verifica elemento que aparece após query
const card = await screen.findByText('Deal ABC');
expect(card).toBeInTheDocument();
```

### 8. Simulação de Drag & Drop

**Decision**: Usar `fireEvent.dragStart/drop` com dataTransfer mockado

**Rationale**:
- happy-dom suporta eventos de drag básicos
- Kanban usa `e.dataTransfer.getData/setData`
- Mais simples que usar bibliotecas de DnD testing

**Pattern**:
```typescript
const dealCard = screen.getByTestId('deal-card-123');
const targetColumn = screen.getByTestId('column-em-negociacao');

fireEvent.dragStart(dealCard, {
  dataTransfer: { setData: vi.fn(), getData: () => '123' }
});
fireEvent.drop(targetColumn, {
  dataTransfer: { getData: () => '123' }
});

await waitFor(() => {
  expect(mockUpdateDealStatus).toHaveBeenCalledWith('123', 'em-negociacao');
});
```

## Key Patterns Identified

### Journey Test Structure
```typescript
describe('Inbox Journey', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Setup initial state via mock returns
    mockActivitiesService.getAll.mockResolvedValue({ data: fixtures, error: null });
  });

  describe('User Story 1: Resolver Tarefas do Dia', () => {
    it('exibe atividades atrasadas em vermelho', async () => {...});
    it('completa atividade e remove da lista', async () => {...});
    it('adia atividade para amanhã', async () => {...});
  });
});
```

### Error Scenario Testing
```typescript
it('mostra erro quando Supabase falha', async () => {
  mockActivitiesService.getAll.mockRejectedValueOnce(new Error('Network error'));
  
  render(<InboxPage />);
  
  await waitFor(() => {
    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });
});
```

## Unresolved Questions

Nenhum - todas as decisões técnicas foram tomadas baseadas na stack existente.

### Decisões de Edge Cases

- **Conflito de edição**: Último ganha (optimistic concurrency) - padrão do Supabase
- **Performance 500+ deals**: Fora do escopo de testes de integração - testar em E2E/benchmark
- **Dados órfãos**: Validar no save com erro amigável se FK não existe

## Next Steps

1. Criar estrutura de fixtures em `src/test/fixtures/`
2. Criar helpers de integração em `src/test/integration/`
3. Implementar testes por jornada começando pelas P1
