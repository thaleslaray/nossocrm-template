# Implementation Plan: Server-Side Pagination

**Branch**: `004-server-pagination` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-server-pagination/spec.md`

## Summary

O CRM atual carrega todos os contatos de uma vez, limitado a 1000 pelo Supabase. Esta feature implementa paginação server-side usando TanStack Query + TanStack Table para suportar 10k+ contatos com performance < 2s por página.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19  
**Primary Dependencies**: TanStack Query v5, TanStack Table v8 (já no projeto), Supabase JS  
**Storage**: Supabase PostgreSQL com RLS  
**Testing**: Vitest + React Testing Library (57 testes existentes para filtros)  
**Target Platform**: Web (SPA Vite)  
**Project Type**: Web application (frontend React)  
**Performance Goals**: Carregamento < 2s, navegação < 1s  
**Constraints**: Manter compatibilidade com 57 testes existentes de filtros  
**Scale/Scope**: 10.000+ contatos por organização

## Constitution Check

*GATE: Constitution está em template mode - não há regras específicas bloqueantes.*

✅ Aprovado - Constitution não define restrições específicas para esta feature.

## Project Structure

### Documentation (this feature)

```text
specs/004-server-pagination/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── pagination-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types.ts                              # + PaginationState, PaginatedResponse
├── lib/
│   ├── supabase/
│   │   └── contacts.ts                   # + getAllPaginated(), filtros server-side
│   └── query/
│       └── hooks/
│           └── useContactsQuery.ts       # + useContactsPaginated()
├── features/
│   └── contacts/
│       ├── hooks/
│       │   └── useContactsController.ts  # Migrar para paginação
│       └── components/
│           └── PaginationControls.tsx    # Novo componente UI
└── components/
    └── ui/
        └── Pagination.tsx                # Componente reutilizável (opcional)
```

**Structure Decision**: Arquitetura feature-based existente mantida. Novos arquivos apenas para componente de paginação e tipos.

## Complexity Tracking

> Não há violações da constitution que precisem de justificativa.

---

## Phase 0: Research

### Unknowns Identificados

| # | Unknown | Status |
|---|---------|--------|
| 1 | Como Supabase retorna count total com `.range()`? | ✅ Resolvido |
| 2 | Como integrar TanStack Table com paginação server-side? | ✅ Resolvido |
| 3 | Como manter filtros existentes funcionando com server-side? | ✅ Resolvido |
| 4 | Como usar `keepPreviousData` no TanStack Query v5? | ✅ Resolvido |

### Findings (Resumo do Research)

**1. Supabase Pagination com Count**

```typescript
const { data, count, error } = await supabase
  .from('contacts')
  .select('*', { count: 'exact' })  // count: 'exact' retorna total
  .range(from, to)                   // range(0, 49) = primeiros 50
  .order('created_at', { ascending: false });
```

**2. TanStack Query v5 com Paginação**

```typescript
const { data, isFetching, isPlaceholderData } = useQuery({
  queryKey: ['contacts', pagination, filters],
  queryFn: () => fetchPaginated(pagination, filters),
  placeholderData: keepPreviousData,  // Mantém dados anteriores durante fetch
});
```

**3. TanStack Table com Manual Pagination**

```typescript
const table = useReactTable({
  data: data?.contacts ?? [],
  rowCount: data?.totalCount,       // Total de registros no banco
  manualPagination: true,           // Desabilita paginação client-side
  manualFiltering: true,            // Desabilita filtros client-side
  state: { pagination },
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
});
```

**4. Filtros Server-Side**

Os filtros existentes (search, stage, status, dateRange) serão migrados para o Supabase:

```typescript
let query = supabase.from('contacts').select('*', { count: 'exact' });

if (filters.search) {
  query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
}
if (filters.stage && filters.stage !== 'ALL') {
  query = query.eq('stage', filters.stage);
}
if (filters.status && filters.status !== 'ALL') {
  query = query.eq('status', filters.status);
}
if (filters.dateStart) {
  query = query.gte('created_at', filters.dateStart);
}
if (filters.dateEnd) {
  query = query.lte('created_at', filters.dateEnd);
}

return query.range(from, to).order('created_at', { ascending: false });
```

---

## Phase 1: Design

### Artifacts Gerados

Veja os arquivos na pasta `specs/004-server-pagination/`:

1. **data-model.md** - Tipos TypeScript para paginação
2. **contracts/pagination-api.md** - Contrato da API Supabase
3. **quickstart.md** - Guia rápido de implementação

---

## Próximos Passos

Execute `/speckit.tasks` para gerar as tarefas de implementação detalhadas.
