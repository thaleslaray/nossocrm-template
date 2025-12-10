# SQL Migration Contract

## Overview

This document provides the exact SQL migration script for the organization_id rename.

---

## Migration File

**Filename**: `YYYYMMDDHHMMSS_rename_company_to_organization.sql`

```sql
-- =============================================================================
-- Migration: Rename company_id to organization_id
-- =============================================================================
-- 
-- This migration implements the Clerk/Auth0 naming convention for multi-tenancy.
-- - companies → organizations (tenant table)
-- - company_id → organization_id (tenant FK)
-- - crm_company_id → client_company_id (CRM client FK)
--
-- IMPORTANT: Run in a transaction. Rollback if any step fails.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Phase 1: Rename tenant table
-- -----------------------------------------------------------------------------
ALTER TABLE public.companies RENAME TO organizations;

-- Update sequence comment if exists
COMMENT ON TABLE public.organizations IS 'Tenant organizations (SaaS customers)';

-- -----------------------------------------------------------------------------
-- Phase 2: Rename tenant FK columns (14 tables)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.crm_companies 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.boards 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.board_stages 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.contacts 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.products 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.deals 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.deal_items 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.activities 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.tags 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.custom_field_definitions 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.leads 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.company_invites 
  RENAME COLUMN company_id TO organization_id;

ALTER TABLE public.audit_logs 
  RENAME COLUMN company_id TO organization_id;

-- -----------------------------------------------------------------------------
-- Phase 3: Rename CRM client company FK columns (2 tables)
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts 
  RENAME COLUMN crm_company_id TO client_company_id;

ALTER TABLE public.deals 
  RENAME COLUMN crm_company_id TO client_company_id;

-- -----------------------------------------------------------------------------
-- Phase 4: Rename invites table
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_invites RENAME TO organization_invites;

-- -----------------------------------------------------------------------------
-- Phase 5: Rename helper function
-- -----------------------------------------------------------------------------
-- Drop old function
DROP FUNCTION IF EXISTS get_user_company_id();

-- Create new function
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;

-- -----------------------------------------------------------------------------
-- Phase 6: Rename indexes (16 indexes)
-- -----------------------------------------------------------------------------
ALTER INDEX IF EXISTS profiles_company_id_idx 
  RENAME TO profiles_organization_id_idx;

ALTER INDEX IF EXISTS crm_companies_company_id_idx 
  RENAME TO crm_companies_organization_id_idx;

ALTER INDEX IF EXISTS boards_company_id_idx 
  RENAME TO boards_organization_id_idx;

ALTER INDEX IF EXISTS board_stages_company_id_idx 
  RENAME TO board_stages_organization_id_idx;

ALTER INDEX IF EXISTS contacts_company_id_idx 
  RENAME TO contacts_organization_id_idx;

ALTER INDEX IF EXISTS contacts_crm_company_id_idx 
  RENAME TO contacts_client_company_id_idx;

ALTER INDEX IF EXISTS products_company_id_idx 
  RENAME TO products_organization_id_idx;

ALTER INDEX IF EXISTS deals_company_id_idx 
  RENAME TO deals_organization_id_idx;

ALTER INDEX IF EXISTS deals_crm_company_id_idx 
  RENAME TO deals_client_company_id_idx;

ALTER INDEX IF EXISTS deal_items_company_id_idx 
  RENAME TO deal_items_organization_id_idx;

ALTER INDEX IF EXISTS activities_company_id_idx 
  RENAME TO activities_organization_id_idx;

ALTER INDEX IF EXISTS tags_company_id_idx 
  RENAME TO tags_organization_id_idx;

ALTER INDEX IF EXISTS custom_field_definitions_company_id_idx 
  RENAME TO custom_field_definitions_organization_id_idx;

ALTER INDEX IF EXISTS leads_company_id_idx 
  RENAME TO leads_organization_id_idx;

ALTER INDEX IF EXISTS company_invites_company_id_idx 
  RENAME TO organization_invites_organization_id_idx;

ALTER INDEX IF EXISTS audit_logs_company_id_idx 
  RENAME TO audit_logs_organization_id_idx;

-- -----------------------------------------------------------------------------
-- Phase 7: Update RLS Policies
-- -----------------------------------------------------------------------------
-- Note: Policies use column references that auto-update on rename.
-- But we need to update function calls: get_user_company_id() → get_user_organization_id()

-- organizations (was companies) policies
DROP POLICY IF EXISTS "tenant_isolation_select" ON organizations;
DROP POLICY IF EXISTS "tenant_isolation_update" ON organizations;

CREATE POLICY "tenant_isolation_select" ON public.organizations
FOR SELECT TO authenticated
USING (id = get_user_organization_id() AND deleted_at IS NULL);

CREATE POLICY "tenant_isolation_update" ON public.organizations
FOR UPDATE TO authenticated
USING (id = get_user_organization_id() AND deleted_at IS NULL)
WITH CHECK (id = get_user_organization_id());

-- profiles policies
DROP POLICY IF EXISTS "tenant_isolation_select" ON profiles;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON profiles;
DROP POLICY IF EXISTS "tenant_isolation_update" ON profiles;

CREATE POLICY "tenant_isolation_select" ON public.profiles
FOR SELECT TO authenticated
USING (
    id = (SELECT auth.uid())
    OR organization_id = get_user_organization_id()
);

CREATE POLICY "tenant_isolation_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "tenant_isolation_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- crm_companies policies
DROP POLICY IF EXISTS "tenant_isolation" ON crm_companies;

CREATE POLICY "tenant_isolation" ON public.crm_companies
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- boards policies
DROP POLICY IF EXISTS "tenant_isolation" ON boards;

CREATE POLICY "tenant_isolation" ON public.boards
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- board_stages policies
DROP POLICY IF EXISTS "tenant_isolation" ON board_stages;

CREATE POLICY "tenant_isolation" ON public.board_stages
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- contacts policies
DROP POLICY IF EXISTS "tenant_isolation" ON contacts;

CREATE POLICY "tenant_isolation" ON public.contacts
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- products policies
DROP POLICY IF EXISTS "tenant_isolation" ON products;

CREATE POLICY "tenant_isolation" ON public.products
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- deals policies
DROP POLICY IF EXISTS "tenant_isolation" ON deals;

CREATE POLICY "tenant_isolation" ON public.deals
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- deal_items policies
DROP POLICY IF EXISTS "tenant_isolation" ON deal_items;

CREATE POLICY "tenant_isolation" ON public.deal_items
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- activities policies
DROP POLICY IF EXISTS "tenant_isolation" ON activities;

CREATE POLICY "tenant_isolation" ON public.activities
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- tags policies
DROP POLICY IF EXISTS "tenant_isolation" ON tags;

CREATE POLICY "tenant_isolation" ON public.tags
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- custom_field_definitions policies
DROP POLICY IF EXISTS "tenant_isolation" ON custom_field_definitions;

CREATE POLICY "tenant_isolation" ON public.custom_field_definitions
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- leads policies
DROP POLICY IF EXISTS "tenant_isolation" ON leads;

CREATE POLICY "tenant_isolation" ON public.leads
FOR ALL TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- organization_invites policies (was company_invites)
DROP POLICY IF EXISTS "Admins can view invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can create invites" ON organization_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON organization_invites;
DROP POLICY IF EXISTS "Public can view invite by token" ON organization_invites;

CREATE POLICY "Admins can view invites" ON public.organization_invites
FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization_id() 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can create invites" ON public.organization_invites
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete invites" ON public.organization_invites
FOR DELETE TO authenticated
USING (
  organization_id = get_user_organization_id() 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Public can view invite by token" ON public.organization_invites
FOR SELECT TO anon
USING (expires_at > NOW() AND used_at IS NULL);

-- audit_logs policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view company audit logs" ON audit_logs;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view org audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- -----------------------------------------------------------------------------
-- Phase 8: Update unique constraints
-- -----------------------------------------------------------------------------
ALTER TABLE public.tags 
  DROP CONSTRAINT IF EXISTS tags_name_company_id_key;
ALTER TABLE public.tags 
  ADD CONSTRAINT tags_name_organization_id_key UNIQUE(name, organization_id);

ALTER TABLE public.custom_field_definitions 
  DROP CONSTRAINT IF EXISTS custom_field_definitions_key_company_id_key;
ALTER TABLE public.custom_field_definitions 
  ADD CONSTRAINT custom_field_definitions_key_organization_id_key UNIQUE(key, organization_id);

COMMIT;
```

