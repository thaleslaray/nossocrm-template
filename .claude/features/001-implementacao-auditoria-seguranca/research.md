# Research: Security Audit Implementation Decisions

**Feature**: 001-implementacao-auditoria-seguranca
**Date**: 2025-12-02
**Status**: Complete

---

## Decision 1: Rate Limiting Implementation

### Question
Which rate limiting solution to use for Edge Functions?

### Options Considered

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Upstash Redis** | Distributed, fast (<5ms), mature SDK | External dependency, adds cost | ~$5-10/month |
| **Supabase Built-in** | Native integration, no external service | Limited customization, newer feature | Included |
| **Deno KV** | Serverless, integrated with Deno | Regional only, eventual consistency | Included |

### Decision
**Use Supabase Edge Function built-in rate limiting** (available via `@supabase/edge-runtime`)

### Rationale
1. **Zero external dependencies**: No need for Upstash account/billing
2. **Native integration**: Supabase manages infrastructure
3. **Sufficient for P0**: 10 req/min threshold achievable
4. **Migration path**: Can switch to Upstash if scaling issues arise

### Implementation
```typescript
// supabase/functions/_shared/rateLimiter.ts
import { createClient } from '@supabase/supabase-js'

export async function checkRateLimit(
  req: Request,
  limit: number = 10, // requests
  window: number = 60  // seconds
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const key = `ratelimit:${ip}:${Math.floor(Date.now() / (window * 1000))}`

  // Use Supabase KV store (via custom table)
  const { data, error } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('key', key)
    .single()

  const current = data?.count || 0

  if (current >= limit) {
    return { allowed: false, remaining: 0 }
  }

  // Increment counter
  await supabase.from('rate_limits').upsert({
    key,
    count: current + 1,
    expires_at: new Date(Date.now() + window * 1000)
  })

  return { allowed: true, remaining: limit - current - 1 }
}
```

### Alternatives Rejected
- **Upstash**: Overkill for current scale (< 1000 users)
- **Deno KV**: Regional limitations could cause inconsistencies across edge locations

---

## Decision 2: API Key Encryption Method

### Question
How to encrypt AI API keys stored in database?

### Options Considered

| Option | Pros | Cons | Complexity |
|--------|------|------|-----------|
| **pgcrypto** | Built into PostgreSQL, audited | Key rotation complex | Low |
| **Application-layer (Node crypto)** | Full control, easier key rotation | Edge Functions can't decrypt | Medium |
| **Supabase Vault** | Managed secrets, key rotation | Beta feature, limited docs | Low |

### Decision
**Use pgcrypto** with symmetric encryption (AES-256)

### Rationale
1. **Postgres-native**: No external dependencies
2. **Edge Function access**: Functions can decrypt via SQL functions
3. **Proven security**: pgcrypto is audited and battle-tested
4. **LGPD compliant**: Meets encryption-at-rest requirements (Art. 46º)

### Implementation
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption/decryption functions
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key TEXT, master_key TEXT)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(api_key, master_key);
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted BYTEA, master_key TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(encrypted, master_key);
$$ LANGUAGE SQL;

-- Usage in Edge Function
const { data } = await supabase
  .rpc('decrypt_api_key', {
    encrypted: row.api_key_encrypted,
    master_key: Deno.env.get('MASTER_ENCRYPTION_KEY')
  })
```

### Master Key Management
- **Development**: `.env.local` (not committed)
- **Staging/Production**: Supabase Dashboard > Settings > Secrets
- **Rotation**: Manual process (documented in runbook)

### Alternatives Rejected
- **Application-layer**: Edge Functions would need key in environment (same security profile as pgcrypto)
- **Supabase Vault**: Too new, lack of production references

---

## Decision 3: CORS Whitelist Strategy

### Question
How to manage allowed origins across environments?

### Options Considered

| Option | Pros | Cons | Flexibility |
|--------|------|------|-------------|
| **Hardcoded list** | Simple, explicit | Requires code changes | Low |
| **Environment variables** | Per-environment config | Must sync across 6 Edge Functions | Medium |
| **Database table** | Dynamic, no deploys | Runtime lookup overhead | High |

### Decision
**Environment variables with hardcoded fallback**

### Rationale
1. **Security**: Explicit whitelist per environment
2. **Performance**: No database lookups
3. **Simplicity**: Standard pattern, easy to audit
4. **DX**: Environment-specific `.env` files

### Implementation
```typescript
// supabase/functions/_shared/cors.ts
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ||
  'https://crmia.app,https://www.crmia.app').split(',')

