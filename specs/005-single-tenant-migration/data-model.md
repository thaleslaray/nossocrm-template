# Data Model: Single-Tenant Simplificado

**Feature**: 005-single-tenant-migration  
**Date**: 2025-12-07

---

## Visão Geral

Este documento descreve o modelo de dados **após** a migração para single-tenant. A principal mudança é a remoção de `organization_id` como campo obrigatório e a simplificação das políticas RLS.

---

## Entidades Principais

### User (Profile)

```
Profile
├── id: UUID (PK, FK → auth.users)
├── email: TEXT
├── name: TEXT
├── avatar: TEXT
├── role: TEXT (user | admin)
├── organization_id: UUID? (OPCIONAL - mantido para histórico)
├── first_name: TEXT?
├── last_name: TEXT?
├── phone: TEXT?
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

**RLS**: `id = auth.uid()` para próprio perfil, SELECT para todos da org (se existir)

---

### Deal

```
Deal
├── id: UUID (PK)
├── title: TEXT
├── value: NUMERIC
├── probability: INTEGER
├── status: TEXT (stage_id)
├── priority: TEXT
├── board_id: UUID (FK → boards)
├── stage_id: UUID? (FK → board_stages)
├── contact_id: UUID? (FK → contacts)
├── client_company_id: UUID? (FK → crm_companies)
├── is_won: BOOLEAN
├── is_lost: BOOLEAN
├── closed_at: TIMESTAMP?
├── owner_id: UUID? (FK → profiles)
├── organization_id: UUID? (OPCIONAL)
├── tags: TEXT[]
├── custom_fields: JSONB
├── created_at: TIMESTAMP
├── updated_at: TIMESTAMP
└── deleted_at: TIMESTAMP?
```

**RLS**: Removido (ou simplificado para authenticated)

---

### Contact

```
Contact
├── id: UUID (PK)
├── name: TEXT
├── email: TEXT?
├── phone: TEXT?
├── role: TEXT?
├── company_name: TEXT?
├── client_company_id: UUID? (FK → crm_companies)
├── stage: TEXT
├── source: TEXT?
├── owner_id: UUID? (FK → profiles)
├── organization_id: UUID? (OPCIONAL)
├── total_value: NUMERIC
├── last_interaction: TIMESTAMP?
├── created_at: TIMESTAMP
├── updated_at: TIMESTAMP
└── deleted_at: TIMESTAMP?
```

**RLS**: Removido (ou simplificado para authenticated)

---

### Board

```
Board
├── id: UUID (PK)
├── name: TEXT
├── description: TEXT?
├── type: TEXT
├── is_default: BOOLEAN
├── position: INTEGER
├── owner_id: UUID? (FK → profiles)
├── organization_id: UUID? (OPCIONAL)
├── created_at: TIMESTAMP
├── updated_at: TIMESTAMP
└── deleted_at: TIMESTAMP?
```

**RLS**: Removido (ou simplificado para authenticated)

---

### Activity

```
Activity
├── id: UUID (PK)
├── title: TEXT
├── description: TEXT?
├── type: TEXT
├── date: TIMESTAMP
├── completed: BOOLEAN
├── deal_id: UUID? (FK → deals)
├── contact_id: UUID? (FK → contacts)
├── owner_id: UUID? (FK → profiles)
├── organization_id: UUID? (OPCIONAL)
├── created_at: TIMESTAMP
└── deleted_at: TIMESTAMP?
```

**RLS**: Removido (ou simplificado para authenticated)

---

## Relacionamentos

```
Profile 1 ←→ N Deal (owner)
Profile 1 ←→ N Contact (owner)
Profile 1 ←→ N Board (owner)
Profile 1 ←→ N Activity (owner)

Board 1 ←→ N BoardStage
Board 1 ←→ N Deal

BoardStage 1 ←→ N Deal

Contact 1 ←→ N Deal
Contact 1 ←→ N Activity

CRMCompany 1 ←→ N Contact
CRMCompany 1 ←→ N Deal
```

---

## Mudanças de Schema

### Campos Removidos (tornados opcionais)

| Tabela | Campo | Antes | Depois |
|--------|-------|-------|--------|
| profiles | organization_id | REQUIRED | OPTIONAL |
| deals | organization_id | REQUIRED | OPTIONAL |
| contacts | organization_id | REQUIRED | OPTIONAL |
| boards | organization_id | REQUIRED | OPTIONAL |
| activities | organization_id | REQUIRED | OPTIONAL |
| board_stages | organization_id | REQUIRED | OPTIONAL |
| deal_items | organization_id | REQUIRED | OPTIONAL |
| products | organization_id | REQUIRED | OPTIONAL |
| tags | organization_id | REQUIRED | OPTIONAL |
| leads | organization_id | REQUIRED | OPTIONAL |
| crm_companies | organization_id | REQUIRED | OPTIONAL |
| custom_field_definitions | organization_id | REQUIRED | OPTIONAL |

### Elementos Removidos

| Tipo | Nome | Descrição |
|------|------|-----------|
| Function | `get_user_organization_id()` | Não mais necessária |
| Function | `auto_set_organization_id()` | Não mais necessária |
| Trigger | `auto_organization_id` (x13) | Não mais necessária |
| Policy | `tenant_isolation` (x20) | Substituída por políticas simples |

---

## Políticas RLS Simplificadas

### Antes (Multi-tenant)

```sql
CREATE POLICY "tenant_isolation" ON deals
    FOR ALL TO authenticated
    USING (organization_id = get_user_organization_id() AND deleted_at IS NULL)
    WITH CHECK (organization_id = get_user_organization_id());
```

### Depois (Single-tenant)

```sql
CREATE POLICY "authenticated_access" ON deals
    FOR ALL TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (true);
```

---

## Tabelas que Mantêm RLS Específico

| Tabela | Política | Motivo |
|--------|----------|--------|
| profiles | `id = auth.uid()` para UPDATE | Usuário só edita próprio perfil |
| user_settings | `user_id = auth.uid()` | Configurações são pessoais |
| ai_conversations | `user_id = auth.uid()` | Histórico de IA é pessoal |
| ai_decisions | `user_id = auth.uid()` | Decisões são pessoais |
| ai_audio_notes | `user_id = auth.uid()` | Notas são pessoais |