---

## Rollback Script

If needed, run this to revert:

```sql
-- rollback_organization_to_company.sql
BEGIN;

-- Revert table rename
ALTER TABLE public.organizations RENAME TO companies;
ALTER TABLE public.organization_invites RENAME TO company_invites;

-- Revert column renames (tenant FK)
ALTER TABLE public.profiles RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.crm_companies RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.boards RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.board_stages RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.contacts RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.products RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.deals RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.deal_items RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.activities RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.tags RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.custom_field_definitions RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.leads RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.company_invites RENAME COLUMN organization_id TO company_id;
ALTER TABLE public.audit_logs RENAME COLUMN organization_id TO company_id;

-- Revert client company FK
ALTER TABLE public.contacts RENAME COLUMN client_company_id TO crm_company_id;
ALTER TABLE public.deals RENAME COLUMN client_company_id TO crm_company_id;

-- Revert function
DROP FUNCTION IF EXISTS get_user_organization_id();
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
```

---

## Verification Queries

Run after migration:

```sql
-- Verify no company_id columns remain (except table names)
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'company_id';
-- Expected: 0 rows

-- Verify organization_id exists in all expected tables
SELECT table_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'organization_id'
ORDER BY table_name;
-- Expected: 14 tables

-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'get_user_organization_id';
-- Expected: 1 row

-- Verify policies are active
SELECT tablename, policyname 
FROM pg_policies 
WHERE policyname LIKE '%org%'
ORDER BY tablename;
```