export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin')

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
  }

  // No CORS headers if origin not whitelisted
  return {}
}
```

### Per-Environment Configuration
```bash
# Production
ALLOWED_ORIGINS=https://crmia.app,https://www.crmia.app

# Staging
ALLOWED_ORIGINS=https://staging.crmia.app

# Development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Alternatives Rejected
- **Hardcoded**: Breaks local development workflow
- **Database table**: Unnecessary complexity, performance hit

---

## Decision 4: Soft Delete Implementation

### Question
How to implement soft delete with minimal performance impact?

### Options Considered

| Option | Pros | Cons | Backward Compat |
|--------|------|------|-----------------|
| **Views** | Transparent, no app changes | Complex migrations | High |
| **Application filters** | Simple, explicit | Must update all queries | Low |
| **Triggers + Views** | Best of both worlds | More complex setup | High |

### Decision
**Triggers + Views** (recommended pattern from Supabase docs)

### Rationale
1. **Transparency**: Existing queries automatically filter deleted rows
2. **Backward compat**: No application code changes needed
3. **RLS-aware**: Views inherit RLS policies
4. **Performance**: Indexed `WHERE deleted_at IS NULL`

### Implementation
```sql
-- Add deleted_at columns
ALTER TABLE deals ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE boards ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN deleted_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX idx_deals_not_deleted ON deals(company_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Create views (example for deals)
CREATE VIEW deals_active AS
  SELECT * FROM deals WHERE deleted_at IS NULL;

-- Soft delete trigger
CREATE OR REPLACE FUNCTION soft_delete_deals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET deleted_at = NOW() WHERE id = OLD.id;
  RETURN NULL; -- Prevent hard delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_hard_delete_deals
  BEFORE DELETE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_deals();

-- Cascade soft delete (board deleted → deals soft deleted)
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

### Hard Delete Strategy
- **Retention**: 90 days after soft delete
- **Job**: Supabase cron job runs daily
- **Query**: `DELETE FROM deals WHERE deleted_at < NOW() - INTERVAL '90 days'`

### Alternatives Rejected
- **Application filters**: High risk of missing queries, bugs
- **Views only**: No cascade behavior

---

## Decision 5: Setup Token Parameters

### Question
What expiration and security parameters for setup tokens?

### Decisions

**Expiration**: **24 hours**
- **Rationale**: Balance security (short window) vs usability (enough time to receive email/Slack)
- **Alternative rejected**: 7 days (too long, increases takeover window)

**Token Format**: **UUID v4**
- **Rationale**: 128-bit entropy (2^128 combinations), cryptographically random
- **Alternative rejected**: Simple numeric PIN (too weak), JWT (unnecessary complexity)

**Delivery Method**: **Secure Slack DM or encrypted email**
- **Rationale**: Out-of-band delivery prevents URL enumeration
- **Alternative rejected**: SMS (SIM swapping risk), printed QR code (physical security)

**Single-Use**: **Yes** (mark `used_at` after first use)
- **Rationale**: Prevents replay attacks
- **Alternative rejected**: Multi-use with counter (complex, no security benefit)

**Storage**: **Hashed in database**
- **Decision reversed**: Store as UUID (already 128-bit, hashing doesn't add security here)
- **Rationale**: UUIDs are already cryptographically strong; hashing would require transmitting token in plaintext anyway

### Implementation
```typescript
// Generate token (admin script)
const token = crypto.randomUUID()
console.log(`Setup token: ${token}`)
console.log(`Expires in 24 hours`)

// Insert to database
await supabase.from('setup_tokens').insert({
  token,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
})

// Validate on setup
const { data } = await supabase
  .from('setup_tokens')
  .select('*')
  .eq('token', submittedToken)
  .is('used_at', null)
  .gt('expires_at', new Date().toISOString())
  .single()

