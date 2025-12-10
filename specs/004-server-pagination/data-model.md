# Data Model: Server-Side Pagination

**Feature**: 004-server-pagination  
**Date**: 2025-12-05

## New Types

### PaginationState

Representa o estado atual da paginação.

```typescript
/**
 * Estado de paginação para controle de navegação.
 * 
 * @example
 * ```ts
 * const [pagination, setPagination] = useState<PaginationState>({
 *   pageIndex: 0,
 *   pageSize: 50,
 * });
 * ```
 */
export interface PaginationState {
  /** Índice da página atual (0-indexed). */
  pageIndex: number;
  /** Quantidade de itens por página. */
  pageSize: number;
}

/** Opções válidas para tamanho de página. */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Tamanho de página padrão. */
export const DEFAULT_PAGE_SIZE = 50;
```

### PaginatedResponse

Resposta genérica de API paginada.

```typescript
/**
 * Resposta paginada genérica do servidor.
 * 
 * @template T Tipo dos itens retornados.
 * 
 * @example
 * ```ts
 * const response: PaginatedResponse<Contact> = {
 *   data: [...],
 *   totalCount: 10000,
 *   pageIndex: 0,
 *   pageSize: 50,
 *   hasMore: true,
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** Array de itens da página atual. */
  data: T[];
  /** Total de registros no banco (para calcular número de páginas). */
  totalCount: number;
  /** Índice da página retornada (0-indexed). */
  pageIndex: number;
  /** Tamanho da página solicitada. */
  pageSize: number;
  /** Se existem mais páginas após esta. */
  hasMore: boolean;
}
```

### ContactsFilters (Extended)

Filtros para busca de contatos (servidor).

```typescript
/**
 * Filtros de contatos para busca server-side.
 * Extensão dos filtros existentes com suporte a paginação.
 */
export interface ContactsServerFilters {
  /** Busca por nome ou email (case-insensitive). */
  search?: string;
  /** Filtro por estágio do funil. */
  stage?: ContactStage | 'ALL';
  /** Filtro por status. */
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'RISK';
  /** Data de início (created_at >= dateStart). */
  dateStart?: string;
  /** Data de fim (created_at <= dateEnd). */
  dateEnd?: string;
  /** ID da empresa cliente (opcional). */
  clientCompanyId?: string;
}
```

---

## Modified Entities

### Contact

**Nenhuma alteração necessária.** A entidade Contact permanece inalterada.

```typescript
// Existente em src/types.ts
export interface Contact {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  clientCompanyId?: string;
  companyId?: string;  // @deprecated
  avatar: string;
  notes: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CHURNED';
  stage: ContactStage;
  source?: ContactSource;
  birthDate?: string;
  lastInteraction?: string;
  lastPurchaseDate?: string;
  totalValue: number;
  createdAt: string;
}
```

---

## Database Layer

### contactsService (Extended)

Novos métodos no serviço de contatos:

```typescript
// Assinatura dos novos métodos em lib/supabase/contacts.ts

export const contactsService = {
  // Método existente (mantido para compatibilidade)
  async getAll(): Promise<{ data: Contact[] | null; error: Error | null }>,
  
  // NOVO: Busca paginada com filtros server-side
  async getAllPaginated(
    pagination: PaginationState,
    filters?: ContactsServerFilters
  ): Promise<{ 
    data: PaginatedResponse<Contact> | null; 
    error: Error | null 
  }>,
  
  // Métodos existentes (inalterados)
  async create(...): Promise<...>,
  async update(...): Promise<...>,
  async delete(...): Promise<...>,
};
```

---

## Query Layer

### useContactsPaginated

Novo hook TanStack Query para busca paginada:

```typescript
// Assinatura do novo hook em lib/query/hooks/useContactsQuery.ts

/**
 * Hook para busca paginada de contatos com filtros server-side.
 * 
 * @param pagination Estado de paginação { pageIndex, pageSize }
 * @param filters Filtros opcionais (search, stage, status, dateRange)
 * 
 * @returns Query result com { data, isLoading, isFetching, isPlaceholderData }
 * 
 * @example
 * ```tsx
 * const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
 * const { data, isFetching } = useContactsPaginated(pagination, { stage: 'LEAD' });
 * 
 * // data.data = Contact[]
 * // data.totalCount = 10000
 * // data.hasMore = true
 * ```
 */
export const useContactsPaginated = (
  pagination: PaginationState,
  filters?: ContactsServerFilters
) => UseQueryResult<PaginatedResponse<Contact>>;
```

---

## State Transitions

### Pagination State Machine

```
┌──────────────────────────────────────────────────────────────┐
│  IDLE                                                        │
│  pagination = { pageIndex: 0, pageSize: 50 }                │
│  data = PaginatedResponse<Contact>                           │
└──────────────────────────────────────────────────────────────┘
        │                                   │
        │ User changes page                 │ User changes filter
        │ (nextPage, prevPage, goTo)        │ (search, stage, status)
        ▼                                   ▼
┌────────────────────────┐        ┌─────────────────────────────┐
│  FETCHING              │        │  FETCHING + RESET           │
│  isFetching = true     │        │  isFetching = true          │
│  isPlaceholderData=true│        │  pageIndex → 0              │
│  (dados anteriores     │        │  (dados anteriores visíveis)│
│   permanecem visíveis) │        │                             │
└────────────────────────┘        └─────────────────────────────┘
        │                                   │
        │ Fetch complete                    │ Fetch complete
        ▼                                   ▼
┌──────────────────────────────────────────────────────────────┐
│  IDLE                                                        │
│  pagination = { pageIndex: N, pageSize: 50 }                │
│  data = NEW PaginatedResponse<Contact>                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

| Campo | Regra | Ação se Inválido |
|-------|-------|------------------|
| pageIndex | >= 0 | Clamp para 0 |
| pageIndex | <= maxPages | Clamp para última página |
| pageSize | Um de [25, 50, 100] | Default para 50 |
| search | string (qualquer) | Nenhuma (permite vazio) |
| dateStart | ISO date ou vazio | Ignorar se inválido |
| dateEnd | ISO date ou vazio | Ignorar se inválido |

---

## Relationships

```
┌─────────────────────┐
│  PaginationState    │
│  - pageIndex        │
│  - pageSize         │
└─────────────────────┘
         │
         │ passa para
         ▼
┌─────────────────────────────────┐
│  useContactsPaginated()         │
│  - queryKey: [contacts, page,   │
│              filters]           │
└─────────────────────────────────┘
         │
         │ chama
         ▼
┌─────────────────────────────────┐
│  contactsService.getAllPaginated│
│  - Supabase query com           │
│    .range() e count: 'exact'    │
└─────────────────────────────────┘
         │
         │ retorna
         ▼
┌─────────────────────────────────┐
│  PaginatedResponse<Contact>     │
│  - data: Contact[]              │
│  - totalCount: number           │
│  - hasMore: boolean             │
└─────────────────────────────────┘
         │
         │ alimenta
         ▼
┌─────────────────────────────────┐
│  TanStack Table                 │
│  - rowCount = totalCount        │
│  - manualPagination = true      │
└─────────────────────────────────┘
```
