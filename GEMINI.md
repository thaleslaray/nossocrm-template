# crmia Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-07

## Active Technologies

- TypeScript 5.x, React 18.x, SQL (PostgreSQL via Supabase) + Supabase (Auth, Database, Storage), TanStack Query, Vite, Tailwind CSS (005-single-tenant-migration)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x, React 18.x, SQL (PostgreSQL via Supabase): Follow standard conventions

## Recent Changes
- 006-ai-code-auditors: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

- 005-single-tenant-migration: Added TypeScript 5.x, React 18.x, SQL (PostgreSQL via Supabase) + Supabase (Auth, Database, Storage), TanStack Query, Vite, Tailwind CSS

<!-- MANUAL ADDITIONS START -->

## 🧠 AI Architecture (MANDATORY)

**ALL AI calls MUST go through the Edge Function `ai-proxy`.**

```typescript
// ✅ CORRECT - Always use the proxy
import { callAIProxy } from '@/lib/supabase/ai-proxy';
const result = await callAIProxy('analyzeLead', { deal, stageLabel });

// ❌ WRONG - Never import AI SDKs directly in components
import { GoogleGenerativeAI } from '@google/generative-ai'; // FORBIDDEN
```

**AI SDK Versions (December 2024):**
- `ai`: `^6.0.0-beta.138`
- `@ai-sdk/google`: `^3.0.0-beta.67`
- `@ai-sdk/anthropic`: `^3.0.0-beta.77`
- `@ai-sdk/openai`: `^3.0.0-beta.88`

See: [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) for full documentation.

<!-- MANUAL ADDITIONS END -->

