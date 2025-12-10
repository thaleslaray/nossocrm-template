# Implementation Plan: Correção Completa de Vulnerabilidades de Segurança e Conformidade LGPD

**Feature Number**: 001
**Status**: Planning Complete
**Created**: 2025-12-02
**Parent Branch**: main

---

## Overview

Implementar correções para 24 vulnerabilidades de segurança identificadas em auditoria OWASP/LGPD, organizadas em 5 sprints (Sprint 0 a Sprint 4), eliminando riscos críticos de R$ 4.25M e garantindo conformidade legal.

---

## Technical Context

### Architecture Patterns

**Multi-Tenant Isolation (Defense-in-Depth)**:
- **Layer 1 - Database**: PostgreSQL Row Level Security (RLS) policies
- **Layer 2 - Application**: Explicit `company_id` validation in TypeScript services
- **Layer 3 - Edge Functions**: JWT claims validation + company_id filtering
- **Pattern**: Every data access validates tenant isolation in at least 2 layers

**Authentication & Authorization**:
- **Current**: Supabase Auth (JWT-based)
- **Enhancement**: Setup token validation, admin role checks, idle timeout
- **Pattern**: Service Role for system operations, User JWT for client operations

**Consent Management (LGPD)**:
- **Pattern**: Explicit opt-in before data processing
- **Storage**: `user_consents` table with versioned terms
- **Validation**: Server-side consent check before AI API calls

**Audit Logging**:
- **Pattern**: Immutable append-only logs
- **Trigger**: Critical operations (DELETE_USER, UPDATE_ROLE, EXPORT_DATA)
- **Storage**: `audit_logs` table with JSONB old/new values

**Rate Limiting**:
- **Implementation**: Upstash Redis (or Supabase built-in)
- **Pattern**: Token bucket algorithm, 10 req/min per IP
- **Edge Functions**: Middleware pattern for all functions

### Tech Stack

**Frontend**:
- React 19.2 (functional components, hooks)
- React Router 7.9 (routing, loaders, actions)
- Zustand 5.0 (consent state, session management)
- React Hook Form 7.67 + Zod 4.1 (validation schemas with `.max()`)
- TanStack Query 5.90 (server state, optimistic updates)
- Tailwind CSS 3.4 + Radix UI (consent modal, alerts)

**Backend**:
- Supabase 2.86+ (PostgreSQL 17, Auth, Edge Functions)
- Deno (Edge Functions runtime)
- TypeScript 5.9 (strict mode)

**Security & Compliance**:
- pgcrypto (PostgreSQL extension for API key encryption)
- Vercel (CSP headers, CORS config)
- Upstash Redis (rate limiting store)

**Testing**:
- Vitest 4.0 (unit tests for validation, isolation checks)
- Testing Library 16.3 (consent modal, error messages)
- Playwright (E2E security tests)

**AI Integrations** (via proxy):
- Vercel AI SDK 6.0 (unified interface)
- @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai (provider SDKs)

### Database Schema Changes

**New Tables**:

```sql
-- Setup token (VULN-001)
CREATE TABLE setup_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User consents (VULN-003, LGPD)
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ai_data_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  ai_audio_processing BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, consent_version)
);

-- Audit logs (VULN-023)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'CREATE_USER', 'DELETE_USER', 'UPDATE_ROLE', etc.
  resource_type TEXT NOT NULL, -- 'user', 'deal', 'contact'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys encrypted (VULN-002)
CREATE TABLE ai_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'anthropic', 'google', 'openai'
  api_key_encrypted BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider)
);
```

**Schema Modifications**:

```sql
-- Add deleted_at for soft delete (VULN-024)
ALTER TABLE deals ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE boards ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_consents_user ON user_consents(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_deleted_deals ON deals(company_id) WHERE deleted_at IS NULL;
```

**RLS Policy Updates**:

```sql
-- Fix public policy (VULN-011)
DROP POLICY IF EXISTS "Public can view invite by token" ON company_invites;

-- Consistent RLS using get_user_company_id()
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- Apply to all tables
CREATE POLICY "Users see own company data" ON deals
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users see own company data" ON contacts
  FOR ALL USING (company_id = get_user_company_id());

-- Audit logs: users see only own company
CREATE POLICY "Company audit logs" ON audit_logs
  FOR SELECT USING (company_id = get_user_company_id());

-- Consents: users see only own consents
CREATE POLICY "Own consents only" ON user_consents
  FOR ALL USING (user_id = auth.uid());
```

### API Changes

**New Edge Functions**:

1. **ai-proxy** (VULN-002)
   - Endpoint: `/functions/v1/ai-proxy`
   - Method: POST
   - Auth: Required (JWT)
   - Validates consent before calling AI providers
   - Decrypts API keys from `ai_api_keys` table
   - Proxies requests to Anthropic/Google/OpenAI
   - Returns AI response to frontend

2. **validate-setup-token** (VULN-001)
   - Endpoint: `/functions/v1/validate-setup-token`
   - Method: POST
   - Body: `{ token: string }`
   - Returns: `{ valid: boolean, alreadyUsed: boolean }`

**Modified Edge Functions**:

1. **setup-instance** (VULN-001)
   - Add token validation before creating admin
   - Mark token as used after successful setup
   - Return 401 if token invalid
   - Return 403 if setup already completed

2. **delete-user** (VULN-004)
   - Add cross-tenant validation
   - Verify `targetProfile.company_id === currentUser.company_id`
   - Log to audit_logs before deletion
   - Return 403 if cross-tenant attempt

3. **accept-invite** (VULN-005)
   - Restore `.is("used_at", null)` check
   - Mark `used_at` after acceptance
   - Check `expires_at` validity
   - Return 400 if expired or already used

4. **list-users** (VULN-015, VULN-016)
   - Add admin role check: `if (profile.role !== 'admin') throw Error()`
   - Remove unpaginated `admin.listUsers()`
   - Use `profiles` table filtered by RLS
   - Optional: Implement pagination (PAGE_SIZE=100)

5. **invite-users**, **create-user** (VULN-017, VULN-019)
   - CORS: Replace `*` with whitelist
   - Move company_id from URL to request body
   - Validate company_id matches auth user

6. **All Edge Functions** (VULN-019, VULN-020)
   - Add CORS whitelist (production, staging, dev origins)
   - Add rate limiting middleware (10 req/min per IP)
   - Return 429 if rate limit exceeded

### Frontend Changes

**New Components**:

1. **ConsentModal** (`src/components/ConsentModal.tsx`)
   - Appears on first AI feature use
   - Two checkboxes: ai_data_sharing, ai_audio_processing
   - Clear explanation of data sharing (LGPD Art. 8º, 9º)
   - POST to `/api/consents` on acceptance
   - Zustand store for consent state

2. **SetupTokenInput** (`src/pages/Setup.tsx`)
   - Input field for setup token
   - Validates token via `/functions/v1/validate-setup-token`
   - Shows error if invalid/used
   - Proceeds to company creation if valid

3. **AuditLogDashboard** (`src/pages/admin/AuditLogs.tsx`)
   - Table showing recent audit logs
   - Filters: date range, action type, user
   - Only visible to admins
   - Real-time updates via TanStack Query

**Modified Services**:

All services in `src/lib/supabase/` (deals, contacts, boards, activities):

```typescript
// Defense-in-depth pattern (VULN-012)
async update(id: string, updates: Partial<T>): Promise<{ error: Error | null }> {
  // Layer 1: Fetch resource to get company_id
  const { data: resource } = await supabase
    .from(tableName)
    .select('company_id')
    .eq('id', id)
    .single();

  if (!resource) return { error: new Error('Resource not found') };

  // Layer 2: Verify company_id matches user's company
  const userCompanyId = await getUserCompanyId();
  if (resource.company_id !== userCompanyId) {
    return { error: new Error('Unauthorized: Cross-tenant access denied') };
  }

  // Layer 3: RLS + explicit company_id filter
  const { error } = await supabase
    .from(tableName)
    .update(dbUpdates)
    .eq('id', id)
    .eq('company_id', userCompanyId); // Explicit filter!

  return { error };
}
```

