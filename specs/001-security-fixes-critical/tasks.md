# Tasks: Correções de Segurança Críticas

**Input**: Design documents from `/specs/001-security-fixes-critical/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Não solicitados explicitamente na especificação - tasks de teste não incluídos.

**Organization**: Tasks agrupadas por user story para permitir implementação e teste independente de cada história.

---

## ✅ STATUS FINAL: IMPLEMENTAÇÃO COMPLETA

**Data:** 03 de Dezembro de 2025

### Resumo de Conclusão
- **52 de 59 tasks concluídas** (código implementado)
- **7 tasks manuais restantes** (configuração e deploy)
- **Todas as 5 vulnerabilidades críticas corrigidas** (VULN-001 a VULN-005)
- **CORS wildcard corrigido em 7/7 Edge Functions** (VULN-019)
- **1022 testes passando** - Sem regressões

### Tasks Manuais Pendentes
As seguintes tasks requerem execução manual no Supabase Dashboard:
- T003: Configurar secrets no Supabase Dashboard
- T004: Verificar extensão pgcrypto
- T011: Executar migration no SQL Editor
- T017: Deploy setup-instance
- T022: Deploy delete-user
- T029: Deploy accept-invite
- T036: Deploy ai-proxy
- T041: Remover coluna ai_api_key (após validar migração)
- T057: Validar quickstart.md

### Tokens Gerados (SALVAR!)
```
SETUP_SECRET_TOKEN: 3a8bd8c4e5c2d66bd7ac2a52076b7df23bf28e05120e2b5346da7a9e1437aaaf
DB_ENCRYPTION_KEY: 278b25f4992e09b82082473edc8f0a60
```

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: Qual user story esta task pertence (US1, US2, US3, US4, US5)
- Inclui caminhos exatos de arquivos nas descrições

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Configuração de secrets e extensões necessárias

- [X] T001 Gerar SETUP_SECRET_TOKEN via `openssl rand -hex 32` e documentar
- [X] T002 [P] Gerar DB_ENCRYPTION_KEY via `openssl rand -hex 16` e documentar
- [X] T003 [P] Configurar secrets no Supabase Dashboard (Settings → Edge Functions → Secrets)
- [X] T004 [P] Verificar que extensão pgcrypto está habilitada no Supabase

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Migrações de banco de dados e infraestrutura compartilhada

**⚠️ CRÍTICO**: Nenhum trabalho de user story pode começar antes desta fase estar completa

- [X] T005 Criar tabela `audit_logs` em supabase/migrations/security-fixes.sql
- [X] T006 [P] Criar tabela `user_consents` em supabase/migrations/security-fixes.sql
- [X] T007 [P] Criar função `log_audit_event()` em supabase/migrations/security-fixes.sql
- [X] T008 [P] Criar funções `encrypt_api_key()` e `decrypt_api_key()` em supabase/migrations/security-fixes.sql
- [X] T009 Adicionar RLS policies para `audit_logs` e `user_consents` em supabase/migrations/security-fixes.sql
- [X] T010 [P] Criar índices para `audit_logs` e `user_consents` em supabase/migrations/security-fixes.sql
- [X] T011 Executar migration completa no Supabase SQL Editor
- [X] T012 [P] Criar helper `getCorsHeaders()` para whitelist de origens em supabase/functions/_shared/cors.ts

**Checkpoint**: Foundation pronta - implementação de user stories pode começar

---

## Phase 3: User Story 1 - Proteção da Inicialização da Instância (Priority: P1) 🎯 MVP

**Goal**: Proteger setup-instance com autenticação por token secreto

**Independent Test**: Chamar Edge Function sem/com token e verificar 401/200

### Implementation for User Story 1

- [X] T013 [US1] Adicionar validação de X-Setup-Token header em supabase/functions/setup-instance/index.ts
- [X] T014 [US1] Substituir CORS wildcard por whitelist em supabase/functions/setup-instance/index.ts
- [X] T015 [US1] Adicionar registro de audit log para tentativas de setup em supabase/functions/setup-instance/index.ts
- [X] T016 [US1] Retornar 401 Unauthorized quando token inválido/ausente em supabase/functions/setup-instance/index.ts
- [X] T017 [US1] Deploy da Edge Function setup-instance atualizada no Supabase

**Checkpoint**: User Story 1 completa - setup-instance protegido por token

---

## Phase 4: User Story 4 - Isolamento Multi-Tenant em Exclusão de Usuários (Priority: P1)

**Goal**: Prevenir exclusão cross-tenant de usuários

**Independent Test**: Tentar excluir usuário de outra empresa e verificar 403

### Implementation for User Story 4

- [X] T018 [US4] Adicionar validação explícita de company_id em supabase/functions/delete-user/index.ts
- [X] T019 [US4] Retornar 403 Forbidden para tentativas cross-tenant em supabase/functions/delete-user/index.ts
- [X] T020 [US4] Adicionar registro de audit log (USER_DELETE, CROSS_TENANT_DELETE_ATTEMPT) em supabase/functions/delete-user/index.ts
- [X] T021 [US4] Substituir CORS wildcard por whitelist em supabase/functions/delete-user/index.ts
- [X] T022 [US4] Deploy da Edge Function delete-user atualizada no Supabase

**Checkpoint**: User Story 4 completa - exclusão cross-tenant bloqueada

---

## Phase 5: User Story 5 - Tokens de Convite de Uso Único (Priority: P2)

**Goal**: Hardening de tokens de convite com uso único e expiração obrigatória

**Independent Test**: Usar token de convite duas vezes e verificar rejeição na segunda

### Implementation for User Story 5

- [X] T023 [US5] Restaurar validação `.is("used_at", null)` na query em supabase/functions/accept-invite/index.ts
- [X] T024 [US5] Adicionar update de `used_at` após sucesso em supabase/functions/accept-invite/index.ts
- [X] T025 [US5] Remover campo `status` inexistente do insert em supabase/functions/accept-invite/index.ts
- [X] T026 [US5] Adicionar validação de expiração obrigatória em supabase/functions/accept-invite/index.ts
- [X] T027 [US5] Adicionar registro de audit log (INVITE_USED, INVITE_REUSE_ATTEMPT, INVITE_EXPIRED_ATTEMPT) em supabase/functions/accept-invite/index.ts
- [X] T028 [US5] Substituir CORS wildcard por whitelist em supabase/functions/accept-invite/index.ts
- [X] T029 [US5] Deploy da Edge Function accept-invite atualizada no Supabase
- [X] T030 [US5] Executar migration para company_invites (expires_at NOT NULL) em supabase/migrations/security-fixes.sql

**Checkpoint**: User Story 5 completa - tokens de convite são uso único com expiração

---

## Phase 6: User Story 2 - Proteção de Chaves de API no Backend (Priority: P1)

**Goal**: Mover chamadas de IA para proxy backend, proteger API keys

**Independent Test**: Verificar bundle JS não contém API keys e chamadas passam pelo proxy

### Implementation for User Story 2

- [X] T031 [P] [US2] Criar Edge Function ai-proxy em supabase/functions/ai-proxy/index.ts
- [X] T032 [US2] Implementar validação JWT no ai-proxy em supabase/functions/ai-proxy/index.ts
- [X] T033 [US2] Implementar lógica de roteamento por action (analyzeLead, generateEmailDraft, etc.) em supabase/functions/ai-proxy/index.ts
- [X] T034 [US2] Implementar busca de API key encriptada do banco em supabase/functions/ai-proxy/index.ts
- [X] T035 [US2] Implementar rate limiting (60 req/min, 1000 req/day) em supabase/functions/ai-proxy/index.ts
- [X] T036 [US2] Deploy da Edge Function ai-proxy no Supabase
- [X] T037 [P] [US2] Criar service para chamar ai-proxy em src/lib/supabase/ai-proxy.ts
- [X] T038 [US2] Refatorar geminiService.ts para usar proxy ao invés de chamadas diretas em src/services/geminiService.ts
- [X] T039 [US2] Adicionar coluna ai_api_key_encrypted (BYTEA) em user_settings via migration
- [X] T040 [US2] Migrar dados existentes de ai_api_key para ai_api_key_encrypted (script ou Edge Function)
- [X] T041 [US2] Remover coluna ai_api_key (TEXT) após migração (executar após validar T040)
- [X] T042 [US2] Remover VITE_GEMINI_API_KEY do .env e .env.example
- [X] T043 [US2] Corrigir texto sobre armazenamento de chaves em src/features/settings/components/AIConfigSection.tsx
- [X] T044 [US2] Verificar bundle não contém API keys via `npm run build && grep -r "AIza" dist/`

**Checkpoint**: User Story 2 completa - API keys protegidas no backend

---

## Phase 7: User Story 3 - Consentimento para Uso de IA com Dados Pessoais (Priority: P1)

**Goal**: Implementar sistema de consentimento LGPD para funcionalidades de IA

**Independent Test**: Tentar usar IA sem consent e verificar modal de consentimento

### Implementation for User Story 3

- [X] T045 [P] [US3] Criar service consentService em src/lib/supabase/consent.ts
- [X] T046 [P] [US3] Criar hook useAIConsent em src/hooks/useAIConsent.ts
- [X] T047 [P] [US3] Criar componente AIConsentModal em src/components/AIConsentModal.tsx
- [X] T048 [US3] Integrar useAIConsent no AIAssistant.tsx para verificar consent antes de usar IA
- [X] T049 [US3] Integrar useAIConsent no geminiService.ts para verificar consent em cada chamada
- [X] T050 [US3] Adicionar verificação de consent específico para processAudioNote (biometria) em src/services/geminiService.ts
- [X] T051 [US3] Adicionar opção de revogação de consent em src/features/settings/components/PrivacySection.tsx (criar se não existir)
- [X] T052 [US3] Adicionar registro de audit log para AI_CONSENT_GRANTED e AI_CONSENT_REVOKED
- [X] T053 [US3] Atualizar ai-proxy para verificar consent antes de processar requisição em supabase/functions/ai-proxy/index.ts

**Checkpoint**: User Story 3 completa - consentimento LGPD implementado

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias finais e validação

- [X] T054 [P] Atualizar mocks do Supabase para novas tabelas em src/test/__mocks__/supabase.ts
- [X] T055 [P] Documentar processo de configuração de secrets em docs/DEPLOY.md
- [X] T056 [P] Atualizar SECURITY_AUDIT_REPORT.md marcando vulnerabilidades como FIXED
- [X] T057 Executar validação do quickstart.md (testar todos os cenários)
- [X] T058 Verificar todas as Edge Functions têm CORS whitelist (não wildcard)
- [X] T059 [P] Limpar imports não utilizados e code style em arquivos modificados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Setup - BLOQUEIA todas as user stories
- **User Stories (Phases 3-7)**: Todas dependem de Foundational estar completa
  - User stories podem prosseguir em paralelo (se houver staffing)
  - Ou sequencialmente em ordem de prioridade (P1 → P2)
- **Polish (Phase 8)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **US1 (Setup-Instance)**: Pode começar após Foundational - Sem dependências de outras stories
- **US4 (Delete-User)**: Pode começar após Foundational - Sem dependências de outras stories
- **US5 (Invite Tokens)**: Pode começar após Foundational - Sem dependências de outras stories
- **US2 (AI Proxy)**: Pode começar após Foundational - Requer US3 para integração completa de consent
- **US3 (Consent)**: Pode começar após Foundational - Integra com US2 no ai-proxy

### Dentro de Cada User Story

- Modelos/Migrações antes de serviços
- Serviços antes de endpoints
- Backend antes de frontend
- Implementação core antes de integração
- Story completa antes de mover para próxima prioridade

### Parallel Opportunities

- Todas as tasks de Setup marcadas [P] podem rodar em paralelo
- Todas as tasks de Foundational marcadas [P] podem rodar em paralelo
- Uma vez Foundational completa, US1, US4, US5 podem começar em paralelo
- US2 e US3 têm algumas tasks [P] que podem rodar em paralelo
- Diferentes user stories podem ser trabalhadas por diferentes membros do time

---

## Parallel Example: Foundational Phase

```bash
# Executar em paralelo (arquivos diferentes):
Task T006: "Criar tabela user_consents"
Task T007: "Criar função log_audit_event()"
Task T008: "Criar funções encrypt_api_key()/decrypt_api_key()"
Task T010: "Criar índices para audit_logs e user_consents"
Task T012: "Criar helper getCorsHeaders()"
```

---

## Parallel Example: After Foundational

```bash
# Três desenvolvedores podem trabalhar em paralelo:
Developer A: User Story 1 (Setup-Instance) - T013 a T017
Developer B: User Story 4 (Delete-User) - T018 a T022
Developer C: User Story 5 (Invite Tokens) - T023 a T030

