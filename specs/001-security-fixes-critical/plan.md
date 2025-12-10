# Implementation Plan: Correções de Segurança Críticas

**Branch**: `001-security-fixes-critical` | **Date**: 03/12/2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-security-fixes-critical/spec.md`

---

## Summary

Implementar correções de segurança críticas identificadas no relatório de auditoria (VULN-001 a VULN-005), incluindo:
- Autenticação via token secreto para setup-instance
- Edge Function proxy para chamadas de IA (proteger API keys)
- Sistema de consentimento LGPD para uso de dados com IA
- Validação de company_id para prevenir exclusão cross-tenant
- Hardening de tokens de convite (uso único + expiração obrigatória)

---

## Technical Context

**Language/Version**: TypeScript 5.9, Deno (Edge Functions)  
**Primary Dependencies**: React 19, Supabase JS 2.86, AI SDK (Vercel), TanStack Query 5  
**Storage**: PostgreSQL (Supabase) com RLS, pgcrypto para encriptação  
**Testing**: Vitest + React Testing Library (frontend), curl/manual (Edge Functions)  
**Target Platform**: Web (Vite), Supabase Edge Functions (Deno)  
**Project Type**: Web application (monorepo com frontend React + backend Supabase)  
**Performance Goals**: Proxy IA < 500ms overhead, consent modal < 100ms render  
**Constraints**: Zero API keys no bundle, 100% compliance LGPD  
**Scale/Scope**: Multi-tenant SaaS, ~20 tabelas, 6 Edge Functions

---

## Constitution Check

*GATE: Constitution file contains placeholder template - no specific gates defined.*

**Pre-Design Check**: ✅ PASSED (no constitution violations)

**Post-Design Check**: ✅ PASSED
- Feature segue padrões existentes (Edge Functions, RLS, TanStack Query)
- Não introduz novas dependências externas significativas
- Mantém estrutura de diretórios existente

---

## Project Structure

### Documentation (this feature)

```text
specs/001-security-fixes-critical/
├── plan.md              # Este arquivo
├── spec.md              # Especificação funcional
├── research.md          # Decisões técnicas e alternativas
├── data-model.md        # Modelo de dados (novas tabelas/modificações)
├── quickstart.md        # Guia rápido de implementação
├── contracts/           # Contratos de API
│   └── api-contracts.md
├── checklists/          # Checklists de qualidade
│   └── requirements.md
└── tasks.md             # Tarefas (criado por /speckit.tasks)
```

### Source Code (repository root)

```text
# Frontend (React + TypeScript + Vite)
src/
├── components/
│   └── AIConsentModal.tsx          # [NEW] Modal de consentimento LGPD
├── hooks/
│   └── useAIConsent.ts             # [NEW] Hook para gerenciar consents
├── services/
│   └── geminiService.ts            # [MODIFY] Refatorar para usar proxy
├── lib/
│   └── supabase/
│       └── consent.ts              # [NEW] Service para user_consents
└── features/
    └── settings/
        └── components/
            └── AIConfigSection.tsx # [MODIFY] Corrigir texto sobre armazenamento

# Backend (Supabase Edge Functions - Deno)
supabase/
├── functions/
│   ├── setup-instance/
│   │   └── index.ts                # [MODIFY] Adicionar auth por token
│   ├── delete-user/
│   │   └── index.ts                # [MODIFY] Validar company_id
│   ├── accept-invite/
│   │   └── index.ts                # [MODIFY] Restaurar used_at, validar expires_at
│   └── ai-proxy/
│       └── index.ts                # [NEW] Proxy para chamadas de IA
└── migrations/
    └── security-fixes.sql          # [NEW] Novas tabelas e modificações

# Tests
src/
└── test/
    └── __mocks__/
        └── supabase.ts             # [MODIFY] Adicionar mocks para novas tabelas
```

**Structure Decision**: Web application com frontend React e backend Supabase. Segue estrutura existente do projeto, adicionando novos arquivos em locais já estabelecidos (hooks/, components/, supabase/functions/).

---

## Complexity Tracking

> Nenhuma violação de constitution identificada. Não há complexidade adicional a justificar.

---

## Implementation Phases

### Phase 0: Research ✅ Complete

- [research.md](./research.md) - Decisões técnicas documentadas
- Todas as clarificações resolvidas

### Phase 1: Design ✅ Complete

- [data-model.md](./data-model.md) - Modelo de dados
- [contracts/api-contracts.md](./contracts/api-contracts.md) - Contratos de API
- [quickstart.md](./quickstart.md) - Guia de implementação

### Phase 2: Tasks (Next Step)

Executar `/speckit.tasks` para gerar lista detalhada de tarefas.

---

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Feature Spec | `specs/001-security-fixes-critical/spec.md` | ✅ Complete |
| Implementation Plan | `specs/001-security-fixes-critical/plan.md` | ✅ Complete |
| Research | `specs/001-security-fixes-critical/research.md` | ✅ Complete |
| Data Model | `specs/001-security-fixes-critical/data-model.md` | ✅ Complete |
| API Contracts | `specs/001-security-fixes-critical/contracts/api-contracts.md` | ✅ Complete |
| Quickstart | `specs/001-security-fixes-critical/quickstart.md` | ✅ Complete |
| Quality Checklist | `specs/001-security-fixes-critical/checklists/requirements.md` | ✅ Complete |
| Tasks | `specs/001-security-fixes-critical/tasks.md` | ⏳ Pending |

---

## Dependencies & Prerequisites

### Supabase Configuration Required

| Secret | Purpose | Generation |
|--------|---------|------------|
| `SETUP_SECRET_TOKEN` | Autenticação setup-instance | `openssl rand -hex 32` |
| `DB_ENCRYPTION_KEY` | Encriptação de API keys | `openssl rand -hex 16` |

### Database Extensions

- `pgcrypto` - Já disponível por padrão no Supabase

### Environment Variables to Remove

- `VITE_GEMINI_API_KEY` - Remover do .env após implementar proxy

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Usuários não aceitam consent | Medium | Medium | UI clara, benefícios explícitos |
| Latência do proxy | Low | Low | Edge Functions são rápidas |
| Token de setup comprometido | Low | High | Uso imediato após deploy |
| Migração de encryption falha | Medium | High | Backup antes, rollback plan |

---

## Next Steps

1. Executar `/speckit.tasks` para gerar lista detalhada de tarefas
2. Configurar secrets no Supabase Dashboard
3. Implementar na ordem definida no quickstart.md