**New Validations** (VULN-018):

```typescript
// src/lib/validations/schemas.ts
export const requiredString = (field: string, maxLength: number = 255) =>
  z.string({ message: msg('FIELD_REQUIRED', { field }) })
    .min(1, msg('FIELD_REQUIRED', { field }))
    .max(maxLength, `${field} must be ${maxLength} characters or less`);

// Apply to all schemas
export const contactSchema = z.object({
  name: requiredString('Name', 100),
  email: requiredString('Email', 255).email(),
  phone: requiredString('Phone', 50),
  role: requiredString('Role', 50),
  companyId: z.string().uuid(),
});
```

**Session Management** (VULN-022):

```typescript
// src/context/AuthContext.tsx
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

useEffect(() => {
  let lastActivity = Date.now();

  const updateActivity = () => {
    lastActivity = Date.now();
  };

  const checkIdle = () => {
    if (Date.now() - lastActivity > IDLE_TIMEOUT) {
      supabase.auth.signOut();
      toast.error('Session expired due to inactivity');
    }
  };

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => window.addEventListener(event, updateActivity));

  const interval = setInterval(checkIdle, 60 * 1000); // Check every minute

  return () => {
    events.forEach(event => window.removeEventListener(event, updateActivity));
    clearInterval(interval);
  };
}, []);
```

### Infrastructure Changes

**vercel.json** (VULN-021):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' *.supabase.co *.googleapis.com *.openai.com *.anthropic.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

**.env.example** (VULN-002):

```bash
# ❌ NEVER commit VITE_* API keys (exposed in bundle)
# VITE_GEMINI_API_KEY=xxx  <- REMOVED

# ✅ Server-side only (Supabase environment variables)
# Configured in Supabase Dashboard > Settings > API
# GEMINI_API_KEY=xxx
# OPENAI_API_KEY=xxx
# ANTHROPIC_API_KEY=xxx

# ✅ Public Supabase config (safe to expose)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Dependencies

**No new npm packages required** - all within approved tech stack:
- Supabase client (already installed)
- Zod 4.1 (already installed)
- React Hook Form 7.67 (already installed)
- TanStack Query 5.90 (already installed)
- Radix UI popovers/tooltips (already installed)

**Supabase extensions** (enable via migrations):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- For API key encryption
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For UUID generation
```

**External services**:
- Upstash Redis (for rate limiting) - optional, can use Supabase built-in
- DPA signatures from Google, OpenAI, Anthropic (legal process)

### Security Considerations

**Threat Model**:
1. **Unauthenticated Setup Takeover** (VULN-001) → Mitigated by setup token
2. **API Key Theft** (VULN-002) → Mitigated by server-side proxy
3. **Cross-Tenant Data Access** (VULN-004, VULN-012) → Mitigated by defense-in-depth
4. **LGPD Violations** (VULN-003) → Mitigated by consent management
5. **DoS via Rate Limiting** (VULN-015, VULN-020) → Mitigated by rate limiter
6. **CORS Exploitation** (VULN-019) → Mitigated by whitelist

**Cryptography**:
- API keys: AES-256 encryption via pgcrypto
- Setup tokens: UUID v4 (128-bit entropy)
- Passwords: Supabase Auth (bcrypt)
- JWTs: RS256 signatures (Supabase default)

**Compliance**:
- LGPD Art. 7º, 8º: Explicit consent before data processing
- LGPD Art. 46º: Encryption at rest and in transit (TLS 1.3)
- LGPD Art. 48º: Audit logs for traceability
- LGPD Art. 18º: User rights (export, delete, revoke consent)

### Performance Implications

**Database**:
- RLS policies: ~5-10ms overhead per query (acceptable)
- Audit log inserts: Async, non-blocking
- Soft delete filters: Add `WHERE deleted_at IS NULL` to indexes