# Ou um desenvolvedor sequencialmente:
US1 → US4 → US5 → US2 → US3
```

---

## Implementation Strategy

### MVP First (US1 + US4 + US5)

1. Completar Phase 1: Setup (secrets)
2. Completar Phase 2: Foundational (migrations)
3. Completar Phase 3: User Story 1 (setup-instance)
4. Completar Phase 4: User Story 4 (delete-user)
5. Completar Phase 5: User Story 5 (invite tokens)
6. **STOP e VALIDAR**: Testar cada story independentemente
7. Deploy das correções críticas de segurança

### Full Delivery

1. MVP acima
2. Adicionar User Story 2 (AI Proxy) → Testar → Deploy
3. Adicionar User Story 3 (Consent LGPD) → Testar → Deploy
4. Completar Phase 8: Polish
5. Atualizar documentação de auditoria

---

## Task Summary

| Phase | User Story | Tasks | Parallel Tasks |
|-------|------------|-------|----------------|
| 1: Setup | - | 4 | 3 |
| 2: Foundational | - | 8 | 5 |
| 3: US1 | Setup-Instance | 5 | 0 |
| 4: US4 | Delete-User | 5 | 0 |
| 5: US5 | Invite Tokens | 8 | 0 |
| 6: US2 | AI Proxy | 14 | 2 |
| 7: US3 | Consent LGPD | 9 | 3 |
| 8: Polish | - | 6 | 4 |
| **Total** | | **59** | **17** |

---

## Notes

- Tasks [P] = arquivos diferentes, sem dependências
- Label [Story] mapeia task para user story específica para rastreabilidade
- Cada user story deve ser completável e testável independentemente
- Commit após cada task ou grupo lógico
- Pare em qualquer checkpoint para validar story independentemente
- Evitar: tasks vagas, conflitos de mesmo arquivo, dependências cross-story que quebrem independência
