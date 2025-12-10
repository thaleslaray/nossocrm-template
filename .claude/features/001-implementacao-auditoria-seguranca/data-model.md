# Data Model: Security Audit Fixes

**Feature**: 001-implementacao-auditoria-seguranca
**Date**: 2025-12-02

---

## Overview

This feature introduces **4 new tables** and modifies **4 existing tables** to implement security controls and LGPD compliance.

**New Tables**:
1. `setup_tokens` - Single-use tokens for instance setup authentication
2. `user_consents` - LGPD consent tracking for data processing
3. `audit_logs` - Immutable event log for security and compliance
4. `ai_api_keys` - Encrypted API keys for AI providers

**Modified Tables**:
1. `deals` - Add `deleted_at` for soft delete
2. `contacts` - Add `deleted_at` for soft delete
3. `boards` - Add `deleted_at` for soft delete
4. `activities` - Add `deleted_at` for soft delete

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  companies      │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────────┐       ┌──────────────────┐
│  profiles (users)   │───────│  user_consents   │
└────────┬────────────┘  1:1  └──────────────────┘
         │ 1
         │
         │ N
┌────────▼────────────┐
│  audit_logs         │
└─────────────────────┘

┌─────────────────┐       ┌──────────────────┐
│  companies      │───────│  ai_api_keys     │
└─────────────────┘  1:N  └──────────────────┘

┌─────────────────┐
│  setup_tokens   │  (No FK - standalone)
└─────────────────┘

┌─────────────────┐
│  deals          │  (Modified - added deleted_at)
└─────────────────┘

┌─────────────────┐
│  contacts       │  (Modified - added deleted_at)
└─────────────────┘

┌─────────────────┐
│  boards         │  (Modified - added deleted_at)
└─────────────────┘

┌─────────────────┐
│  activities     │  (Modified - added deleted_at)
└─────────────────┘
```

---

## New Entities

### 1. Setup Token

**Purpose**: Prevent unauthorized instance takeover during initial setup

**Table**: `setup_tokens`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated ID |
| `token` | UUID | UNIQUE, NOT NULL | Setup authorization token (UUID v4) |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Token expiration (24 hours from creation) |
| `used_at` | TIMESTAMPTZ | NULL | Timestamp when token was used (NULL = unused) |
| `used_by` | UUID | FK → auth.users(id) | User who used the token |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Token creation timestamp |

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_setup_tokens_token ON setup_tokens(token);
CREATE INDEX idx_setup_tokens_unused ON setup_tokens(token)
  WHERE used_at IS NULL AND expires_at > NOW();
```

**Lifecycle**:
1. **Created**: Admin generates token via CLI/script
2. **Delivered**: Token sent via secure channel (Slack DM, encrypted email)
3. **Validated**: User submits token during setup
4. **Used**: Token marked with `used_at` timestamp
5. **Expired**: Tokens auto-expire after 24 hours (not deletable for audit)

**Validation Rules**:
- Token must be unused (`used_at IS NULL`)
- Token must not be expired (`expires_at > NOW()`)
- Token can only be used once (atomic update with RETURNING)

**Example**:
```sql
-- Generate token
INSERT INTO setup_tokens (token, expires_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  NOW() + INTERVAL '24 hours'
);

-- Validate and mark as used (atomic)
UPDATE setup_tokens
SET used_at = NOW(), used_by = 'user-uuid'
WHERE token = 'submitted-token'
  AND used_at IS NULL
  AND expires_at > NOW()
RETURNING *;
```

---

### 2. User Consent

**Purpose**: LGPD compliance for data processing consent tracking