**Edge Functions**:
- Rate limiter: Redis lookup ~2-5ms
- Consent check: Single SELECT query ~5ms
- API key decryption: ~1-3ms
- **Total overhead**: ~10-15ms per AI request (acceptable for 500ms SLA)

**Frontend**:
- Consent modal: Lazy-loaded, no bundle impact
- Idle timeout: 1 event listener, negligible
- Defense-in-depth checks: No user-facing latency (server-side)

**Optimizations**:
- Cache consent status in Zustand (avoid repeated DB queries)
- Batch audit logs (insert every 5s instead of per-action)
- Use prepared statements for defense-in-depth queries

### Testing Strategy

**Unit Tests** (Vitest):
- Validation schemas with `.max()` limits
- `sanitizeUUID()` utility
- Defense-in-depth service methods
- Consent state management (Zustand)

**Integration Tests** (Testing Library):
- ConsentModal flow (open → check boxes → submit)
- SetupTokenInput validation errors
- Idle timeout behavior (mock timers)
- Soft delete filters in list views

**E2E Security Tests** (Playwright):
- Setup without token → 401 error
- Cross-tenant delete attempt → 403 error
- Token reuse attempt → 400 error
- Rate limit exceeded → 429 error
- Expired invite acceptance → 400 error
- Non-admin list-users call → 403 error

**Penetration Testing**:
- OWASP ZAP automated scan
- Manual Burp Suite testing
- External pentest firm (recommended)

---

## Tech Stack Compliance Report

### ✅ Approved Technologies (already in stack)

All technologies in this implementation plan use the approved tech stack:

- **TypeScript 5.9**: All new code in strict mode
- **React 19.2**: ConsentModal, AuditLogDashboard as functional components
- **React Router 7.9**: No changes to routing
- **Zustand 5.0**: Consent state management
- **React Hook Form 7.67 + Zod 4.1**: Enhanced validation with `.max()`
- **TanStack Query 5.90**: Audit logs, consent queries
- **Supabase 2.86**: All backend operations
- **Tailwind CSS 3.4 + Radix UI**: ConsentModal styling
- **Vitest 4.0 + Testing Library 16.3**: Security test coverage

### ➕ New Technologies (auto-added)

**None** - All required technologies already in approved stack.

### ⚠️ Conflicting Technologies

**None** - No conflicts detected.

### ❌ Prohibited Technologies

**Verified** - No prohibited technologies used:
- ✅ No Axios (using native fetch via Supabase client)
- ✅ No Redux (using Zustand)
- ✅ No class components (all functional)
- ✅ No CSS-in-JS (using Tailwind)

---

## Constitution Check

**Constitution file status**: Not yet created (`.specswarm/constitution.md` missing)

**Recommendation**: Run `/specswarm:constitution` after this feature to formalize principles:
- Principle 1: Security-first development
- Principle 2: LGPD compliance by default
- Principle 3: Defense-in-depth architecture
- Principle 4: Zero-trust multi-tenancy
- Principle 5: Approved tech stack enforcement (references `.specswarm/tech-stack.md`)

**Assumed Principles** (based on spec.md):
1. **Security > Convenience**: Friction (consent modal, setup token) accepted for security
2. **Compliance is Mandatory**: LGPD requirements non-negotiable
3. **Defense-in-Depth**: Never rely on single security layer
4. **Testability**: Every security control must have automated test
5. **Zero Downtime**: Incremental rollout, backward compatibility

**No violations detected** in this implementation plan.

---

## Implementation Phases

### Phase 0: Research & Decisions (1 day)

**Research Topics**:
1. Rate limiting: Upstash Redis vs Supabase built-in vs Deno KV
2. API key encryption: pgcrypto vs application-layer crypto
3. CORS whitelist: Environment-specific vs dynamic discovery
4. Soft delete: DB views vs application filters
5. Audit log storage: Hot vs cold storage strategy

