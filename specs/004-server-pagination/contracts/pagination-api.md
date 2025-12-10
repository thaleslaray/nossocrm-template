# API Contract: Contacts Pagination

**Feature**: 004-server-pagination  
**Date**: 2025-12-05

## contactsService.getAllPaginated

### Request

```typescript
interface GetAllPaginatedParams {
  pagination: {
    pageIndex: number;  // 0-indexed
    pageSize: number;   // 25 | 50 | 100
  };
  filters?: {
    search?: string;           // Busca em name e email
    stage?: ContactStage | 'ALL';
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'RISK';
    dateStart?: string;        // ISO date string
    dateEnd?: string;          // ISO date string
    clientCompanyId?: string;  // UUID
  };
}
```

### Response

```typescript
interface GetAllPaginatedResponse {
  data: {
    data: Contact[];       // Contatos da página atual
    totalCount: number;    // Total de registros (com filtros aplicados)
    pageIndex: number;     // Página retornada
    pageSize: number;      // Tamanho da página
    hasMore: boolean;      // Se há mais páginas
  } | null;
  error: Error | null;
}
```

### Supabase Query

```typescript
async getAllPaginated(
  pagination: PaginationState,
  filters?: ContactsServerFilters
): Promise<GetAllPaginatedResponse> {
  const { pageIndex, pageSize } = pagination;
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  if (filters?.stage && filters.stage !== 'ALL') {
    query = query.eq('stage', filters.stage);
  }

  if (filters?.status && filters.status !== 'ALL') {
    if (filters.status === 'RISK') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query
        .eq('status', 'ACTIVE')
        .or(`last_purchase_date.is.null,last_purchase_date.lt.${thirtyDaysAgo.toISOString()}`);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.dateStart) {
    query = query.gte('created_at', filters.dateStart);
  }

  if (filters?.dateEnd) {
    query = query.lte('created_at', filters.dateEnd);
  }

  if (filters?.clientCompanyId) {
    query = query.eq('client_company_id', filters.clientCompanyId);
  }

  // Apply pagination and ordering
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, error };
  }

  const totalCount = count ?? 0;
  const hasMore = from + pageSize < totalCount;

  return {
    data: {
      data: (data || []).map(transformContact),
      totalCount,
      pageIndex,
      pageSize,
      hasMore,
    },
    error: null,
  };
}
```

---

## useContactsPaginated Hook

### Interface

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';

export const useContactsPaginated = (
  pagination: PaginationState,
  filters?: ContactsServerFilters
) => {
  return useQuery({
    queryKey: queryKeys.contacts.paginated(pagination, filters),
    queryFn: async () => {
      const { data, error } = await contactsService.getAllPaginated(
        pagination,
        filters
      );
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,  // 30 seconds
  });
};
```

### Query Keys

```typescript
// Adicionar ao queryKeys em lib/query/index.ts
export const queryKeys = {
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => 
      [...queryKeys.contacts.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.contacts.all, 'detail', id] as const,
    // NOVO
    paginated: (pagination: PaginationState, filters?: ContactsServerFilters) =>
      [...queryKeys.contacts.all, 'paginated', pagination, filters] as const,
  },
  // ... outros
};
```

---

## Error Handling

| Erro | Código | Ação UI |
|------|--------|---------|
| Network Error | - | Toast "Erro de conexão. Tente novamente." |
| RLS Violation | 42501 | Redirecionar para login |
| Invalid Range | PGRST103 | Resetar para página 0 |
| Query Timeout | 57014 | Toast "Consulta demorou muito. Tente filtrar mais." |

---

## Rate Limiting

Não aplicável - Supabase gerencia rate limiting no nível de projeto.

---

## Caching Strategy

| Cenário | staleTime | Comportamento |
|---------|-----------|---------------|
| Navegação entre páginas | 30s | Cache por página + filtros |
| Alteração de filtros | 0 (invalida) | Fetch imediato |
| Mutação (create/update/delete) | - | Invalidar queryKeys.contacts.all |

---

## Testing Contract

```typescript
// Mock para testes
const mockGetAllContactsPaginated = vi.fn();

mockGetAllContactsPaginated.mockResolvedValue({
  data: {
    data: mockContacts.slice(0, 50),
    totalCount: 10000,
    pageIndex: 0,
    pageSize: 50,
    hasMore: true,
  },
  error: null,
});

// Asserções
expect(mockGetAllContactsPaginated).toHaveBeenCalledWith(
  { pageIndex: 0, pageSize: 50 },
  { stage: 'LEAD' }
);
```
