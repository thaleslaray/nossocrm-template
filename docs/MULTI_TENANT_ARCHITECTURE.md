# Multi-Tenant Architecture - NossoCRM

> **⚠️ DOCUMENTO CRÍTICO - Leia antes de qualquer alteração no schema ou services**

## TL;DR

| Conceito | Campo | Tabela | Origem | Propósito |
|----------|-------|--------|--------|-----------|
| **Tenant** | `organization_id` | `organizations` | `useAuth().organizationId` | RLS, isolamento, billing |
| **Cliente do CRM** | `client_company_id` | `crm_companies` | Input do usuário | Relacionamento comercial |

**Regra de ouro**: `organization_id` = segurança, `client_company_id` = negócio.

---

## 1. Contexto e Problema

### O Problema Original

O projeto inicialmente usava `company` e `company_id` para tudo, causando confusão:

```
❌ Antes (confuso):
- companies (tabela) = tenant? cliente? 
- company_id = organization? crm_company?
- Código usava "organization", banco usava "company"
```

### A Solução Adotada

Renomeamos para ter clareza semântica:

```
✅ Agora (claro):
- organizations = Quem PAGA pelo SaaS (tenant)
- crm_companies = Empresas cadastradas no CRM (clientes)
- organization_id = FK para tenant (RLS)
- client_company_id = FK para empresa do cliente
```

---

## 2. Arquitetura Multi-Tenant

### 2.1 Modelo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TENANT A: "Imobiliária XYZ"                            │   │
│  │  organization_id = "aaa-111-..."                        │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  USUÁRIOS (profiles)                            │   │   │
│  │  │  - João (admin)                                 │   │   │
│  │  │  - Maria (vendedor)                             │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  EMPRESAS CLIENTES (crm_companies)              │   │   │
│  │  │  - Construtora ABC                              │   │   │
│  │  │  - Incorporadora DEF                            │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  CONTATOS (contacts)                            │   │   │
│  │  │  - Carlos (trabalha na ABC)                     │   │   │
│  │  │  - Ana (trabalha na DEF)                        │   │   │
│  │  │  - Pedro (autônomo, sem empresa)                │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  DEALS (todos com organization_id = aaa-111)    │   │   │
│  │  │  - Venda Apt 101 (→ ABC)                        │   │   │
│  │  │  - Venda Casa 202 (→ DEF)                       │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TENANT B: "Consultoria Acme"                           │   │
│  │  organization_id = "bbb-222-..."                        │   │
│  │  (completamente isolado do Tenant A)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ══════════════════════════════════════════════════════════════│
│  RLS POLICY: WHERE organization_id = get_user_organization_id()│
│  ══════════════════════════════════════════════════════════════│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Row Level Security (RLS)

Toda tabela com dados de tenant deve ter:

```sql
-- Função auxiliar (cacheada por performance)
CREATE FUNCTION get_user_organization_id() RETURNS UUID AS $$
  SELECT organization_id FROM profiles 
  WHERE id = (SELECT auth.uid())
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policy padrão
CREATE POLICY "tenant_isolation" ON tabela
  FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());
```

---

## 3. Convenções de Código

### 3.1 TypeScript Types

```typescript
// ✅ CORRETO - Use tipos específicos
import { OrganizationId, ClientCompanyId } from '@/types';

interface Deal {
  organization_id: OrganizationId;      // Sempre do auth
  client_company_id?: ClientCompanyId;  // Opcional, do form
}

// ❌ ERRADO - Não use string genérico
interface Deal {
  organization_id: string;  // Perde semântica
  company_id: string;       // Ambíguo!
}
```

### 3.2 Hooks e Services

```typescript
// ✅ CORRETO - organization_id vem do auth
function useCreateDeal() {
  const { organizationId } = useAuth();  // Do context
  
  return useMutation({
    mutationFn: (data: DealInput) => 
      dealsService.create({
        ...data,
        organization_id: organizationId,  // Automático!
        client_company_id: data.companyId, // Do form, opcional
      })
  });
}

// ❌ ERRADO - Nunca passe organization_id como input
function useCreateDeal() {
  return useMutation({
    mutationFn: (data: DealInput) => 
      dealsService.create({
        organization_id: data.organizationId,  // PERIGOSO!
      })
  });
}
```

### 3.3 Supabase Services

```typescript
// lib/supabase/deals.ts

export const dealsService = {
  async create(deal: DealInput, organizationId: string) {
    // organization_id é parâmetro obrigatório, não vem do input
    const { data, error } = await supabase
      .from('deals')
      .insert({
        ...deal,
        organization_id: requireUUID(organizationId, 'organizationId'),
        client_company_id: sanitizeUUID(deal.clientCompanyId), // opcional
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};
```

---

## 4. Glossário de Campos

| Campo DB | Campo TS | Tipo | Obrigatório | Descrição |
|----------|----------|------|-------------|-----------|
| `organization_id` | `organizationId` | UUID | **Sim** | Tenant ID para RLS |
| `client_company_id` | `clientCompanyId` | UUID | Não | Empresa cliente no CRM |
| `owner_id` | `ownerId` | UUID | Sim (deals) | Usuário dono do registro |
| `contact_id` | `contactId` | UUID | Sim (deals) | Contato principal |
| `board_id` | `boardId` | UUID | Sim (deals) | Kanban board |

---

## 5. Checklist para PRs

### Novo Service ou Hook:
- [ ] `organization_id` vem do `useAuth()`, não do input
- [ ] `client_company_id` usa `sanitizeUUID()` (opcional)
- [ ] Campos FK obrigatórios usam `requireUUID()`

### Nova Migration:
- [ ] Tabela tem coluna `organization_id UUID NOT NULL`
- [ ] FK: `REFERENCES organizations(id) ON DELETE CASCADE`
- [ ] Índice: `CREATE INDEX idx_tabela_org ON tabela(organization_id)`
- [ ] RLS policy usando `get_user_organization_id()`

### Novo Formulário:
- [ ] `organization_id` NÃO aparece como campo editável
- [ ] `client_company_id` é dropdown opcional (pode ser null)

---

## 6. Histórico de Decisões

| Data | Decisão | Motivo |
|------|---------|--------|
| 2024-12 | Renomear `companies` → `organizations` | Clareza: tenant ≠ cliente do CRM |
| 2024-12 | Criar `crm_companies` | Separar empresas clientes |
| 2024-12 | Type aliases `OrganizationId`, `ClientCompanyId` | Prevenir confusão em TS |

---

## 7. Erros Comuns e Soluções

### Erro: "violates foreign key constraint"
```
ERROR: insert or update on table "deals" violates foreign key 
constraint "deals_organization_id_fkey"
```
**Causa**: `organization_id` inválido ou de outro tenant
**Solução**: Use `useAuth().organizationId`, não input do usuário

### Erro: "new row violates row-level security policy"
```
ERROR: new row violates row-level security policy for table "deals"
```
**Causa**: `organization_id` não corresponde ao usuário logado
**Solução**: Verifique se está usando `get_user_organization_id()` na policy

### Erro: Dados de outro tenant aparecem
**Causa**: RLS desabilitado ou policy incorreta
**Solução**: 
1. Verificar `ALTER TABLE tabela ENABLE ROW LEVEL SECURITY`
2. Verificar policy usa `(SELECT auth.uid())` não `auth.uid()` direto

---

## 8. Referências

- [Supabase Multi-tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- `.github/copilot-instructions.md` - Instruções para AI assistants
- `src/types.ts` - Type definitions com JSDoc

