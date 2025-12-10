# Quickstart: Testes de Integração de Jornadas

## TL;DR - Criar um Novo Teste de Jornada

```bash
# 1. Criar arquivo na estrutura correta
touch src/features/<domain>/journeys/<action>.integration.test.tsx

# 2. Usar template abaixo

# 3. Rodar testes
npm test -- --grep "Jornada: <nome>"
```

## Template Mínimo

```typescript
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContact } from '@/test/fixtures/contacts';
import { contactsService } from '@/test/__mocks__/supabase';
import { ContactsPage } from '../ContactsPage';

describe('Jornada: [Nome]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contactsService.getAll.mockResolvedValue({ data: [], error: null });
  });

  it('faz X quando Y', async () => {
    const user = userEvent.setup();
    render(<ContactsPage />);
    
    await user.click(screen.getByRole('button', { name: /ação/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/resultado/i)).toBeInTheDocument();
    });
  });
});
```

## Fixtures Disponíveis

```typescript
// Contatos
import { createContact, createContacts, createLeadContact } from '@/test/fixtures/contacts';

// Deals
import { createDeal, createDealView, createWonDeal, createRottingDeal } from '@/test/fixtures/deals';

// Atividades
import { createActivity, createOverdueActivity, createTodayMeeting } from '@/test/fixtures/activities';

// Boards
import { createBoard, createBoardWithStages, createSalesBoard } from '@/test/fixtures/boards';

// IA
import { createAISuggestion, createDecision } from '@/test/fixtures/ai';

// Cenários completos
import { inboxScenario, dashboardScenario, kanbanScenario } from '@/test/fixtures/scenarios';
```

## Mocks de Serviço

```typescript
import { 
  contactsService,
  boardsService, 
  dealsService,
  activitiesService,
  settingsService,
  aiService,           // Novo
  suggestionsService,  // Novo
  decisionsService,    // Novo
  reportsService,      // Novo
} from '@/test/__mocks__/supabase';

// Setup de cenário
beforeEach(() => {
  const { overdueActivities, suggestions } = inboxScenario();
  
  activitiesService.getAll.mockResolvedValue({ 
    data: overdueActivities, 
    error: null 
  });
  
  suggestionsService.getAll.mockResolvedValue({ 
    data: suggestions, 
    error: null 
  });
});
```

## Queries de Elementos

```typescript
// Por texto
screen.getByText('João Silva')
screen.getByText(/criar contato/i)  // regex case-insensitive

// Por role (preferido para acessibilidade)
screen.getByRole('button', { name: /salvar/i })
screen.getByRole('dialog')
screen.getByRole('row')
screen.getByRole('textbox', { name: /nome/i })

// Por label (para forms)
screen.getByLabelText(/email/i)

// Por test-id (último recurso)
screen.getByTestId('loading-spinner')
```

## Interações

```typescript
const user = userEvent.setup();

// Click
await user.click(element);

// Type
await user.type(input, 'texto');

// Clear e type
await user.clear(input);
await user.type(input, 'novo texto');

// Select
await user.selectOptions(select, 'option-value');

// Hover
await user.hover(element);

// Drag & Drop (para Kanban)
// Use @hello-pangea/dnd testing utils
```

## Assertions Assíncronas

```typescript
// Esperar elemento aparecer
await waitFor(() => {
  expect(screen.getByText('Sucesso')).toBeInTheDocument();
});

// Esperar elemento desaparecer
await waitFor(() => {
  expect(screen.queryByText('Carregando')).not.toBeInTheDocument();
});

// Verificar chamada de mock
await waitFor(() => {
  expect(contactsService.create).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'João' })
  );
});
```

## Debug

```typescript
// Ver HTML renderizado
screen.debug();

// Ver elemento específico
screen.debug(screen.getByRole('dialog'));

// Log queries disponíveis
screen.logTestingPlaygroundURL();
```

## Rodar Testes

```bash
# Todos os testes de integração
npm test -- --grep ".integration.test"

# Uma feature específica
npm test -- src/features/contacts/journeys/

# Um arquivo específico
npm test -- gerenciar-contatos.integration.test.tsx

# Watch mode
npm test -- --watch

# Com coverage
npm run test:coverage -- --grep ".integration.test"
```

## Checklist de Qualidade

- [ ] Teste roda em < 500ms
- [ ] Não depende de outros testes
- [ ] Usa fixtures (não hardcoded data)
- [ ] Testa comportamento (não implementação)
- [ ] Cobre happy path + pelo menos 1 erro
- [ ] Usa `waitFor` para async
- [ ] Nome descreve o que testa

## Links Úteis

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [User Event Docs](https://testing-library.com/docs/user-event/intro)
