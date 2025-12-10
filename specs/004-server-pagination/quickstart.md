# Quickstart: Server-Side Pagination

**Feature**: 004-server-pagination  
**Date**: 2025-12-05

## Resumo

Implementar paginação server-side na página de contatos para suportar 10.000+ registros.

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/types.ts` | Adicionar | Tipos `PaginationState`, `PaginatedResponse` |
| `src/lib/supabase/contacts.ts` | Adicionar | Método `getAllPaginated()` |
| `src/lib/query/index.ts` | Adicionar | Query key `contacts.paginated` |
| `src/lib/query/hooks/useContactsQuery.ts` | Adicionar | Hook `useContactsPaginated()` |
| `src/features/contacts/hooks/useContactsController.ts` | Modificar | Migrar para `useContactsPaginated` |
| `src/features/contacts/components/PaginationControls.tsx` | Criar | Componente UI de paginação |
| `src/features/contacts/ContactsPage.test.tsx` | Modificar | Atualizar mocks para paginação |

## Ordem de Implementação

### 1. Tipos (5 min)

Adicionar em `src/types.ts`:

```typescript
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  hasMore: boolean;
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;
```

### 2. Service Layer (15 min)

Adicionar em `src/lib/supabase/contacts.ts`:

```typescript
async getAllPaginated(
  pagination: PaginationState,
  filters?: ContactsServerFilters
): Promise<{ data: PaginatedResponse<Contact> | null; error: Error | null }> {
  // Ver contracts/pagination-api.md para implementação completa
}
```

### 3. Query Hooks (10 min)

Adicionar em `src/lib/query/hooks/useContactsQuery.ts`:

```typescript
export const useContactsPaginated = (
  pagination: PaginationState,
  filters?: ContactsServerFilters
) => {
  return useQuery({
    queryKey: queryKeys.contacts.paginated(pagination, filters),
    queryFn: async () => {
      const { data, error } = await contactsService.getAllPaginated(pagination, filters);
      if (error) throw error;
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
};
```

### 4. Controller Migration (20 min)

Modificar `useContactsController.ts`:

```typescript
// ANTES
const { data: contacts = [], isLoading } = useContacts();
const filteredContacts = useMemo(() => { /* filtros client-side */ }, [...]);

// DEPOIS
const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
});

const filters: ContactsServerFilters = {
  search,
  stage: stageFilter,
  status: statusFilter,
  dateStart: dateRange.start,
  dateEnd: dateRange.end,
};

const { data, isLoading, isFetching, isPlaceholderData } = useContactsPaginated(
  pagination,
  filters
);

const contacts = data?.data ?? [];
const totalCount = data?.totalCount ?? 0;

// Reset pagination when filters change
useEffect(() => {
  setPagination(prev => ({ ...prev, pageIndex: 0 }));
}, [search, stageFilter, statusFilter, dateRange]);
```

### 5. UI Component (15 min)

Criar `src/features/contacts/components/PaginationControls.tsx`:

```tsx
interface PaginationControlsProps {
  pagination: PaginationState;
  totalCount: number;
  onPaginationChange: (state: PaginationState) => void;
  isFetching: boolean;
  isPlaceholderData: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pagination,
  totalCount,
  onPaginationChange,
  isFetching,
  isPlaceholderData,
}) => {
  const pageCount = Math.ceil(totalCount / pagination.pageSize);
  const canPrev = pagination.pageIndex > 0;
  const canNext = pagination.pageIndex < pageCount - 1;

  const from = pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount);

  return (
    <div className="flex items-center justify-between border-t p-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Mostrando {from}-{to} de {totalCount} contatos
        {isFetching && <span className="ml-2 animate-pulse">Carregando...</span>}
      </span>
      
      <div className="flex items-center gap-2">
        <button onClick={() => onPaginationChange({ ...pagination, pageIndex: 0 })}
                disabled={!canPrev || isFetching}>⏮</button>
        <button onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                disabled={!canPrev || isFetching}>◀</button>
        <span>Página {pagination.pageIndex + 1} de {pageCount}</span>
        <button onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                disabled={!canNext || isPlaceholderData || isFetching}>▶</button>
        <button onClick={() => onPaginationChange({ ...pagination, pageIndex: pageCount - 1 })}
                disabled={!canNext || isFetching}>⏭</button>
        
        <select value={pagination.pageSize}
                onChange={e => onPaginationChange({ pageIndex: 0, pageSize: Number(e.target.value) })}>
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size} por página</option>
          ))}
        </select>
      </div>
    </div>
  );
};
```

### 6. Testes (20 min)

Atualizar mocks em `ContactsPage.test.tsx`:

```typescript
const mockGetAllContactsPaginated = vi.fn();

// Mock service
vi.mock('@/lib/supabase', () => ({
  contactsService: {
    getAllPaginated: () => mockGetAllContactsPaginated(),
    // ... outros métodos
  },
}));

// Setup mock response
mockGetAllContactsPaginated.mockResolvedValue({
  data: {
    data: mockContacts,
    totalCount: mockContacts.length,
    pageIndex: 0,
    pageSize: 50,
    hasMore: false,
  },
  error: null,
});
```

## Validação

### Critérios de Sucesso

- [ ] Página carrega em < 2s com 10k contatos
- [ ] Navegação entre páginas < 1s
- [ ] Todos os 57 testes existentes passam
- [ ] Novos testes de paginação passam
- [ ] Filtros funcionam com paginação
- [ ] UI mostra "Mostrando X-Y de Z"
- [ ] Botões desabilitados corretamente

### Comandos de Teste

```bash
# Rodar testes
npm run test:run -- src/features/contacts/

# Type check
npx tsc --noEmit

# Dev server
npm run dev
```

## Rollback

Se necessário reverter:

1. O método `getAll()` original foi mantido
2. Basta trocar `useContactsPaginated` por `useContacts` no controller
3. Remover componente `PaginationControls`
4. Reverter filtros client-side no `useMemo`
