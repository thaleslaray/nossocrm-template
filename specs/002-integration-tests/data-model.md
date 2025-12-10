# Data Model: Fixtures para Testes de Integração

**Date**: 2025-12-03  
**Status**: Complete

## Overview

Estrutura de dados de teste (fixtures) para suportar as 22 jornadas de usuário. Cada fixture é uma factory function que gera dados realísticos usando Faker.js.

## Entities

### User / Profile

```typescript
// src/test/fixtures/users.ts
interface ProfileFixture {
  id: string;           // UUID
  email: string;        // email válido
  company_id: string;   // UUID do tenant
  role: 'admin' | 'vendedor';
  first_name: string;
  last_name: string;
  nickname: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;   // ISO timestamp
}

// Factory
createProfile(overrides?: Partial<ProfileFixture>): ProfileFixture
createAdminProfile(): ProfileFixture  // shortcut para role=admin
createSellerProfile(): ProfileFixture // shortcut para role=vendedor
```

### Contact

```typescript
// src/test/fixtures/contacts.ts
interface ContactFixture {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;  // YYYY-MM-DD
  lifecycleStage: string;    // ID do lifecycle stage
  crm_company_id: string | null;
  company_id: string;
  notes: string | null;
  tags: string[];
  customFields: Record<string, any>;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Factories
createContact(overrides?): ContactFixture
createContacts(count: number, overrides?): ContactFixture[]
createLeadContact(): ContactFixture      // lifecycle = LEAD
createCustomerContact(): ContactFixture  // lifecycle = CUSTOMER
```

### Deal / DealView

```typescript
// src/test/fixtures/deals.ts
interface DealFixture {
  id: string;
  title: string;
  boardId: string;
  status: string;        // ID do board stage
  value: number;
  probability: number;   // 0-100
  priority: 'low' | 'medium' | 'high';
  contactId: string | null;
  companyId: string | null;
  tags: string[];
  items: DealItem[];
  customFields: Record<string, any>;
  lossReason: string | null;
  isWon: boolean;
  isLost: boolean;
  company_id: string;
  owner_id: string;
  createdAt: string;
  updatedAt: string;
  lastStageChangeDate: string | null;
}

interface DealViewFixture extends DealFixture {
  stageName: string;
  stageColor: string;
  contactName: string | null;
  companyName: string | null;
  nextActivity: {
    id: string;
    title: string;
    date: string;
    isOverdue: boolean;
  } | null;
  owner: { name: string; avatar: string };
}

// Factories
createDeal(overrides?): DealFixture
createDealView(overrides?): DealViewFixture
createDeals(count: number, overrides?): DealFixture[]
createWonDeal(): DealFixture           // isWon=true
createLostDeal(reason?: string): DealFixture  // isLost=true
createStalledDeal(daysAgo: number): DealFixture  // updatedAt = N dias atrás
createRottingDeal(): DealFixture       // 11+ dias sem atualização
```

### Activity

```typescript
// src/test/fixtures/activities.ts
type ActivityType = 'CALL' | 'MEETING' | 'TASK' | 'EMAIL' | 'NOTE';

interface ActivityFixture {
  id: string;
  title: string;
  type: ActivityType;
  description: string;
  date: string;          // ISO timestamp
  dealId: string;
  dealTitle: string;
  contactId: string | null;
  completed: boolean;
  company_id: string;
  user: { name: string; avatar: string };
  created_at: string;
}

// Factories
createActivity(overrides?): ActivityFixture
createActivities(count: number, overrides?): ActivityFixture[]
createOverdueActivity(): ActivityFixture     // date no passado, completed=false
createTodayMeeting(): ActivityFixture        // type=MEETING, date=hoje
createTodayTask(): ActivityFixture           // type=TASK, date=hoje
createUpcomingActivity(daysAhead: number): ActivityFixture
```

### Board

```typescript
// src/test/fixtures/boards.ts
interface BoardStageFixture {
  id: string;
  label: string;
  color: string;         // Tailwind class (bg-blue-500)
  linkedLifecycleStage: string | null;
  order: number;
}

interface BoardFixture {
  id: string;
  name: string;
  description: string | null;
  template: string;      // 'SALES' | 'PRE_SALES' | 'CUSTOM' etc
  stages: BoardStageFixture[];
  isDefault: boolean;
  company_id: string;
  order: number;
  linkedLifecycleStage: string | null;
  nextBoardId: string | null;
  agentPersona: AgentPersona | null;
  goal: BoardGoal | null;
  entryTrigger: string | null;
  createdAt: string;
}

// Factories
createBoard(overrides?): BoardFixture
createBoardWithStages(stageCount: number): BoardFixture
createSalesBoard(): BoardFixture       // template SALES padrão
createEmptyBoard(): BoardFixture       // sem stages
```

