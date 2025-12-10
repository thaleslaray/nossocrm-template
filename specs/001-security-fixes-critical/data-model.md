# Data Model: Correções de Segurança Críticas

**Feature**: `001-security-fixes-critical`  
**Date**: 03/12/2025

---

## New Entities

### 1. user_consents

Registro de consentimentos de usuários para funcionalidades que processam dados pessoais.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | NO | - | FK to profiles.id |
| consent_type | TEXT | NO | - | Tipo do consentimento (enum) |
| version | TEXT | NO | - | Versão do termo de consentimento |
| granted_at | TIMESTAMPTZ | NO | NOW() | Quando foi concedido |
| ip_address | INET | YES | - | IP do usuário no momento do consent |
| user_agent | TEXT | YES | - | User-Agent do navegador |
| revoked_at | TIMESTAMPTZ | YES | NULL | Quando foi revogado (se aplicável) |
| created_at | TIMESTAMPTZ | NO | NOW() | Timestamp de criação |

**Constraints:**
- UNIQUE(user_id, consent_type) - Um usuário só pode ter um consent ativo por tipo
- FK user_id REFERENCES profiles(id) ON DELETE CASCADE

**Consent Types (Enum):**
- `AI_DATA_PROCESSING` - Processamento de dados pessoais por APIs de IA externas
- `AI_BIOMETRIC_DATA` - Processamento de dados biométricos (áudio/voz)

**RLS Policy:**
- SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`

---

### 2. audit_logs

Log de auditoria para operações sensíveis e tentativas de violação de segurança.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | YES | - | FK to profiles.id (quem executou) |
| action | TEXT | NO | - | Tipo de ação (enum) |
| target_type | TEXT | YES | - | Tipo do alvo (user, invite, etc.) |
| target_id | UUID | YES | - | ID do alvo da ação |
| company_id | UUID | YES | - | FK to companies.id |
| details | JSONB | YES | '{}' | Detalhes adicionais da operação |
| ip_address | INET | YES | - | IP do usuário |
| user_agent | TEXT | YES | - | User-Agent do navegador |
| success | BOOLEAN | NO | true | Se a operação foi bem-sucedida |
| created_at | TIMESTAMPTZ | NO | NOW() | Timestamp do evento |

**Action Types (Enum):**
- `USER_DELETE` - Exclusão de usuário
- `USER_DELETE_ATTEMPT` - Tentativa de exclusão (bloqueada)
- `CROSS_TENANT_DELETE_ATTEMPT` - Tentativa de exclusão cross-tenant
- `INVITE_USED` - Token de convite utilizado
- `INVITE_EXPIRED_ATTEMPT` - Tentativa de uso de token expirado
- `INVITE_REUSE_ATTEMPT` - Tentativa de reutilização de token
- `SETUP_INSTANCE` - Setup inicial da instância
- `SETUP_INSTANCE_UNAUTHORIZED` - Tentativa não autorizada de setup
- `AI_CONSENT_GRANTED` - Consentimento de IA concedido
- `AI_CONSENT_REVOKED` - Consentimento de IA revogado

**RLS Policy:**
- SELECT: `user_id = auth.uid() OR company_id = get_user_company_id()` (admins podem ver logs da empresa)
- INSERT: Apenas via Edge Functions (SECURITY DEFINER)

---

## Modified Entities

### 3. user_settings (Modification)

**Changes:**

| Field | Change | Before | After |
|-------|--------|--------|-------|
| ai_api_key | REMOVE | TEXT | - |
| ai_api_key_encrypted | ADD | - | BYTEA |

**Migration:**
```sql
-- 1. Adicionar coluna encriptada
ALTER TABLE public.user_settings 
ADD COLUMN ai_api_key_encrypted BYTEA;

-- 2. Migrar dados existentes (em Edge Function ou script)
-- NOTA: Requires encryption key set in session

-- 3. Remover coluna plain text
ALTER TABLE public.user_settings 
DROP COLUMN ai_api_key;
```

---

### 4. company_invites (Modification)

**Changes:**

| Field | Change | Before | After |
|-------|--------|--------|-------|
| expires_at | MODIFY | TIMESTAMPTZ (nullable) | TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days' |

**Migration:**
```sql
-- 1. Definir expiração para convites existentes sem data
UPDATE public.company_invites
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- 2. Tornar coluna obrigatória com default
ALTER TABLE public.company_invites
ALTER COLUMN expires_at SET NOT NULL,
ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '7 days';
```

---

## Entity Relationships

```
profiles (1) ─────────────< (N) user_consents
    │
    │ (1)
    │
    └─────────────────────< (N) audit_logs
    
companies (1) ────────────< (N) audit_logs
    │
    │ (1)
    │
    └─────────────────────< (N) company_invites [modified]

user_settings (1) ────────< (1) profiles
    │
    [ai_api_key_encrypted: BYTEA]
```

---

## Validation Rules

### user_consents

| Field | Validation |
|-------|------------|
| consent_type | IN ('AI_DATA_PROCESSING', 'AI_BIOMETRIC_DATA') |
| version | NOT EMPTY, semver format (e.g., '1.0.0') |
| revoked_at | NULL OR > granted_at |

### audit_logs

| Field | Validation |
|-------|------------|
| action | IN (defined action types) |
| details | Valid JSON object |

### company_invites

| Field | Validation |
|-------|------------|
| expires_at | NOT NULL, >= created_at |
| used_at | NULL OR >= created_at |

---

## Indexes

### user_consents
```sql
CREATE INDEX user_consents_user_id_idx ON user_consents(user_id);
CREATE INDEX user_consents_type_idx ON user_consents(consent_type);
CREATE UNIQUE INDEX user_consents_user_type_unique ON user_consents(user_id, consent_type) 
    WHERE revoked_at IS NULL;
```

### audit_logs
```sql
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_company_id_idx ON audit_logs(company_id);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id);
```

---

## State Transitions

### Consent Lifecycle

```
[NOT_EXISTS] ──grant()──> [ACTIVE]
                              │
                              │ revoke()
                              ▼
                         [REVOKED]
                              │
                              │ grant() (new record)
                              ▼
                         [ACTIVE] (new record)
```

### Invite Token Lifecycle

```
[CREATED] ──────────────> [ACTIVE]
    │                         │
    │ time > expires_at       │ accept()
    ▼                         ▼
[EXPIRED]                 [USED]
    │                         │
    └─────< attempt() >───────┘
              │
              ▼
         [AUDIT_LOG: *_ATTEMPT]
```

---

## Security Considerations

1. **Encryption at Rest**: API keys são armazenadas encriptadas com AES-256 via pgcrypto
2. **RLS Enforcement**: Todas as novas tabelas têm RLS habilitado
3. **Audit Trail**: Operações sensíveis são registradas para compliance LGPD
4. **Consent Versioning**: Permite rastrear qual versão do termo foi aceita
5. **IP Logging**: Registra IP para auditoria e detecção de fraude