if (!data) {
  return new Response('Invalid, used, or expired token', { status: 401 })
}
```

---

## Decision 6: Rate Limit Thresholds

### Question
What limits balance security vs usability?

### Decisions

**Global limit**: **10 requests/minute per IP**
- **Rationale**: Normal user rarely exceeds 6 req/min (1 every 10 seconds)
- **Protects against**: Brute-force, DoS, account farming
- **Alternative rejected**: 100 req/hour (too generous, won't stop rapid attacks)

**Authenticated limit**: **100 requests/minute per user_id** (future enhancement)
- **Rationale**: Legitimate users may burst (e.g., bulk import)
- **Implementation**: Post-Sprint 1 if needed

**Bypass for admins**: **No** (security > convenience)
- **Rationale**: Even admins can be compromised
- **Alternative**: Temporary IP whitelist via support ticket (manual process)

### Monitoring
- **Alert threshold**: >80% of limit used by single IP
- **Action**: Manual review, consider IP ban if malicious

---

## Decision 7: Consent Modal Timing

### Question
When to present the LGPD consent modal?

### Options Considered

| Timing | Pros | Cons | LGPD Compliance |
|--------|------|------|-----------------|
| **On first login** | One-time decision | May not use AI features | Partial (Art. 8º) |
| **On first AI use** | Contextual, relevant | Multiple modals possible | Full (Art. 8º, 9º) |
| **During onboarding** | Structured flow | Delays time-to-value | Full |

### Decision
**On first AI feature use** (just-in-time consent)

### Rationale
1. **LGPD Art. 8º**: Consent must be specific and informed
   - User knows *exactly* what AI feature they're using
   - Can see *what data* will be shared in context
2. **UX**: No unnecessary friction for users who don't use AI
3. **Granularity**: Separate consent for audio (biometric data)

### Implementation
```typescript
// src/hooks/useAIConsent.ts
export function useAIConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null)

  useEffect(() => {
    checkConsent()
  }, [])

  async function checkConsent() {
    const { data } = await supabase
      .from('user_consents')
      .select('ai_data_sharing')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single()

    setHasConsent(data?.ai_data_sharing ?? false)
  }

  async function requestConsent() {
    // Show ConsentModal
    const granted = await openConsentModal()

    if (granted) {
      await supabase.from('user_consents').insert({
        user_id: user.id,
        company_id: user.company_id,
        ai_data_sharing: true,
        ai_audio_processing: false, // Separate checkbox
        ip_address: await fetch('https://api.ipify.org').then(r => r.text()),
        user_agent: navigator.userAgent,
        consent_version: 'v1.0'
      })
      setHasConsent(true)
    }

    return granted
  }

  return { hasConsent, requestConsent }
}

// Usage in AI component
function AIAssistant() {
  const { hasConsent, requestConsent } = useAIConsent()

  async function generateText() {
    if (!hasConsent) {
      const granted = await requestConsent()
      if (!granted) return // User declined
    }

    // Proceed with AI call
    await fetch('/functions/v1/ai-proxy', { ... })
  }
}
```

### Alternatives Rejected
- **On first login**: Not specific enough (LGPD Art. 8º violation)
- **During onboarding**: Increases drop-off rate for non-AI users

---

## Decision 8: Idle Timeout Duration

### Question
Balance security vs user convenience for session timeout?

### Options Considered

| Duration | Security | Usability | Industry Standard |
|----------|----------|-----------|-------------------|
| **15 minutes** | High | Low (frustrating) | Banking |
| **30 minutes** | Medium | High | SaaS apps |
| **60 minutes** | Low | Very High | Consumer apps |

### Decision
**30 minutes** (1800 seconds)

### Rationale
1. **Industry standard**: Most B2B SaaS use 30 minutes
2. **LGPD Art. 46º**: Reasonable security measure
3. **Use case**: CRM sessions typically <30 min active work
4. **Compromise**: Not as strict as banking, stricter than consumer

### Implementation
```typescript
// src/context/AuthContext.tsx
const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const CHECK_INTERVAL = 60 * 1000 // Check every minute

