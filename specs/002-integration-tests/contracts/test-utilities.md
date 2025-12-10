# Contract: Test Utilities

**Version**: 1.0.0  
**Status**: Draft

## Overview

Define a interface do utilitário `renderWithController` - a abstração principal para testes de integração de jornadas.

## Interface Principal

```typescript
// src/test/integration-utils.ts

interface RenderWithControllerOptions<TController> {
  /**
   * O hook controller a ser testado
   * Ex: useContactsController, useBoardsController
   */
  controllerHook: () => TController;
  
  /**
   * Componente wrapper opcional que recebe o controller
   * Se não fornecido, retorna apenas o result do hook
   */
  Wrapper?: React.ComponentType<TController>;
  
  /**
   * Rota inicial para MemoryRouter
   * @default '/'
   */
  initialRoute?: string;
  
  /**
   * Routes adicionais para navegação
   */
  routes?: Array<{ path: string; element: React.ReactNode }>;
  
  /**
   * Override do perfil do usuário logado
   */
  userProfile?: Partial<Profile>;
  
  /**
   * Estado inicial do QueryClient
   * Pré-popula o cache antes do render
   */
  queryData?: Record<string, unknown>;
}

interface RenderWithControllerResult<TController> {
  /**
   * Resultado do renderHook para o controller
   */
  controller: RenderHookResult<TController>;
  
  /**
   * Utilitários padrão do @testing-library
   */
  ...screen;
  
  /**
   * Referência ao queryClient para manipulação direta
   */
  queryClient: QueryClient;
  
  /**
   * Navegar para outra rota
   */
  navigate: (to: string) => void;
  
  /**
   * Aguardar loading terminar
   */
  waitForLoad: () => Promise<void>;
  
  /**
   * Re-render com novas props (se usando Wrapper)
   */
  rerender: (newProps?: Partial<TController>) => void;
  
  /**
   * Simular evento de realtime do Supabase
   */
  simulateRealtimeEvent: (table: string, event: 'INSERT' | 'UPDATE' | 'DELETE', payload: unknown) => void;
}

function renderWithController<TController>(
  options: RenderWithControllerOptions<TController>
): RenderWithControllerResult<TController>;
```

## Uso Esperado

### Testar Hook Controller Diretamente

```typescript
import { renderWithController } from '@/test/integration-utils';
import { useContactsController } from '@/features/contacts/hooks/useContactsController';

test('cria contato com sucesso', async () => {
  const { controller, waitForLoad } = renderWithController({
    controllerHook: useContactsController,
  });
  
  await waitForLoad();
  
  // Act
  await act(async () => {
    controller.result.current.handleCreate({
      name: 'João Silva',
      email: 'joao@email.com',
    });
  });
  
  // Assert
  await waitFor(() => {
    expect(controller.result.current.contacts).toHaveLength(1);
  });
});
```

### Testar Página Completa

```typescript
import { render, screen } from '@/test/test-utils';
import { ContactsPage } from '@/features/contacts/ContactsPage';

test('exibe lista de contatos', async () => {
  // Setup mocks
  contactsService.getAll.mockResolvedValue({
    data: createContacts(3),
    error: null,
  });
  
  render(<ContactsPage />);
  
  await waitFor(() => {
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});
```

### Testar Fluxo com Navegação

```typescript
test('converte contato para deal e navega para boards', async () => {
  const contact = createContact({ name: 'Maria' });
  const board = createSalesBoard();
  
  contactsService.getAll.mockResolvedValue({ data: [contact], error: null });
  boardsService.getAll.mockResolvedValue({ data: [board], error: null });
  dealsService.create.mockResolvedValue({ data: createDeal(), error: null });
  
  const { navigate } = renderWithController({
    controllerHook: useContactsController,
    Wrapper: ContactsPage,
    routes: [
      { path: '/boards', element: <BoardsPage /> },
    ],
  });
  
  // Selecionar contato e converter
  await userEvent.click(screen.getByText('Maria'));
  await userEvent.click(screen.getByText('Converter para Deal'));
  
  // Preencher modal
  await userEvent.type(screen.getByLabelText('Título'), 'Projeto Maria');
  await userEvent.click(screen.getByText('Criar'));
  
  // Verificar navegação
  await waitFor(() => {
    expect(screen.getByText('Projeto Maria')).toBeInTheDocument();
  });
});
```

## Helpers Adicionais

### waitForLoad

```typescript
/**
 * Aguarda todos os states de loading finalizarem
 * Verifica: isLoading, isFetching, isPending no QueryClient
 */
async function waitForLoad(): Promise<void>;
```

### simulateRealtimeEvent

```typescript
/**
 * Dispara evento como se viesse do Supabase Realtime
 * Útil para testar sincronização em tempo real
 */
function simulateRealtimeEvent(
  table: 'contacts' | 'deals' | 'activities' | 'boards',
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
): void;
```

### mockCurrentDate

```typescript
/**
 * Mock da data atual para testes time-sensitive
 * Ex: atividades vencidas, aniversários, deals estagnados
 */
function mockCurrentDate(date: Date): () => void;  // retorna cleanup fn
```

## Constraints

1. **Isolation**: Cada teste deve ter QueryClient isolado (já garantido por test-utils)
2. **No Real Network**: Todas as chamadas de rede devem ser mockadas
3. **Deterministic**: Fixtures com valores fixos, não aleatórios em testes
4. **Fast**: Cada teste < 500ms