**Decisions to Document**:
- Setup token expiration: 24 hours or 7 days?
- Rate limit threshold: 10 req/min or 100 req/hr?
- Consent modal: On first AI use or on first login?
- Idle timeout: 15 min, 30 min, or 60 min?
- Audit log retention: 5 years, 7 years, or indefinite?

**Output**: `research.md` with rationale for each decision

### Phase 1: Database & API Design (2 days)

**Database**:
1. Create migration `001_security_audit_fixes.sql`
2. Add tables: setup_tokens, user_consents, audit_logs, ai_api_keys
3. Add columns: deleted_at on 4 tables
4. Update RLS policies (drop public, add get_user_company_id())
5. Add indexes for performance

**API Contracts**:
1. OpenAPI spec for new Edge Functions (ai-proxy, validate-setup-token)
2. Update specs for modified functions (setup-instance, delete-user, etc.)
3. Document error responses (401, 403, 429, etc.)

**Output**:
- `data-model.md` (entity diagrams, relationships)
- `/contracts/api.openapi.yaml`

### Phase 2: Sprint 0 - Containment (1-2 days)

**Tasks** (from spec.md REQ-S0):
1. Comment out setup-instance Edge Function temporarily
2. Remove `VITE_GEMINI_API_KEY` from .env and rebuild
3. Fix company_invites RLS policy (drop public policy)
4. Add banner: "AI features temporarily disabled for security upgrades"
5. Notify stakeholders (CEO, CTO, Legal)

**Validation**:
- ✅ Setup cannot be called
- ✅ No API keys in bundle (inspect Network tab)
- ✅ Anonymous users cannot list invites
- ✅ Banner visible on app

### Phase 3: Sprint 1 - P0 Critical (1 week)

**Tasks** (from spec.md REQ-S1):
1. Implement setup token validation
2. Create ai-proxy Edge Function
3. Implement consent management (table + modal + validation)
4. Add rate limiting to all Edge Functions
5. Restore setup-instance with token requirement
6. Write unit + E2E tests for P0 fixes

**Validation**:
- ✅ Setup without token → 401
- ✅ AI calls without consent → error
- ✅ 20 requests in 10s → last 10 blocked (429)
- ✅ No API keys leaked in bundle

### Phase 4: Sprint 2 - Multi-Tenant Isolation (1 week)

**Tasks** (from spec.md REQ-S2):
1. Add cross-tenant validation to delete-user
2. Fix token reuse in accept-invite
3. Standardize RLS policies (get_user_company_id())
4. Implement defense-in-depth in all services (deals, contacts, boards, activities)
5. Create audit log triggers
6. DPA documentation (legal team)

**Validation**:
- ✅ Cross-tenant delete → 403 + audit log
- ✅ Token reuse → 400
- ✅ All RLS policies consistent
- ✅ Defense-in-depth tests pass

### Phase 5: Sprint 3 - Hardening (1 week)

**Tasks** (from spec.md REQ-S3):
1. CORS whitelist (production, staging, dev origins)
2. CSP headers in vercel.json
3. Add `.max()` to all Zod schemas
4. Refactor list-users (pagination or profiles-only)
5. Add admin role check to list-users
6. Explicit company_id in boards.addStage() and deals.create()

**Validation**:
- ✅ Request from unknown origin → CORS error
- ✅ CSP headers present in response
- ✅ 1000-char input → validation error
- ✅ Vendedor calling list-users → 403

### Phase 6: Sprint 4 - Compliance & Monitoring (1 week)

**Tasks** (from spec.md REQ-S4):
1. Complete audit log dashboard
2. Implement soft delete + cascade triggers
3. Create data export endpoints (LGPD Art. 18º)
4. Idle timeout in AuthContext
5. DPAs finalized with AI partners
6. RIPD (Relatório de Impacto) approval

**Validation**:
- ✅ All critical actions logged
- ✅ Soft delete preserves data
- ✅ Data export returns complete JSON
- ✅ 31 min idle → logout

### Phase 7: Sprint 5 - Testing & Docs (3-5 days)