### AI Suggestion

```typescript
// src/test/fixtures/ai.ts
type SuggestionType = 'UPSELL' | 'RESCUE' | 'BIRTHDAY' | 'STALLED';

interface AISuggestionFixture {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: {
    deal?: DealViewFixture;
    contact?: ContactFixture;
  };
  createdAt: string;
}

// Factories
createAISuggestion(type: SuggestionType, overrides?): AISuggestionFixture
createUpsellSuggestion(deal: DealViewFixture): AISuggestionFixture
createBirthdaySuggestion(contact: ContactFixture): AISuggestionFixture
createStalledSuggestion(deal: DealViewFixture): AISuggestionFixture
```

### Decision

```typescript
// src/test/fixtures/decisions.ts
type DecisionPriority = 'critical' | 'high' | 'medium' | 'low';
type DecisionCategory = 'stalled' | 'overdue' | 'opportunity' | 'risk';

interface DecisionFixture {
  id: string;
  category: DecisionCategory;
  priority: DecisionPriority;
  title: string;
  description: string;
  actionLabel: string;
  actionData: Record<string, any>;
  createdAt: string;
  snoozedUntil: string | null;
}

// Factories
createDecision(overrides?): DecisionFixture
createCriticalDecision(): DecisionFixture
createDecisions(priorities: DecisionPriority[]): DecisionFixture[]
```

## Relationships

```
Profile (1) ──────┬──────< Contact (N)
                  │
                  ├──────< Deal (N)
                  │           │
                  │           └────< Activity (N)
                  │
                  ├──────< Board (N)
                  │           │
                  │           └────< BoardStage (N)
                  │
                  └──────< Decision (N)

Contact ─────────< Deal (N)  [via contactId]

Deal ────────────< Activity (N)  [via dealId]

BoardStage ──────< Deal (N)  [via status = stage.id]
```

## Scenario Presets

Para facilitar setup de cenários complexos:

```typescript
// src/test/fixtures/scenarios.ts

// Inbox com itens variados
export const inboxScenario = () => ({
  overdueActivities: [
    createOverdueActivity({ title: 'Ligar para João' }),
    createOverdueActivity({ title: 'Enviar proposta', type: 'EMAIL' }),
  ],
  todayMeetings: [
    createTodayMeeting({ title: 'Reunião de kickoff' }),
  ],
  todayTasks: [
    createTodayTask({ title: 'Revisar contrato' }),
  ],
  suggestions: [
    createStalledSuggestion(createDealView({ title: 'Projeto X' })),
    createBirthdaySuggestion(createContact({ name: 'Maria Silva' })),
  ],
});

// Dashboard com métricas
export const dashboardScenario = () => ({
  deals: [
    ...createDeals(5, { value: 10000 }),      // $50k em pipeline
    createWonDeal({ value: 15000 }),          // $15k ganho
    createWonDeal({ value: 10000 }),          // $10k ganho
    createLostDeal('Preço'),                  // 1 perdido
  ],
  contacts: [
    ...createContacts(7, { lifecycleStage: 'CUSTOMER' }),  // 70% ativos
    ...createContacts(2, { lifecycleStage: 'INACTIVE' }), // 20% inativos
    createContact({ lifecycleStage: 'CHURNED' }),         // 10% churn
  ],
});

// Kanban com deals variados
export const kanbanScenario = (board: BoardFixture) => ({
  board,
  deals: [
    createDealView({ status: board.stages[0].id, title: 'Deal Novo' }),
    createDealView({ status: board.stages[1].id, title: 'Deal Qualificado' }),
    createRottingDeal({ status: board.stages[1].id }),  // 11+ dias
    createDealView({ status: board.stages[2].id, title: 'Em Proposta' }),
  ],
});
```

## Usage in Tests

```typescript
import { render, screen, waitFor } from '@/test/test-utils';
import { createContact, createContacts } from '@/test/fixtures/contacts';
import { inboxScenario } from '@/test/fixtures/scenarios';
import { contactsService } from '@/test/__mocks__/supabase';

describe('Contacts Journey', () => {
  it('exibe lista de contatos', async () => {
    const contacts = createContacts(5);
    contactsService.getAll.mockResolvedValue({ data: contacts, error: null });
    
    render(<ContactsPage />);
    
    await waitFor(() => {
      contacts.forEach(c => {
        expect(screen.getByText(c.name)).toBeInTheDocument();
      });
    });
  });
});
```
