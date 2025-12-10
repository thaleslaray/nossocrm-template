# Research: Organization ID Migration

## Overview

This document consolidates all research findings to resolve NEEDS CLARIFICATION items from the implementation plan.

---

## 1. Market Standards Analysis

### Decision: Use `organization_id` for tenant isolation

### Rationale
- **Clerk** and **Auth0** (industry leaders in B2B SaaS auth) use `organization_id`
- More semantically correct for B2B contexts ("organization" = company paying for SaaS)
- Clear distinction from `company` which often means "client company" in CRM context
- Aligns with corporate terminology users already understand

### Alternatives Considered

| Pattern | Used By | Pros | Cons |
|---------|---------|------|------|
| `organization_id` | Clerk, Auth0, WorkOS | B2B standard, clear semantics | More characters |
| `account_id` | Stripe, Basejump | Generic, flexible | Ambiguous (user vs org?) |
| `workspace_id` | Slack, Notion | Familiar UX term | Less formal for CRM |
| `tenant_id` | Azure, technical docs | Technically accurate | Too technical for domain |

### Conclusion
`organization_id` is the market standard for B2B SaaS multi-tenancy and provides the clearest semantic distinction from CRM client companies.

---

## 2. Current Codebase Audit

### 2.1 Database Tables (supabase/migrations/)

| Table | Current FK | New FK | Notes |
|-------|------------|--------|-------|
| `companies` | (is tenant table) | → `organizations` | Rename table |
| `profiles` | `company_id` | → `organization_id` | User belongs to org |
| `contacts` | `company_id` | → `organization_id` | Tenant isolation |
| `crm_companies` | `company_id` | → `organization_id` | Client company records |
| `deals` | `company_id` | → `organization_id` | Tenant isolation |
| `boards` | `company_id` | → `organization_id` | Tenant isolation |
| `board_stages` | `company_id` | → `organization_id` | Tenant isolation |
| `activities` | `company_id` | → `organization_id` | Tenant isolation |
| `products` | `company_id` | → `organization_id` | Tenant isolation |
| `tags` | `company_id` | → `organization_id` | Tenant isolation |
| `lifecycle_stages` | `company_id` | → `organization_id` | Tenant isolation |
| `user_settings` | `company_id` | → `organization_id` | Tenant isolation |
| `ai_conversations` | `company_id` | → `organization_id` | Tenant isolation |
| `ai_decisions` | `company_id` | → `organization_id` | Tenant isolation |
| `ai_audio_notes` | `company_id` | → `organization_id` | Tenant isolation |
| `invites` | `company_id` | → `organization_id` | Tenant isolation |

**Total: 16 tables to update**

### 2.2 RLS Policies

```sql
-- Current pattern (20+ occurrences):
CREATE POLICY ... USING ((company_id = ( SELECT get_user_company_id() ...)))

-- New pattern:
CREATE POLICY ... USING ((organization_id = ( SELECT get_user_organization_id() ...)))
```

**Functions to rename:**
- `get_user_company_id()` → `get_user_organization_id()`

### 2.3 TypeScript Inventory

| File Pattern | Occurrences | Action |
|--------------|-------------|--------|
| `src/types.ts` | ~10 | Update interfaces |
| `src/lib/supabase/*.ts` | ~50 | Update service layer |
| `src/lib/query/hooks/*.ts` | ~30 | Update query hooks |
| `src/features/*/hooks/*.ts` | ~40 | Update controllers |
| `src/context/*.tsx` | ~15 | Update context providers |
| Edge Functions | ~30 | Update all 8 functions |

**Estimated total: ~175 TypeScript changes**

### 2.4 Edge Functions Audit

| Function | company_id refs | Changes Needed |
|----------|-----------------|----------------|
| `setup-instance` | 3 | Create org, set metadata, log |
| `create-user` | 1 | Set user organization |
| `delete-user` | 4 | Validate same org, log |
| `list-users` | 5 | Filter by org, return org_id |
| `invite-users` | 4 | Set invite org, metadata |
| `accept-invite` | 4 | Copy org from invite |
| `ai-proxy` | 0 | No changes |
| `_shared/` | TBD | Auth helpers |

---

## 3. Migration Strategy

### Decision: Use SQL migration with column rename (not drop/recreate)