**Tasks** (from spec.md REQ-S5):
1. OWASP ZAP automated scan
2. Burp Suite manual testing
3. External pentest (optional)
4. Security documentation
5. Incident response plan
6. Team training (2h session)

**Validation**:
- ✅ All 24 vulnerabilities resolved
- ✅ Zero critical findings in pentest
- ✅ Documentation complete
- ✅ Team trained

---

## Rollout Strategy

**Environment Progression**:
1. **Local**: Developer testing
2. **Staging**: Full E2E test suite
3. **Production**: Incremental rollout with feature flags

**Sprint-by-Sprint Rollout**:
- **Sprint 0**: Immediate deploy (containment)
- **Sprints 1-4**: Deploy to staging → validate → production (weekly)
- **Sprint 5**: Final validation → production cutover

**Feature Flags**:
```typescript
// src/lib/featureFlags.ts
export const SECURITY_FEATURES = {
  SETUP_TOKEN: true, // Sprint 1
  CONSENT_MODAL: true, // Sprint 1
  RATE_LIMITING: true, // Sprint 1
  DEFENSE_IN_DEPTH: true, // Sprint 2
  AUDIT_LOGS: true, // Sprint 4
  IDLE_TIMEOUT: true, // Sprint 4
};
```

**Rollback Plan**:
- Git revert per sprint
- Database migrations: Write down migrations for each sprint
- Feature flags: Disable via environment variable

**Monitoring**:
- Sentry: Track 401/403/429 error rates
- Supabase Dashboard: Monitor RLS policy performance
- Audit logs: Alert on suspicious patterns (>5 cross-tenant attempts)

---

## Risk Mitigation

**Risk**: Setup token leaked before first use
- **Mitigation**: 24-hour expiration, single-use, sent via secure channel
- **Fallback**: Manual database insert for emergency setup

**Risk**: Consent modal breaks AI features
- **Mitigation**: Feature flag to bypass (emergency only)
- **Fallback**: Backend check remains (LGPD compliance)

**Risk**: Rate limiting blocks legitimate users
- **Mitigation**: 10 req/min threshold (generous for normal use)
- **Fallback**: Whitelist IPs for admins

**Risk**: Defense-in-depth queries slow down app
- **Mitigation**: Indexed queries, prepared statements
- **Fallback**: Profile with pg_stat_statements, optimize hot paths

**Risk**: DPA negotiations delay launch
- **Mitigation**: Start legal process immediately (Sprint 0)
- **Fallback**: Disable AI features until DPAs signed

---

## Success Metrics

**Security** (from spec.md Success Criteria):
1. Zero vulnerabilities CVSS >= 9.0 remaining
2. 100% cross-tenant attempts blocked (403 error rate)
3. Zero API keys in bundle (automated scan)
4. 100% setup attempts without token blocked
5. 95% brute-force attacks blocked by rate limiter
6. 100% critical actions in audit logs

**Compliance**:
7. 100% AI users with explicit consent
8. 3/3 DPAs signed (Google, OpenAI, Anthropic)
9. RIPD approved by DPO + Legal
10. 95% user rights requests fulfilled < 15 days

**Performance**:
11. AI proxy overhead < 500ms (p95)
12. Defense-in-depth queries < 50ms (p95)
13. Consent modal load < 100ms

**Operational**:
14. Zero downtime during rollout
15. >= 90% test coverage for security code
16. 100% team trained on new practices

---

## Next Steps

1. **Review this plan** with team
2. **Create research.md** (Phase 0)
3. **Generate data-model.md** (Phase 1)
4. **Create API contracts** (Phase 1)
5. **Run `/specswarm:tasks`** to generate task breakdown
6. **Run `/specswarm:implement`** to execute tasks

**Estimated Timeline**: 5-6 weeks (25.5 person-days)
**Estimated Cost**: R$ 150,000 (development + consultoria + pentesting)
**Risk Reduction**: R$ 4.25M → < R$ 100k (98%)
