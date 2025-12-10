# Contract: Mock Services

**Version**: 1.0.0  
**Status**: Draft

## Overview

Define a interface expandida dos mocks de serviço Supabase para suportar testes de integração de jornadas.

## Base: Mock Existente

O mock atual em `src/test/__mocks__/supabase.ts` já cobre:

- `authService` - signIn, signUp, signOut, getSession, getCurrentUser
- `contactsService` - CRUD completo
- `boardsService` - CRUD + stages
- `dealsService` - CRUD + movimentação
- `activitiesService` - CRUD
- `settingsService` - CRUD
- `lifecycleStagesService` - CRUD
- `companiesService` - CRUD

## Expansões Necessárias

### AI Service Mock

```typescript
// Adicionar ao mock existente
export const aiService = {
  /**
   * Chat com IA - retorna stream de mensagens
   */
  chat: vi.fn().mockResolvedValue({
    data: { 
      message: 'Resposta da IA',
      suggestions: [],
    },
    error: null,
  }),
  
  /**
   * Análise de lead
   */
  analyzeLead: vi.fn().mockResolvedValue({
    data: {
      score: 85,
      recommendation: 'Qualificado para proposta',
      signals: ['Alto engajamento', 'Budget definido'],
    },
    error: null,
  }),
  
  /**
   * Parse de texto não estruturado
   */
  parseLeadFromText: vi.fn().mockResolvedValue({
    data: {
      name: 'João da Silva',
      email: 'joao@empresa.com',
      phone: '(11) 99999-0000',
      company: 'Empresa LTDA',
    },
    error: null,
  }),
  
  /**
   * Gerar mensagem de resgate
   */
  generateRescueMessage: vi.fn().mockResolvedValue({
    data: { message: 'Mensagem de resgate gerada' },
    error: null,
  }),
  
  /**
   * Transcrição de áudio
   */
  processAudioNote: vi.fn().mockResolvedValue({
    data: { transcription: 'Texto transcrito do áudio' },
    error: null,
  }),
};
```

### Suggestions Service Mock

```typescript
export const suggestionsService = {
  /**
   * Busca sugestões da IA para o Inbox
   */
  getAll: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
  
  /**
   * Marca sugestão como processada
   */
  dismiss: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  
  /**
   * Executa ação da sugestão
   */
  execute: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
};
```

### Decisions Service Mock

```typescript
export const decisionsService = {
  /**
   * Busca decisões pendentes
   */
  getAll: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
  
  /**
   * Aprova decisão
   */
  approve: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  
  /**
   * Rejeita decisão
   */
  reject: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  
  /**
   * Adia decisão
   */
  snooze: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
};
```

### Reports Service Mock

```typescript
export const reportsService = {
  /**
   * Métricas do dashboard
   */
  getDashboardMetrics: vi.fn().mockResolvedValue({
    data: {
      pipeline: { total: 0, count: 0 },
      wonDeals: { total: 0, count: 0 },
      lostDeals: { total: 0, count: 0 },
      conversionRate: 0,
    },
    error: null,
  }),
  
  /**
   * Dados do funil
   */
  getFunnelData: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
  
  /**
   * Saúde da carteira
   */
  getWalletHealth: vi.fn().mockResolvedValue({
    data: {
      active: 0,
      inactive: 0,
      churned: 0,
    },
    error: null,
  }),
  
  /**
   * Tendência de receita
   */
  getRevenueTrend: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
  
  /**
   * Métricas de ciclo de vendas
   */
  getSalesCycleMetrics: vi.fn().mockResolvedValue({
    data: {
      avgDays: 0,
      byStage: [],
    },
    error: null,
  }),
};
```

### Profile Service Mock (expandido)

```typescript
// Expandir o mock existente de auth
export const profileService = {
  /**
   * Atualizar perfil
   */
  update: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  
  /**
   * Upload de avatar
   */
  uploadAvatar: vi.fn().mockResolvedValue({
    data: { url: 'https://example.com/avatar.jpg' },
    error: null,
  }),
  
  /**
   * Alterar senha
   */
  changePassword: vi.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
};
```

## Padrões de Uso

### Setup Global

```typescript
// src/test/setup.ts
import { 
  contactsService, 
  boardsService, 
  aiService,
  // ... 
} from './__mocks__/supabase';

beforeEach(() => {
  vi.clearAllMocks();
  
  // Defaults vazios para evitar undefined
  contactsService.getAll.mockResolvedValue({ data: [], error: null });
  boardsService.getAll.mockResolvedValue({ data: [], error: null });
  // ...
});
```

### Setup por Cenário

```typescript
// Em cada teste
import { inboxScenario } from '@/test/fixtures/scenarios';

beforeEach(() => {
  const scenario = inboxScenario();
  
  activitiesService.getAll.mockResolvedValue({
    data: [
      ...scenario.overdueActivities,
      ...scenario.todayMeetings,
      ...scenario.todayTasks,
    ],
    error: null,
  });
  
  suggestionsService.getAll.mockResolvedValue({
    data: scenario.suggestions,
    error: null,
  });
});
```

### Simular Erros

```typescript
test('exibe erro quando falha ao carregar contatos', async () => {
  contactsService.getAll.mockResolvedValue({
    data: null,
    error: { message: 'Falha na conexão' },
  });
  
  render(<ContactsPage />);
  
  await waitFor(() => {
    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });
});
```

### Simular Latência

```typescript
test('exibe loading enquanto carrega', async () => {
  contactsService.getAll.mockImplementation(
    () => new Promise(resolve => 
      setTimeout(() => resolve({ data: [], error: null }), 100)
    )
  );
  
  render(<ContactsPage />);
  
  expect(screen.getByTestId('loading')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });
});
```

## Validações

Os mocks DEVEM:

1. Retornar sempre `{ data, error }` pattern
2. Ter valores default que não quebram o render
3. Suportar `mockResolvedValue`, `mockRejectedValue`, `mockImplementation`
4. Ser limpos via `vi.clearAllMocks()` em `beforeEach`
5. Não fazer chamadas reais de rede (verify via test runner)
