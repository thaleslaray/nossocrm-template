# Research: Server-Side Pagination

**Feature**: 004-server-pagination  
**Date**: 2025-12-05  
**Status**: ✅ Complete

## Research Questions

### 1. Supabase Pagination API

**Question**: Como o Supabase implementa paginação com contagem total?

**Research Method**: Context7 + Documentação oficial Supabase

**Findings**:

O Supabase suporta paginação via `.range()` e contagem via `count: 'exact'`:

```typescript
const { data, count, error } = await supabase
  .from('contacts')
  .select('*', { count: 'exact' })
  .range(0, 49)  // Primeiros 50 registros (0-indexed, inclusive)
  .order('created_at', { ascending: false });

// count = total de registros (ex: 10000)
// data = array com 50 registros
```

**Opções de count**:
- `count: 'exact'` - Contagem precisa (pode ser lento em tabelas muito grandes)
- `count: 'planned'` - Estimativa do PostgreSQL (rápido, impreciso)
- `count: 'estimated'` - Combinação (exato até threshold, depois estimado)

**Decisão**: Usar `count: 'exact'` pois precisamos de contagem precisa para calcular número de páginas.

---

### 2. TanStack Query v5 Pagination Pattern

**Question**: Qual o padrão recomendado para paginação no TanStack Query v5?

**Research Method**: Context7 - TanStack Query documentation

**Findings**:

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

const { data, isFetching, isPlaceholderData } = useQuery({
  queryKey: ['contacts', pagination],
  queryFn: () => fetchContacts(pagination),
  placeholderData: keepPreviousData,  // Mantém dados anteriores durante transição
  staleTime: 30 * 1000,  // 30 segundos
});
```

**Key Points**:
- `keepPreviousData` mantém dados da página anterior visíveis enquanto nova página carrega
- `isPlaceholderData` indica quando dados são da página anterior (útil para desabilitar botões)
- `isFetching` indica carregamento (para indicador visual)
- Query key inclui pagination para refetch automático

**Decisão**: Usar `keepPreviousData` para UX suave conforme especificação.

---

### 3. TanStack Table Manual Pagination

**Question**: Como configurar TanStack Table para paginação server-side?

**Research Method**: Context7 - TanStack Table documentation

**Findings**:

```typescript
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 50,
});

const table = useReactTable({
  data: data?.contacts ?? [],
  columns,
  // Configuração de paginação manual
  rowCount: data?.totalCount,  // Total de linhas no banco
  manualPagination: true,      // Desabilita paginação automática
  manualFiltering: true,       // Desabilita filtros automáticos (se aplicável)
  state: {
    pagination,
  },
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
  // NÃO usar getPaginationRowModel() com manualPagination
});

// Controles
table.getCanPreviousPage()  // boolean
table.getCanNextPage()      // boolean
table.previousPage()        // navega para página anterior
table.nextPage()            // navega para próxima página
table.firstPage()           // navega para primeira página
table.lastPage()            // navega para última página
table.setPageIndex(n)       // navega para página específica
table.getPageCount()        // total de páginas
```

**Decisão**: Usar `manualPagination: true` + `rowCount` do servidor.

---

### 4. Server-Side Filtering com Supabase

**Question**: Como migrar os filtros client-side existentes para server-side?

**Research Method**: Análise do código atual + documentação Supabase

**Findings**:

Filtros atuais em `useContactsController.ts`:
- `search`: busca por nome ou email
- `stageFilter`: LEAD, MQL, PROSPECT, CUSTOMER
- `statusFilter`: ALL, ACTIVE, INACTIVE, CHURNED, RISK
- `dateRange`: { start, end }

Equivalentes no Supabase:

```typescript
let query = supabase.from('contacts').select('*', { count: 'exact' });

// Search (nome ou email)
if (filters.search) {
  query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
}

// Stage filter
if (filters.stage && filters.stage !== 'ALL') {
  query = query.eq('stage', filters.stage);
}

// Status filter
if (filters.status && filters.status !== 'ALL') {
  if (filters.status === 'RISK') {
    // RISK = ACTIVE + lastPurchaseDate > 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query
      .eq('status', 'ACTIVE')
      .or(`last_purchase_date.is.null,last_purchase_date.lt.${thirtyDaysAgo.toISOString()}`);
  } else {
    query = query.eq('status', filters.status);
  }
}

// Date range
if (filters.dateStart) {
  query = query.gte('created_at', filters.dateStart);
}
if (filters.dateEnd) {
  query = query.lte('created_at', filters.dateEnd);
}

// Pagination
const from = pagination.pageIndex * pagination.pageSize;
const to = from + pagination.pageSize - 1;
query = query.range(from, to).order('created_at', { ascending: false });
```

**Decisão**: Migrar todos os filtros para server-side, mantendo assinatura de interface compatível.

---

### 5. Impacto nos Testes Existentes

**Question**: Como os 57 testes existentes serão afetados?

**Research Method**: Análise de `ContactsPage.test.tsx`

**Findings**:

Os testes atuais mockam `contactsService.getAll()` e testam filtros client-side:

```typescript
mockGetAllContacts.mockResolvedValue({ data: contacts, error: null });
```

**Mudanças necessárias nos testes**:

1. Mock deve retornar estrutura paginada:
```typescript
mockGetAllContactsPaginated.mockResolvedValue({
  data: { contacts: mockContacts, totalCount: 5 },
  error: null,
});
```

2. Filtros serão aplicados no mock (server simula filtros):
```typescript
// O mock pode simular filtros ou retornar dados já filtrados
```

3. Novos testes para:
   - Navegação entre páginas
   - Alteração de pageSize
   - Reset de página ao mudar filtros
   - Estados de loading durante transição

**Decisão**: Atualizar mocks para nova estrutura e adicionar testes de paginação.

---

## Summary

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Contagem | `count: 'exact'` | Precisão para cálculo de páginas |
| UX Transição | `keepPreviousData` | Dados anteriores visíveis durante fetch |
| Table Mode | `manualPagination: true` | Paginação controlada pelo servidor |
| Filtros | Server-side via Supabase | Performance com 10k+ registros |
| Page Size Default | 50 | Balanceamento entre UX e performance |
| Page Size Options | [25, 50, 100] | Flexibilidade para usuário |

## Alternatives Considered

| Alternativa | Rejeitada Porque |
|-------------|------------------|
| Infinite Scroll | Especificação pede paginação tradicional; mais complexo de implementar |
| Cursor-based Pagination | Mais complexo; offset-based suficiente para 10k registros |
| Client-side Pagination | Não funciona com 10k+ registros (Supabase limite 1000) |
| Virtual Scrolling | Complexidade desnecessária; paginação tradicional atende requisitos |
