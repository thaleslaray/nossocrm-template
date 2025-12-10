# TypeScript Contracts: Organization ID Migration

## Overview

This document defines the TypeScript interface changes required for the organization_id migration.

---

## 1. Type Aliases

### New Type Aliases (src/types.ts)

```typescript
/**
 * Organization ID - Unique identifier for a tenant (company paying for SaaS)
 * Used for RLS policies and multi-tenant isolation
 */
export type OrganizationId = string;

/**
 * Client Company ID - Unique identifier for a CRM client company
 * Represents a company that is a client/prospect in the CRM
 */
export type ClientCompanyId = string;
```

---

## 2. Core Interfaces

### 2.1 Organization (was Company)

```typescript
// BEFORE
export interface Company {
  id: string;
  name: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// AFTER
export interface Organization {
  id: OrganizationId;
  name: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Backwards compatibility alias (deprecated)
/** @deprecated Use Organization instead */
export type Company = Organization;
```

### 2.2 Profile

```typescript
// BEFORE
export interface Profile {
  id: string;
  company_id: string | null;
  // ...
}

// AFTER
export interface Profile {
  id: string;
  organization_id: OrganizationId | null;
  organizationId: OrganizationId | null; // Convenience alias
  // ...
}
```

### 2.3 CRMCompany (unchanged name, updated FK)

```typescript
// BEFORE
export interface CRMCompany {
  id: string;
  companyId: string; // ambiguous!
  // ...
}

// AFTER
export interface CRMCompany {
  id: ClientCompanyId;
  organizationId: OrganizationId; // tenant FK
  // ...
}
```

### 2.4 Contact

```typescript
// BEFORE
export interface Contact {
  id: string;
  companyId: string; // ambiguous!
  // ...
}

// AFTER
export interface Contact {
  id: string;
  organizationId: OrganizationId;      // tenant FK (RLS)
  clientCompanyId?: ClientCompanyId;   // CRM company FK
  // ...
}
```

### 2.5 Deal

```typescript
// BEFORE
export interface Deal {
  id: string;
  companyId: string; // ambiguous!
  // ...
}

// AFTER
export interface Deal {
  id: string;
  organizationId: OrganizationId;      // tenant FK (RLS)
  clientCompanyId?: ClientCompanyId;   // CRM company FK
  // ...
}
```

### 2.6 Activity

```typescript
// BEFORE
export interface Activity {
  id: string;
  // no companyId visible
}

// AFTER
export interface Activity {
  id: string;
  organizationId: OrganizationId; // explicit tenant FK
  // ...
}
```

### 2.7 Board & BoardStage

```typescript
// BEFORE
export interface Board {
  id: string;
  companyId?: string;
}

// AFTER
export interface Board {
  id: string;
  organizationId: OrganizationId;
}

export interface BoardStage {
  id: string;
  organizationId: OrganizationId;
  boardId: string;
  // ...
}
```

---

## 3. Service Layer Contracts

### 3.1 Supabase Row Types

```typescript
// src/lib/supabase/types.ts

interface DbContact {
  id: string;
  organization_id: string;        // tenant FK (snake_case for DB)
  client_company_id: string | null;
  // ...
}

interface DbDeal {
  id: string;
  organization_id: string;        // tenant FK
  client_company_id: string | null;
  // ...
}

interface DbActivity {
  id: string;
  organization_id: string;        // tenant FK
  // ...
}
```

### 3.2 Service Method Signatures

```typescript
// contacts.ts
export const contactsService = {
  getAll: (organizationId: OrganizationId) => Promise<Contact[]>,
  create: (contact: ContactCreate, organizationId: OrganizationId) => Promise<Contact>,
  update: (id: string, contact: ContactUpdate, organizationId: OrganizationId) => Promise<Contact>,
  delete: (id: string, organizationId: OrganizationId) => Promise<void>,
};

// deals.ts
export const dealsService = {
  getAll: (organizationId: OrganizationId) => Promise<Deal[]>,
  create: (deal: DealCreate, organizationId: OrganizationId) => Promise<Deal>,
  update: (id: string, deal: DealUpdate, organizationId: OrganizationId) => Promise<Deal>,
  delete: (id: string, organizationId: OrganizationId) => Promise<void>,
};

// activities.ts
export const activitiesService = {
  getAll: (organizationId: OrganizationId) => Promise<Activity[]>,
  create: (activity: ActivityCreate, organizationId: OrganizationId) => Promise<Activity>,
  // ...
};
```

---

## 4. Query Hooks Contracts

### 4.1 Hook Parameters

```typescript
// Current pattern (ambiguous)
useCreateActivity({ activity, companyId })

// New pattern (clear)
useCreateActivity({ activity, organizationId })
```

### 4.2 Query Key Structure

```typescript
// Before
queryKeys.activities.all(companyId)

// After
queryKeys.activities.all(organizationId)
```

---

## 5. Context Contracts

### 5.1 AuthContext

```typescript
// BEFORE
interface AuthContextValue {
  profile: Profile | null;
  // profile?.company_id used everywhere
}

// AFTER
interface AuthContextValue {
  profile: Profile | null;
  organizationId: OrganizationId | null; // convenience getter
}

// Usage change
// Before: profile?.company_id
// After: organizationId or profile?.organizationId
```

---

## 6. Edge Function Contracts

### 6.1 Request/Response Types

```typescript
// setup-instance
interface SetupInstanceRequest {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
}

interface SetupInstanceResponse {
  organization: {
    id: OrganizationId;
    name: string;
  };
  admin: {
    id: string;
    email: string;
  };
}

// create-user
interface CreateUserRequest {
  email: string;
  password: string;
  role: 'admin' | 'vendedor';
  organizationId: OrganizationId;
}

// invite-users
interface InviteUsersRequest {
  emails: string[];
  role: 'admin' | 'vendedor';
  organizationId: OrganizationId;
}
```

---

## 7. Validation Schemas (Zod)

```typescript
import { z } from 'zod';

// Type-safe organization ID
export const organizationIdSchema = z.string().uuid();

// Contact with proper FKs
export const contactCreateSchema = z.object({
  name: z.string().min(1),
  organizationId: organizationIdSchema,
  clientCompanyId: organizationIdSchema.nullable().optional(),
  // ...
});

// Deal with proper FKs
export const dealCreateSchema = z.object({
  title: z.string().min(1),
  organizationId: organizationIdSchema,
  clientCompanyId: organizationIdSchema.nullable().optional(),
  // ...
});
```

---

## 8. Migration Utilities

### 8.1 Renamed Utils (lib/supabase/utils.ts)

```typescript
// BEFORE
export function sanitizeUUID(value: unknown): string | null;
export function requireUUID(value: unknown, fieldName: string): string;

// AFTER (same signature, but usage clarified)
export function sanitizeOrganizationId(value: unknown): OrganizationId | null;
export function requireOrganizationId(value: unknown): OrganizationId;
export function sanitizeClientCompanyId(value: unknown): ClientCompanyId | null;

// Backwards compatibility
/** @deprecated Use sanitizeOrganizationId */
export const sanitizeUUID = sanitizeOrganizationId;
```

---

## Summary

| Category | Changes |
|----------|---------|
| New type aliases | 2 (OrganizationId, ClientCompanyId) |
| Interface renames | 1 (Company → Organization) |
| Interface updates | 8 (Profile, CRMCompany, Contact, Deal, Activity, Board, BoardStage, BoardView) |
| Service signatures | ~20 methods across 6 services |
| Query hook params | ~15 hooks |
| Context changes | 1 (AuthContext) |
| Edge function types | 6 functions |