**Table**: `user_consents`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated ID |
| `user_id` | UUID | FK → auth.users(id) ON DELETE CASCADE | User who granted consent |
| `company_id` | UUID | FK → companies(id) ON DELETE CASCADE | User's company (for RLS) |
| `ai_data_sharing` | BOOLEAN | NOT NULL, DEFAULT FALSE | Consent for AI data sharing (general) |
| `ai_audio_processing` | BOOLEAN | NOT NULL, DEFAULT FALSE | Consent for audio/biometric processing (Art. 8º LGPD) |
| `granted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When consent was granted |
| `revoked_at` | TIMESTAMPTZ | NULL | When consent was revoked (NULL = active) |
| `ip_address` | INET | NULL | IP address when consent granted (audit) |
| `user_agent` | TEXT | NULL | User agent string (audit) |
| `consent_version` | TEXT | NOT NULL, DEFAULT 'v1.0' | Version of consent terms |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Constraints**:
```sql
UNIQUE(user_id, consent_version) -- One consent per user per version
```

**Indexes**:
```sql
CREATE INDEX idx_consents_user_active ON user_consents(user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_consents_company ON user_consents(company_id);
```

**Lifecycle**:
1. **Not Consented**: User has no record (or revoked_at IS NOT NULL)
2. **Modal Shown**: ConsentModal presented on first AI use
3. **Granted**: Record inserted with both boolean flags
4. **Active**: Used to validate AI requests
5. **Revoked**: `revoked_at` set to NOW(), AI features disabled

**Validation Rules**:
- Active consent: `user_id = X AND revoked_at IS NULL`
- Audio consent: `ai_audio_processing = TRUE` (separate checkbox)
- Version tracking: If terms change, new consent required with new `consent_version`

**Example**:
```sql
-- Grant consent
INSERT INTO user_consents (
  user_id,
  company_id,
  ai_data_sharing,
  ai_audio_processing,
  ip_address,
  user_agent,
  consent_version
) VALUES (
  'user-uuid',
  'company-uuid',
  TRUE,  -- General AI consent
  FALSE, -- No audio consent
  '192.168.1.100'::inet,
  'Mozilla/5.0...',
  'v1.0'
);

-- Revoke consent
UPDATE user_consents
SET revoked_at = NOW()
WHERE user_id = 'user-uuid'
  AND consent_version = 'v1.0'
  AND revoked_at IS NULL;

-- Check active consent
SELECT ai_data_sharing, ai_audio_processing
FROM user_consents
WHERE user_id = 'user-uuid'
  AND revoked_at IS NULL
ORDER BY granted_at DESC
LIMIT 1;
```

---

### 3. Audit Log

**Purpose**: Immutable event log for security investigations and LGPD Art. 48º compliance

**Table**: `audit_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated ID |
| `company_id` | UUID | FK → companies(id) ON DELETE CASCADE | Company context (for RLS) |
| `user_id` | UUID | FK → auth.users(id) | User who performed action |
| `action` | TEXT | NOT NULL | Action performed (enum-like: 'CREATE_USER', 'DELETE_USER', etc.) |
| `resource_type` | TEXT | NOT NULL | Type of resource affected ('user', 'deal', 'contact', etc.) |
| `resource_id` | UUID | NULL | ID of affected resource |
| `old_values` | JSONB | NULL | State before action (for updates/deletes) |
| `new_values` | JSONB | NULL | State after action (for creates/updates) |
| `ip_address` | INET | NULL | Client IP address |
| `user_agent` | TEXT | NULL | Client user agent |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Event timestamp (immutable) |

**Indexes**:
```sql
CREATE INDEX idx_audit_logs_company_time ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

**Action Types** (enum-like constants):
- `CREATE_USER`, `DELETE_USER`, `UPDATE_ROLE`
- `CREATE_DEAL`, `DELETE_DEAL`, `UPDATE_DEAL_STATUS`
- `CREATE_CONTACT`, `DELETE_CONTACT`
- `EXPORT_DATA`, `REVOKE_CONSENT`
- `SETUP_INSTANCE`, `ACCEPT_INVITE`

**Lifecycle**:
1. **Triggered**: Critical action performed
2. **Logged**: Immutable record inserted (never updated)
3. **Queried**: Admins/DPO review logs
4. **Archived**: After 5 years, moved to cold storage
5. **Deleted**: After 7 years, hard deleted

**Validation Rules**:
- **Immutability**: No UPDATE or DELETE operations (enforced by policy)
- **Retention**: 5 years hot, 7 years total (automated archive/cleanup)
- **RLS**: Users see only their company's logs

**Example**:
```sql
-- Log user deletion
INSERT INTO audit_logs (
  company_id,
  user_id,
  action,
  resource_type,
  resource_id,
  old_values,
  ip_address,
  user_agent
) VALUES (
  'company-uuid',
  'admin-user-uuid',
  'DELETE_USER',
  'user',
  'deleted-user-uuid',
  jsonb_build_object(
    'email', 'deleted@example.com',
    'role', 'SELLER',
    'name', 'John Doe'
  ),
  '192.168.1.100'::inet,
  'Mozilla/5.0...'
);

-- Query logs (admin dashboard)
SELECT
  action,
  resource_type,
  resource_id,
  old_values,
  new_values,
  created_at
FROM audit_logs
WHERE company_id = 'company-uuid'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;
```

**RLS Policy**:
```sql
CREATE POLICY "Users see own company audit logs" ON audit_logs
  FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Immutable audit logs" ON audit_logs
  FOR ALL
  USING (false); -- Block UPDATE/DELETE
```

---

### 4. AI API Keys

**Purpose**: Encrypted storage of AI provider API keys (never exposed to frontend)

**Table**: `ai_api_keys`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated ID |
| `company_id` | UUID | FK → companies(id) ON DELETE CASCADE | Company owning the key |
| `provider` | TEXT | NOT NULL | AI provider ('anthropic', 'google', 'openai') |
| `api_key_encrypted` | BYTEA | NOT NULL | Encrypted API key (AES-256 via pgcrypto) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Key creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last key rotation timestamp |

**Constraints**:
```sql
UNIQUE(company_id, provider) -- One key per provider per company
CHECK (provider IN ('anthropic', 'google', 'openai'))
```

**Indexes**:
```sql
CREATE INDEX idx_ai_keys_company ON ai_api_keys(company_id, provider);
```

**Lifecycle**:
1. **Configured**: Admin enters API key in settings
2. **Encrypted**: Key encrypted with master key via pgcrypto
3. **Stored**: Encrypted BYTEA stored in database
4. **Used**: Edge Function decrypts key for AI requests
5. **Rotated**: Admin updates key (new encryption, old key overwritten)

**Encryption/Decryption**:
```sql
-- Encrypt API key (on insert/update)
INSERT INTO ai_api_keys (company_id, provider, api_key_encrypted)
VALUES (
  'company-uuid',
  'anthropic',
  pgp_sym_encrypt('sk-ant-xxxxx', current_setting('app.master_key'))
);

-- Decrypt API key (Edge Function usage)
SELECT pgp_sym_decrypt(api_key_encrypted, current_setting('app.master_key'))::text AS api_key
FROM ai_api_keys
WHERE company_id = 'company-uuid'
  AND provider = 'anthropic';
```

**Security**:
- **Master Key**: Stored in Supabase environment variables (not in code)
- **Access**: Only Edge Functions (Service Role) can decrypt
- **Rotation**: 90-day rotation recommended (manual process)

**RLS Policy**:
```sql
CREATE POLICY "Company owns AI keys" ON ai_api_keys
  FOR ALL
  USING (company_id = get_user_company_id());
```

---

## Modified Entities

### Soft Delete Pattern

All 4 tables (`deals`, `contacts`, `boards`, `activities`) receive the same modification:

**New Column**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete timestamp (NULL = active) |

**Migration**:
```sql
ALTER TABLE deals ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE boards ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN deleted_at TIMESTAMPTZ;
```

**Indexes**:
```sql
CREATE INDEX idx_deals_not_deleted ON deals(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_not_deleted ON contacts(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_boards_not_deleted ON boards(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_not_deleted ON activities(company_id) WHERE deleted_at IS NULL;
```

**Views** (backward compatibility):
```sql
CREATE VIEW deals_active AS
  SELECT * FROM deals WHERE deleted_at IS NULL;

CREATE VIEW contacts_active AS
  SELECT * FROM contacts WHERE deleted_at IS NULL;

CREATE VIEW boards_active AS
  SELECT * FROM boards WHERE deleted_at IS NULL;

CREATE VIEW activities_active AS
  SELECT * FROM activities WHERE deleted_at IS NULL;
```

**Triggers** (prevent hard delete):
```sql
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET deleted_at = NOW() WHERE id = OLD.id;
  RETURN NULL; -- Prevent hard delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_hard_delete_deals
  BEFORE DELETE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete();

-- Repeat for contacts, boards, activities
```

**Cascade Soft Delete** (board deleted → deals soft deleted):
```sql
CREATE OR REPLACE FUNCTION cascade_soft_delete_deals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET deleted_at = NEW.deleted_at
  WHERE board_id = NEW.id AND deleted_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_board_delete
  AFTER UPDATE OF deleted_at ON boards
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION cascade_soft_delete_deals();
```

**Hard Delete Cron Job**:
```sql
SELECT cron.schedule(
  'cleanup-soft-deleted',
  '0 4 * * 0', -- Every Sunday at 4 AM
  $$
    DELETE FROM deals WHERE deleted_at < NOW() - INTERVAL '90 days';
    DELETE FROM contacts WHERE deleted_at < NOW() - INTERVAL '90 days';
    DELETE FROM boards WHERE deleted_at < NOW() - INTERVAL '90 days';
    DELETE FROM activities WHERE deleted_at < NOW() - INTERVAL '90 days';
  $$
);
```

---

## State Transitions

### Setup Token States

```
┌─────────┐
│ Created │
│ (unused)│
└────┬────┘
     │ Submit valid token
     ▼
┌─────────┐
│  Used   │
│ (marked)│
└────┬────┘
     │ 24h later (auto)
     ▼
┌─────────┐
│ Expired │
│ (audit) │
└─────────┘
```

### User Consent States

```
┌────────────┐
│ No Consent │
└─────┬──────┘
      │ User grants
      ▼
┌────────────┐
│   Active   │
└─────┬──────┘
      │ User revokes
      ▼
┌────────────┐
│  Revoked   │
└────────────┘
```

### Soft Delete States

```
┌────────┐
│ Active │
│ (NULL) │
└───┬────┘
    │ User deletes
    ▼
┌────────────┐
│ Soft Deleted│
│ (timestamp) │
└─────┬───────┘
      │ 90 days later (auto)
      ▼
┌─────────────┐
│ Hard Deleted│
│  (removed)  │
└─────────────┘
```

---

## Summary

**Database Impact**:
- **New Tables**: 4 (setup_tokens, user_consents, audit_logs, ai_api_keys)
- **Modified Tables**: 4 (deals, contacts, boards, activities)
- **New Indexes**: 15
- **New Views**: 4 (for backward compatibility)
- **New Triggers**: 8 (soft delete, cascade, audit)
- **New Cron Jobs**: 2 (archive audit logs, cleanup soft deletes)

**Storage Estimates** (1000 users, 10000 deals):
- `setup_tokens`: ~1 KB (1-5 records total)
- `user_consents`: ~100 KB (1000 users × 100 bytes/record)
- `audit_logs`: ~500 MB/year (assuming 10k events/month × 4 KB/event)
- `ai_api_keys`: ~1 KB (3 providers per company × 100 bytes)
- Soft delete overhead: ~5% (deleted_at column on existing tables)

**Performance Impact**:
- RLS policies: +5-10ms per query (acceptable)
- Soft delete filters: +2ms with indexes
- Audit log inserts: Async, non-blocking
- API key decryption: +1-3ms (pgcrypto overhead)

**Next Step**: Create API contracts in `/contracts/` directory