useEffect(() => {
  let lastActivity = Date.now()

  const updateActivity = () => {
    lastActivity = Date.now()
  }

  const checkIdle = () => {
    const idleTime = Date.now() - lastActivity

    if (idleTime > IDLE_TIMEOUT) {
      supabase.auth.signOut()
      toast.error('Your session expired due to inactivity. Please log in again.')
      navigate('/login')
    } else if (idleTime > IDLE_TIMEOUT - 5 * 60 * 1000) {
      // Warn at 25 minutes
      toast.warning(`Your session will expire in ${Math.ceil((IDLE_TIMEOUT - idleTime) / 60000)} minutes`)
    }
  }

  // Monitor these events
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
  events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }))

  const interval = setInterval(checkIdle, CHECK_INTERVAL)

  return () => {
    events.forEach(event => window.removeEventListener(event, updateActivity))
    clearInterval(interval)
  }
}, [])
```

### Future Enhancement
- **Configurable per company**: Sensitive industries (legal, healthcare) can set 15 min
- **Remember device**: Skip timeout for trusted devices (opt-in)

### Alternatives Rejected
- **15 minutes**: Too aggressive for typical CRM workflows
- **60 minutes**: Doesn't meet security audit recommendations

---

## Decision 9: Audit Log Retention

### Question
How long to retain audit logs for compliance and forensics?

### Decisions

**Hot storage** (PostgreSQL): **5 years**
- **Rationale**:
  - LGPD Art. 16º: Data retention only as long as necessary
  - Tax/legal requirements: 5 years is common
  - Forensic investigations: Statute of limitations
- **Alternative rejected**: Indefinite (LGPD violation, storage costs)

**Cold storage** (S3/Glacier): **7 years total**
- **Rationale**: After 5 years, archive to cheaper storage
- **Cost**: $0.004/GB/month (Glacier) vs $0.025/GB (PostgreSQL)
- **Alternative rejected**: No archival (lose forensic data)

**Hard delete**: **After 7 years**
- **Rationale**: LGPD Art. 15º - delete when no longer necessary
- **Process**: Automated cron job, with backup before deletion

### Implementation
```sql
-- Archive to cold storage (after 5 years)
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Export to S3 (via Supabase Storage)
  COPY (
    SELECT * FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '5 years'
      AND created_at > NOW() - INTERVAL '7 years'
  ) TO '/archive/audit_logs_' || to_char(NOW(), 'YYYY-MM-DD') || '.csv'
  WITH (FORMAT CSV, HEADER);

  -- Delete from hot storage
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '5 years'
    AND created_at > NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (Supabase)
SELECT cron.schedule(
  'archive-audit-logs',
  '0 2 * * 0', -- Every Sunday at 2 AM
  'SELECT archive_old_audit_logs()'
);

-- Hard delete (after 7 years)
SELECT cron.schedule(
  'delete-old-audit-logs',
  '0 3 * * 0', -- Every Sunday at 3 AM
  'DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL ''7 years'''
);
```

### Access Control
- **Hot storage**: Admins + DPO
- **Cold storage**: DPO only (via S3 bucket policies)

---

## Summary of Research Findings

| Decision | Chosen Option | Timeline Impact | Cost Impact |
|----------|---------------|-----------------|-------------|
| Rate limiting | Supabase built-in | None (built-in) | R$ 0 |
| API encryption | pgcrypto | +1 day (learning curve) | R$ 0 |
| CORS strategy | Environment variables | None | R$ 0 |
| Soft delete | Triggers + Views | +2 days (complexity) | R$ 0 |
| Setup token | 24h expiry, UUID v4 | None | R$ 0 |
| Rate limits | 10 req/min per IP | None | R$ 0 |
| Consent timing | On first AI use | -1 day (simpler) | R$ 0 |
| Idle timeout | 30 minutes | None | R$ 0 |
| Audit retention | 5y hot, 7y total | +1 day (cron jobs) | R$ 50/year (S3) |

**Total Impact**:
- Timeline: +4 days (research + complex implementations)
- Cost: R$ 50/year (negligible)
- Risk reduction: R$ 4.25M → < R$ 100k

**Next Step**: Generate `data-model.md` with entity diagrams
