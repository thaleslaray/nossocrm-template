# Data Model: Organization ID Migration

## Overview

This document defines the database schema changes for migrating from `company_id` to `organization_id` pattern.

---

## 1. Entity Renames

### 1.1 Tenant Table

```diff
- companies
+ organizations
```

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | TEXT | Organization name |
| deleted_at | TIMESTAMPTZ | Soft delete |
| created_at | TIMESTAMPTZ | - |
| updated_at | TIMESTAMPTZ | - |

---

## 2. Column Renames (Tenant FK)

All tables with tenant isolation will rename:
```diff
- company_id UUID REFERENCES companies(id)
+ organization_id UUID REFERENCES organizations(id)
```

### Affected Tables

| Table | Current Column | New Column | Cascade |
|-------|----------------|------------|---------|
| profiles | company_id | organization_id | ON DELETE CASCADE |
| crm_companies | company_id | organization_id | ON DELETE CASCADE |
| boards | company_id | organization_id | ON DELETE CASCADE |
| board_stages | company_id | organization_id | ON DELETE CASCADE |
| contacts | company_id | organization_id | ON DELETE CASCADE |
| products | company_id | organization_id | ON DELETE CASCADE |
| deals | company_id | organization_id | ON DELETE CASCADE |
| deal_items | company_id | organization_id | ON DELETE CASCADE |
| activities | company_id | organization_id | ON DELETE CASCADE |
| tags | company_id | organization_id | ON DELETE CASCADE |
| custom_field_definitions | company_id | organization_id | ON DELETE CASCADE |
| leads | company_id | organization_id | ON DELETE CASCADE |
| company_invites | company_id | organization_id | ON DELETE CASCADE |
| audit_logs | company_id | organization_id | ON DELETE SET NULL |

**Total: 14 tables**

---

## 3. Column Renames (Client Company FK)

Tables referencing CRM client companies:

```diff
- crm_company_id UUID REFERENCES crm_companies(id)
+ client_company_id UUID REFERENCES crm_companies(id)
```

### Affected Tables

| Table | Current Column | New Column |
|-------|----------------|------------|
| contacts | crm_company_id | client_company_id |
| deals | crm_company_id | client_company_id |

**Total: 2 tables**

---

## 4. Function Renames

### 4.1 RLS Helper Function

```diff
- get_user_company_id()
+ get_user_organization_id()
```

**Current Implementation:**
```sql
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**New Implementation:**
```sql
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 5. Index Renames

All indexes on `company_id` must be renamed:

| Current Index | New Index |
|---------------|-----------|
| profiles_company_id_idx | profiles_organization_id_idx |
| crm_companies_company_id_idx | crm_companies_organization_id_idx |
| boards_company_id_idx | boards_organization_id_idx |
| board_stages_company_id_idx | board_stages_organization_id_idx |
| contacts_company_id_idx | contacts_organization_id_idx |
| contacts_crm_company_id_idx | contacts_client_company_id_idx |
| products_company_id_idx | products_organization_id_idx |
| deals_company_id_idx | deals_organization_id_idx |
| deals_crm_company_id_idx | deals_client_company_id_idx |
| deal_items_company_id_idx | deal_items_organization_id_idx |
| activities_company_id_idx | activities_organization_id_idx |
| tags_company_id_idx | tags_organization_id_idx |
| custom_field_definitions_company_id_idx | custom_field_definitions_organization_id_idx |
| leads_company_id_idx | leads_organization_id_idx |
| company_invites_company_id_idx | organization_invites_organization_id_idx |
| audit_logs_company_id_idx | audit_logs_organization_id_idx |

**Total: 16 indexes**

---

## 6. RLS Policy Updates

All policies referencing `company_id` must be updated:

### Pattern Change
```diff
- USING ((company_id = ( SELECT get_user_company_id() ...)))
+ USING ((organization_id = ( SELECT get_user_organization_id() ...)))
```

### Affected Policies (per table)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| crm_companies | ✅ | ✅ | ✅ | ✅ |
| boards | ✅ | ✅ | ✅ | ✅ |
| board_stages | ✅ | ✅ | ✅ | ✅ |
| contacts | ✅ | ✅ | ✅ | ✅ |
| products | ✅ | ✅ | ✅ | ✅ |
| deals | ✅ | ✅ | ✅ | ✅ |
| deal_items | ✅ | ✅ | ✅ | ✅ |
| activities | ✅ | ✅ | ✅ | ✅ |
| tags | ✅ | ✅ | ✅ | ✅ |
| leads | ✅ | ✅ | ✅ | ✅ |
| company_invites | ✅ | ✅ | ✅ | ✅ |
| audit_logs | ✅ | ✅ | - | - |

**Estimated: ~50 policy updates**

---

## 7. Related Table Renames

### 7.1 Invites Table

```diff
- company_invites
+ organization_invites
```

---

## 8. Entity Relationship Diagram (Text)

```
┌─────────────────────┐
│   organizations     │  (was: companies)
│   ───────────────   │
│   id (PK)           │
│   name              │
│   deleted_at        │
└─────────┬───────────┘
          │
          │ organization_id (was: company_id)
          │
          ▼
┌─────────────────────┐        ┌─────────────────────┐
│     profiles        │        │   crm_companies     │
│   ───────────────   │        │   ───────────────   │
│   id (PK)           │        │   id (PK)           │
│   organization_id   │───────►│   organization_id   │
│   email             │        │   name              │
│   role              │        └─────────┬───────────┘
└─────────────────────┘                  │
                                         │ client_company_id
                                         │ (was: crm_company_id)
                                         ▼
                            ┌─────────────────────┐
                            │      contacts       │
                            │   ───────────────   │
                            │   id (PK)           │
                            │   organization_id   │
                            │   client_company_id │
                            └─────────────────────┘
```

---

## 9. Migration Script Skeleton

```sql
-- Phase 1: Rename tenant table
ALTER TABLE companies RENAME TO organizations;

-- Phase 2: Rename columns (all tables)
ALTER TABLE profiles RENAME COLUMN company_id TO organization_id;
ALTER TABLE crm_companies RENAME COLUMN company_id TO organization_id;
-- ... (12 more tables)

-- Phase 3: Rename client company FK
ALTER TABLE contacts RENAME COLUMN crm_company_id TO client_company_id;
ALTER TABLE deals RENAME COLUMN crm_company_id TO client_company_id;

-- Phase 4: Rename helper function
ALTER FUNCTION get_user_company_id() RENAME TO get_user_organization_id();
-- Update function body to reference organization_id

-- Phase 5: Rename indexes
ALTER INDEX profiles_company_id_idx RENAME TO profiles_organization_id_idx;
-- ... (15 more indexes)

-- Phase 6: Drop and recreate RLS policies
-- (Cannot rename policies, must drop/create)
```

---

## 10. Validation Queries

After migration, run these to verify:

```sql
-- Check no company_id columns remain
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name LIKE '%company_id%';

-- Should return empty or only expected (crm_companies is OK as table name)

-- Check all organization_id FKs exist
SELECT tc.table_name, kcu.column_name 
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'organization_id';
```

---

## Summary

| Category | Count |
|----------|-------|
| Tables renamed | 2 (companies, company_invites) |
| Columns renamed (tenant FK) | 14 |
| Columns renamed (client FK) | 2 |
| Functions renamed | 1 |
| Indexes renamed | 16 |
| RLS policies updated | ~50 |