### Rationale
- `ALTER TABLE RENAME COLUMN` preserves data and constraints
- Single transaction ensures atomic migration
- Indexes automatically follow renamed columns
- No data copy needed = faster execution

### Migration Order (Dependency-aware)

```
Phase 1: Rename tenant table
  companies → organizations

Phase 2: Rename FK columns (in dependency order)
  1. profiles.company_id → organization_id
  2. All other tables (can be parallel)

Phase 3: Rename helper function
  get_user_company_id() → get_user_organization_id()

Phase 4: Update RLS policies
  (Must be after column rename)

Phase 5: Update indexes
  (Must be after column rename)
```

### Rollback Plan
```sql
-- Reverse migration if needed
ALTER TABLE organizations RENAME TO companies;
ALTER TABLE profiles RENAME COLUMN organization_id TO company_id;
-- ... etc
```

---

## 4. Semantic Clarifications

### Final Naming Convention

| Concept | Database Name | TypeScript Name | Description |
|---------|---------------|-----------------|-------------|
| **Tenant** | `organizations` | `Organization` | Company paying for SaaS |
| **Tenant FK** | `organization_id` | `organizationId` | FK to organizations table |
| **Client Company** | `crm_companies` | `CRMCompany` | Company in CRM records |
| **Client Company FK** | `crm_company_id` | `clientCompanyId` | FK to crm_companies |

### Interface Changes

```typescript
// BEFORE
interface Deal {
  companyId: string;  // Ambiguous! Tenant or client?
}

// AFTER  
interface Deal {
  organizationId: string;     // Tenant (for RLS)
  clientCompanyId?: string;   // Client company in CRM
}
```

---

## 5. Testing Strategy

### Decision: Update tests alongside code changes

### Test Categories

1. **Unit Tests** (existing, need updates)
   - `src/lib/supabase/*.test.ts` - Mock data uses `company_id`
   - `src/features/*/hooks/*.test.ts` - Controller tests

2. **Integration Tests** (if any)
   - Test RLS policies with new column names

3. **Manual Testing**
   - Login flow (organization assignment)
   - CRUD operations (RLS filtering)
   - Multi-tenant isolation

### Test Migration Checklist
- [ ] Update all mock factories
- [ ] Update all assertion checks
- [ ] Run full test suite after each phase
- [ ] Verify no `company_id` references remain

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | HIGH | Single transaction, backup first |
| Breaking RLS policies | HIGH | Test in staging, ordered migration |
| Missing reference in code | MEDIUM | Grep audit, TypeScript strict mode |
| Edge Function downtime | MEDIUM | Deploy after DB migration |
| Cache invalidation | LOW | Force re-login after deploy |

---

## 7. Open Questions (RESOLVED)

### Q1: Should we update existing data or just schema?
**A:** Schema only. Migration is rename, not data transformation.

### Q2: How to handle in-flight requests during migration?
**A:** Deploy during low-traffic window. Migration is fast (renames only).

### Q3: Should we keep aliases for backwards compatibility?
**A:** No. Clean break is preferred. One migration, one truth.

### Q4: What about `crm_company_id` - rename to `client_company_id`?
**A:** Yes, for consistency. Database: `client_company_id`, TypeScript: `clientCompanyId`.

---

## 8. Dependencies & Versions

| Dependency | Version | Notes |
|------------|---------|-------|
| Supabase | 2.49.4 | Supports RENAME COLUMN |
| PostgreSQL | 15+ | Full ALTER support |
| TypeScript | 5.6.3 | Strict mode enabled |
| Zod | 3.24.1 | Schema validation |

---

## Summary

All NEEDS CLARIFICATION items have been resolved:

1. ✅ Market standard: `organization_id` (Clerk/Auth0 pattern)
2. ✅ Migration strategy: SQL RENAME COLUMN (atomic, preserves data)
3. ✅ 16 tables identified for FK column rename
4. ✅ ~175 TypeScript changes estimated
5. ✅ 8 Edge Functions require updates
6. ✅ Testing strategy: Update alongside code
7. ✅ Semantic naming finalized:
   - `organization_id` = tenant (RLS)
   - `client_company_id` = CRM client company

**Ready for Phase 1: Data Model & Contracts**
