# Claude Agent Context

**Project**: CRMIA - Modern CRM Platform
**Last Updated**: 2025-12-02
**Tech Stack Version**: 1.0.0

---

<!-- AUTO-GENERATED-START -->
## Tech Stack (from .specswarm/tech-stack.md)

### Core Technologies
- **Language**: TypeScript 5.9+ (strict mode)
- **Runtime**: Node.js (via Vite 7.2+)
- **Frontend Framework**: React 19.2+ (functional components only)
- **Routing**: React Router 7.9+
- **Build Tool**: Vite 7.2+
- **Database**: Supabase (PostgreSQL 17)

### State Management
- **Global State**: Zustand 5.0+
- **Server State**: TanStack Query 5.90+
- **Form State**: React Hook Form 7.67+
- **Validation**: Zod 4.1+

### UI & Styling
- **Styling**: Tailwind CSS 3.4+
- **Components**: Radix UI (headless accessible primitives)
- **Icons**: Lucide React 0.554+
- **Utilities**: clsx 2.1+, tailwind-merge 3.4+

### Backend & Data
- **BaaS**: Supabase 2.86+ (PostgreSQL, Auth, Edge Functions, RLS)
- **Edge Functions**: Deno runtime (TypeScript)

### AI Integrations
- **Unified SDK**: Vercel AI SDK 6.0+
- **Providers**: @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai
- **Direct SDKs**: @google/generative-ai 0.24+

### Testing
- **Unit/Integration**: Vitest 4.0+
- **DOM Testing**: happy-dom 20.0+
- **Component Testing**: Testing Library 16.3+
- **E2E**: Playwright
- **Coverage**: @vitest/coverage-v8 4.0+

---

## CRITICAL CONSTRAINTS (from .specswarm/tech-stack.md)

⚠️ **BEFORE suggesting ANY library, framework, or pattern:**
1. Read `.specswarm/tech-stack.md`
2. Verify your suggestion is APPROVED
3. If PROHIBITED, suggest approved alternative
4. If UNAPPROVED, warn user and require justification

### Prohibited Technologies (NEVER suggest these)

**State Management**:
- ❌ **Redux / Redux Toolkit** → Use: **Zustand** + TanStack Query
- ❌ **MobX** → Use: **Zustand**
- ❌ **Context API for global state** → Use: **Zustand** (global), React Hook Form (forms)

**HTTP Clients**:
- ❌ **Axios** → Use: **Native fetch API** + TanStack Query

**Styling**:
- ❌ **CSS-in-JS** (styled-components, Emotion) → Use: **Tailwind CSS**
- ❌ **Bootstrap / Material-UI** → Use: **Radix UI** + Tailwind CSS

**Component Patterns**:
- ❌ **Class Components** → Use: **Functional components** with hooks
- ❌ **Higher-Order Components (HOCs)** → Use: **Custom hooks**

**Build Tools**:
- ❌ **Webpack / Create React App** → Use: **Vite**

**Testing**:
- ❌ **Jest** → Use: **Vitest**
- ❌ **Enzyme** → Use: **Testing Library**

**Backend**:
- ❌ **Direct PostgreSQL client from frontend** → Use: **Supabase client only**
- ❌ **Direct database migrations from app code** → Use: **Supabase migrations** (`supabase/migrations/`)

**Violation = Constitution violation** (see `.specswarm/constitution.md` when created - Principle 5)

### Auto-Addition Policy
Non-conflicting new libraries will be auto-added to tech-stack.md during `/specswarm:plan`

<!-- AUTO-GENERATED-END -->

---

## Project Architecture

### Multi-Tenant SaaS Pattern
- **Isolation**: Row Level Security (RLS) + application-layer validation
- **Company ID**: Every table has `company_id` (tenant identifier)
- **Defense-in-Depth**: RLS + explicit `company_id` filters in code
- **Function**: `get_user_company_id()` extracts company from user session

### Authentication & Authorization
- **Provider**: Supabase Auth (JWT-based)
- **Roles**: ADMIN, MANAGER, SELLER (stored in `profiles.role`)
- **Session**: 30-minute idle timeout (configurable)
- **RLS**: Policies use `auth.uid()` and `get_user_company_id()`

### Database Patterns
- **Soft Delete**: `deleted_at TIMESTAMPTZ` (90-day retention before hard delete)
- **Audit Logs**: Immutable append-only logs for critical actions
- **Encryption**: pgcrypto for sensitive data (API keys)
- **Migrations**: Supabase migrations in `supabase/migrations/`

### API Patterns
- **Edge Functions**: Deno-based serverless functions
- **CORS**: Environment-specific whitelist (no wildcards)
- **Rate Limiting**: 10 req/min per IP (Supabase built-in)
- **Error Responses**: Consistent HTTP status codes (401, 403, 429, etc.)

### Frontend Patterns
- **Component Structure**: Atomic design (atoms → molecules → organisms → pages)
- **Forms**: React Hook Form + Zod schemas
- **Data Fetching**: TanStack Query (queries, mutations, optimistic updates)
- **Routing**: React Router loaders/actions for data fetching
- **Styling**: Tailwind utility classes, no custom CSS

---

## Security Principles

### LGPD Compliance
- **Consent**: Explicit opt-in before data processing (Art. 7º, 8º)
- **Audit**: Immutable logs for traceability (Art. 48º)
- **Encryption**: At-rest (pgcrypto) and in-transit (TLS 1.3) (Art. 46º)
- **User Rights**: Export, delete, revoke consent (Art. 18º)
- **Retention**: 5 years hot, 7 years total (automated cleanup)

