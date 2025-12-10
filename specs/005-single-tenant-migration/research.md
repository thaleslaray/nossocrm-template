# Research: Análise de Impacto da Migração Single-Tenant

**Feature**: 005-single-tenant-migration  
**Date**: 2025-12-07

---

## Decisões Técnicas

### 1. Estratégia de Migração SQL

**Decision**: Modificar o arquivo de migração existente in-place

**Rationale**: 
- O projeto usa uma única migração consolidada (`20231201000000_schema.sql`)
- Criar migração incremental seria mais complexo e arriscado
- Modificar in-place permite recriar ambiente do zero com schema limpo

**Alternatives Considered**:
- Criar nova migração incrementa → Rejeitado: mais complexo, requer DROP e CREATE
- Manter duas versões → Rejeitado: confusão sobre qual usar

---

### 2. Tratamento de Dados Existentes

**Decision**: Manter colunas `organization_id` mas torná-las opcionais (nullable)

**Rationale**:
- Dados existentes têm `organization_id` preenchido
- Deletar coluna requer migração de dados
- Manter é mais seguro e reversível

**Alternatives Considered**:
- Deletar colunas → Rejeitado: perda de dados, irreversível
- Setar DEFAULT → Parcialmente adotado: novos registros podem ter NULL

---

### 3. Políticas RLS Simplificadas

**Decision**: Usar `auth.uid()` diretamente ou remover RLS onde não necessário

**Rationale**:
- Tabelas de usuário único (user_settings, ai_conversations) → RLS com `auth.uid()`
- Tabelas de dados de negócio → RLS pode ser removido ou simplificado
- Algumas tabelas como lifecycle_stages já são públicas

**Alternatives Considered**:
- Desabilitar RLS completamente → Rejeitado: perde proteção básica
- Manter verificação de organization → Rejeitado: derrota o propósito

---

## Análise de Impacto

### Arquivos Frontend Afetados

| Arquivo | Uso de organizationId | Ação |
|---------|----------------------|------|
| `src/types.ts` | Define tipo `OrganizationId` | Remover tipo |
| `src/context/AuthContext.tsx` | Expõe `organizationId` no contexto | Remover do contexto |
| `src/lib/supabase/deals.ts` | Parâmetro em `create()` | Remover parâmetro |
| `src/lib/supabase/contacts.ts` | Parâmetro em `create()` | Remover parâmetro |
| `src/lib/supabase/boards.ts` | Parâmetro em `create()` | Remover parâmetro |
| `src/lib/supabase/activities.ts` | Parâmetro em `create()` | Remover parâmetro |
| `src/lib/query/hooks/useBoardsQuery.ts` | Passa para mutações | Remover passagem |
| `src/lib/query/hooks/useActivitiesQuery.ts` | Passa para mutações | Remover passagem |
| `src/features/boards/hooks/useBoardsController.ts` | Usa organizationId | Remover uso |
| `src/features/activities/hooks/useActivitiesController.ts` | Usa organizationId | Remover uso |
| `src/features/inbox/hooks/useInboxController.ts` | Usa organizationId | Remover uso |

### Arquivos de Teste Afetados

| Arquivo | Impacto |
|---------|---------|
| `src/components/Layout.test.tsx` | Mock de AuthContext |
| `src/test/a11y/pages.test.tsx` | Mock de AuthContext |
| `src/features/contacts/ContactsPage.test.tsx` | Mock de AuthContext |
| `src/features/contacts/components/ContactFormModal.test.tsx` | Mock de AuthContext |

### Schema SQL - Elementos a Remover

| Elemento | Tipo | Quantidade |
|----------|------|------------|
| `get_user_organization_id()` | Função | 1 |
| `auto_set_organization_id()` | Função | 1 |
| `auto_organization_id` triggers | Triggers | 13 |
| Políticas RLS com organization_id | Policies | ~20 |

---

## Ordem de Execução Recomendada

1. **SQL primeiro**: Modificar schema para aceitar NULL em organization_id
2. **Frontend depois**: Remover código que passa organizationId
3. **Testes por último**: Atualizar mocks após mudanças estabilizarem

Esta ordem minimiza erros durante a transição - o banco aceita tanto com quanto sem organization_id.

---

## Riscos Identificados

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Query quebrada por falta de organization_id | Média | Testar cada serviço isoladamente |
| RLS muito permissivo | Baixa | Manter auth.uid() onde faz sentido |
| Testes falham por mock desatualizado | Alta | Atualizar mocks em lote |

---

## Referências

- Schema atual: `supabase/migrations/20231201000000_schema.sql`
- Tipos: `src/types.ts` linhas 1-50
- AuthContext: `src/context/AuthContext.tsx`
