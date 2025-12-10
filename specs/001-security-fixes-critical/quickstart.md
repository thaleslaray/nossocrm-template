# Quickstart: Correções de Segurança Críticas

**Feature**: `001-security-fixes-critical`  
**Date**: 03/12/2025

---

## Overview

Esta feature implementa correções de segurança críticas identificadas no relatório de auditoria, abordando 5 vulnerabilidades prioritárias:

1. **VULN-001**: Setup-Instance sem autenticação (CVSS 9.8)
2. **VULN-002**: API Keys expostas no frontend (CVSS 9.1)
3. **VULN-003**: PII enviado para IA sem consent (LGPD)
4. **VULN-004**: Cross-tenant user deletion (CVSS 7.1)
5. **VULN-005**: Tokens de convite reutilizáveis (CVSS 6.8)

---

## Prerequisites

### Supabase Secrets (Dashboard)

Antes de implementar, configure os seguintes secrets no Supabase Dashboard:

1. **Settings → Edge Functions → Secrets**:
   - `SETUP_SECRET_TOKEN`: Token para autenticar setup-instance
     ```bash
     # Gerar token seguro (copiar output)
     openssl rand -hex 32
     ```
   - `DB_ENCRYPTION_KEY`: Chave para encriptação de API keys
     ```bash
     # Gerar chave de 32 caracteres
     openssl rand -hex 16
     ```

2. **Settings → Database → Extensions**:
   - Verificar que `pgcrypto` está habilitado (geralmente já está)

---

## Implementation Order

### Phase 1: Critical Security (Sprint 0 - Imediato)

#### 1.1 Setup-Instance Authentication

```bash
# Arquivo: supabase/functions/setup-instance/index.ts
```

**Changes:**
1. Adicionar validação de `X-Setup-Token` header
2. Substituir CORS wildcard por whitelist
3. Retornar 401 se token inválido

**Test:**
```bash
# Sem token - deve retornar 401
curl -X POST https://[PROJECT].supabase.co/functions/v1/setup-instance \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test","email":"test@test.com","password":"12345678"}'

# Com token válido - deve funcionar
curl -X POST https://[PROJECT].supabase.co/functions/v1/setup-instance \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: [SEU_TOKEN]" \
  -d '{"companyName":"Test","email":"test@test.com","password":"12345678"}'
```

#### 1.2 Cross-Tenant User Deletion Fix

```bash
# Arquivo: supabase/functions/delete-user/index.ts
```

**Changes:**
1. Adicionar validação explícita de `company_id`
2. Retornar 403 se tentativa cross-tenant
3. Registrar em audit_logs

---

### Phase 2: AI Proxy & Consent (Sprint 1)

#### 2.1 Database Migrations

```bash
# Executar no Supabase SQL Editor
```

**Order:**
1. Criar tabela `audit_logs`
2. Criar tabela `user_consents`
3. Criar função `log_audit_event`
4. Modificar `company_invites` (expires_at NOT NULL)

#### 2.2 AI Proxy Edge Function

```bash
# Criar: supabase/functions/ai-proxy/index.ts
```

**Responsabilidades:**
1. Validar JWT
2. Verificar consent
3. Buscar API key do banco (decriptada)
4. Fazer chamada para provider
5. Retornar resultado

#### 2.3 Frontend Changes

```bash
# Arquivos a criar/modificar:
# - src/hooks/useAIConsent.ts
# - src/components/AIConsentModal.tsx
# - src/services/geminiService.ts (refatorar para usar proxy)
```

---

### Phase 3: Invite Token Hardening (Sprint 1)

#### 3.1 Edge Function Fix

```bash
# Arquivo: supabase/functions/accept-invite/index.ts
```

**Changes:**
1. Restaurar `.is("used_at", null)` na query
2. Adicionar update de `used_at` após sucesso
3. Remover campo `status` inexistente do insert

#### 3.2 Migration

```sql
-- Executar após fixes nas Edge Functions
UPDATE company_invites SET expires_at = created_at + INTERVAL '7 days' WHERE expires_at IS NULL;
ALTER TABLE company_invites ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE company_invites ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '7 days';
```

---

## Verification Checklist

### Security Tests

```bash
# 1. Setup-Instance sem token → 401
curl -X POST [URL]/functions/v1/setup-instance -H "Content-Type: application/json" -d '{}' 
# Expected: {"error":"Unauthorized"}

# 2. Cross-tenant delete → 403
# (requer setup de 2 empresas para testar)

# 3. Invite reuse → 400
# (usar mesmo token duas vezes)

# 4. Bundle sem API keys
npm run build && grep -r "AIza" dist/ || echo "✅ No API keys in bundle"
```

### Consent Tests

```javascript
// No browser console após implementação
const { hasConsent } = useAIConsent();
console.log('AI Consent:', hasConsent('AI_DATA_PROCESSING'));
// Expected: false (primeiro uso)
```

---

## Rollback Plan

### Se algo der errado:

1. **Setup-Instance**: Remover validação de token temporariamente
   ```typescript
   // Comentar linhas de validação até resolver
   ```

2. **AI Proxy**: Restaurar chamadas diretas no geminiService.ts
   ```typescript
   // Reverter para padrão antigo com VITE_GEMINI_API_KEY
   ```

3. **Database**: Migrations são aditivas, não destrutivas

---

## Common Issues

### "Unauthorized" em setup-instance

- Verifique se `SETUP_SECRET_TOKEN` está configurado no Supabase Secrets
- Verifique se o header está sendo enviado: `X-Setup-Token: [token]`

### Consent modal não aparece

- Verifique se `useAIConsent` está sendo usado no componente
- Verifique se a tabela `user_consents` foi criada

### AI não funciona após migração

- Verifique se a Edge Function `ai-proxy` foi deployada
- Verifique se o frontend está usando o novo serviço
- Verifique logs da Edge Function no Supabase Dashboard

---

## Links

- [spec.md](./spec.md) - Especificação completa
- [research.md](./research.md) - Decisões técnicas
- [data-model.md](./data-model.md) - Modelo de dados
- [contracts/](./contracts/) - Contratos de API
- [SECURITY_AUDIT_REPORT.md](../../SECURITY_AUDIT_REPORT.md) - Relatório de auditoria original