### Multi-Tenant Security
- **Defense-in-Depth**: Validate `company_id` in:
  1. Database (RLS policies)
  2. Application (TypeScript services)
  3. Edge Functions (JWT claims)
- **Never trust single layer**: Always validate tenant isolation at multiple levels

### Secrets Management
- **API Keys**: NEVER in environment variables prefixed with `VITE_*` (exposed in bundle)
- **Server-Side Only**: AI keys stored encrypted in database, accessed via Edge Functions
- **Master Key**: Supabase environment variables (not in code)

---

## Common Patterns

### Service Layer (TypeScript)
```typescript
// Defense-in-depth pattern
async update(id: string, updates: Partial<T>): Promise<{ error: Error | null }> {
  // Layer 1: Fetch resource to verify company_id
  const { data: resource } = await supabase
    .from(tableName)
    .select('company_id')
    .eq('id', id)
    .single()

  if (!resource) return { error: new Error('Resource not found') }

  // Layer 2: Verify company_id matches user's company
  const userCompanyId = await getUserCompanyId()
  if (resource.company_id !== userCompanyId) {
    return { error: new Error('Unauthorized: Cross-tenant access denied') }
  }

  // Layer 3: RLS + explicit company_id filter
  const { error } = await supabase
    .from(tableName)
    .update(dbUpdates)
    .eq('id', id)
    .eq('company_id', userCompanyId) // ✅ Explicit filter

  return { error }
}
```

### Validation Schemas (Zod)
```typescript
// Always include .max() to prevent DoS
export const requiredString = (field: string, maxLength: number = 255) =>
  z.string({ message: msg('FIELD_REQUIRED', { field }) })
    .min(1, msg('FIELD_REQUIRED', { field }))
    .max(maxLength, `${field} must be ${maxLength} characters or less`)

// Apply to all schemas
export const contactSchema = z.object({
  name: requiredString('Name', 100),
  email: requiredString('Email', 255).email(),
  phone: requiredString('Phone', 50),
  companyId: z.string().uuid(),
})
```

### Edge Function (Deno)
```typescript
import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimiter.ts'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }

  // Rate limiting
  const { allowed } = await checkRateLimit(req)
  if (!allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: getCorsHeaders(req)
    })
  }

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', {
      status: 401,
      headers: getCorsHeaders(req)
    })
  }

  // Business logic
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ... your logic here

  return new Response(JSON.stringify(data), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
})
```

### React Component (Functional)
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function ContactForm() {
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '' }
  })

  const createMutation = useMutation({
    mutationFn: (data) => contactsService.create(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact created')
    }
  })

  return (
    <form onSubmit={form.handleSubmit(createMutation.mutate)}>
      {/* form fields */}
    </form>
  )
}
```

---

## File Structure

```
/
├── .claude/
│   ├── context.md (this file)
│   └── features/
│       └── 001-implementacao-auditoria-seguranca/
│           ├── spec.md
│           ├── plan.md
│           ├── research.md
│           ├── data-model.md
│           └── checklists/
├── .specswarm/
│   ├── tech-stack.md (CRITICAL - read before suggesting tech)
│   └── constitution.md (to be created)
├── src/
│   ├── components/ (UI components)
│   ├── pages/ (route pages)
│   ├── lib/
│   │   ├── supabase/ (service layer)
│   │   └── validations/ (Zod schemas)
│   ├── context/ (React contexts)
│   └── hooks/ (custom hooks)
├── supabase/
│   ├── functions/ (Edge Functions - Deno)
│   └── migrations/ (SQL migrations)
├── package.json
├── vite.config.ts
└── vercel.json (deployment + security headers)
```

---

## Development Guidelines

### Before Writing Code
1. **Read .specswarm/tech-stack.md** - Verify library is approved
2. **Check existing patterns** - Match current code style
3. **Validate security** - Multi-tenant isolation, LGPD compliance
4. **Write tests** - Unit tests with Vitest, E2E with Playwright

### Code Style
- **TypeScript**: Strict mode, no `any` types
- **Naming**: camelCase (variables), PascalCase (components/types)
- **Imports**: Absolute paths via `@/` alias
- **Comments**: Explain "why", not "what"
- **Error Handling**: Always return `{ data, error }` pattern

### Testing Strategy
- **Unit**: Vitest for utils, services, hooks
- **Component**: Testing Library for UI components
- **Integration**: Test user flows with Testing Library
- **E2E**: Playwright for critical paths
- **Coverage**: Aim for >= 80%

### Deployment
- **Environments**: Local → Staging → Production
- **Feature Flags**: Use for gradual rollout
- **Rollback**: Git revert + feature flag disable
- **Monitoring**: Sentry for errors, Supabase Dashboard for RLS performance

---

## Getting Help

- **Tech Stack Questions**: Read `.specswarm/tech-stack.md` first
- **Architecture Decisions**: See active feature specs in `.claude/features/`
- **Security Patterns**: Refer to this context.md "Common Patterns" section
- **LGPD Compliance**: Consult spec.md for Feature 001

---

**Note**: This file is auto-updated by SpecSwarm during `/specswarm:plan`. Manual edits outside `<!-- AUTO-GENERATED-START/END -->` markers are preserved.
