# Research: Correções de Segurança Críticas

**Feature**: `001-security-fixes-critical`  
**Date**: 03/12/2025  
**Status**: Complete

---

## 1. Setup-Instance Authentication (VULN-001)

### Decision
Implementar autenticação via `X-Setup-Token` header com token armazenado como secret no Supabase Edge Functions.

### Rationale
- Token secreto é a abordagem mais simples e segura para uma operação de uso único
- Secrets do Supabase são criptografados e não aparecem em logs
- Evita complexidade de IP whitelist que pode ser problemática em ambientes cloud

### Alternatives Considered
| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| IP Whitelist | Defense in depth | IPs dinâmicos em cloud, complexidade operacional | Complexidade sem benefício suficiente |
| Time-based OTP | Segurança adicional | Requer sincronização de relógio, setup mais complexo | Over-engineering para uso único |
| Magic Link via Email | Verificação de ownership | Adiciona dependência de email, latência | Desnecessário para setup inicial |

### Implementation Notes
```typescript
// Header validation pattern
const setupToken = req.headers.get('x-setup-token');
const expectedToken = Deno.env.get('SETUP_SECRET_TOKEN');

if (!setupToken || setupToken !== expectedToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

---

## 2. AI Proxy Pattern (VULN-002)

### Decision
Criar Edge Function `ai-proxy` que atua como intermediário entre frontend e APIs de IA, com API keys armazenadas no Supabase Secrets.

### Rationale
- Padrão bem estabelecido para proteger credenciais sensíveis
- Permite rate limiting e auditoria no servidor
- API keys nunca trafegam para o frontend
- Compatível com a arquitetura existente de Edge Functions

### Alternatives Considered
| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| BYOK (Bring Your Own Key) via frontend | Usuário controla sua key | Expõe key no bundle, abuse por outros usuários | Inseguro por design |
| API Gateway externo (Kong, AWS API Gateway) | Recursos avançados de rate limiting | Custo adicional, complexidade operacional | Over-engineering |
| Encryption at frontend + decrypt at proxy | Proteção em trânsito | Ainda requer key no bundle para encriptar | Não resolve o problema |

### API Routes
| Provider | Proxy Endpoint | Upstream |
|----------|----------------|----------|
| Google Gemini | `/functions/v1/ai-proxy/gemini` | `generativelanguage.googleapis.com` |
| OpenAI | `/functions/v1/ai-proxy/openai` | `api.openai.com` |
| Anthropic | `/functions/v1/ai-proxy/anthropic` | `api.anthropic.com` |

### Implementation Notes
- Usar `ai` SDK do Vercel para manter consistência com código existente
- JWT validation obrigatória antes de processar requisição
- Passar apenas dados necessários, não repassar body inteiro (minimização)

---

## 3. User Consent Management (VULN-003)

### Decision
Implementar tabela `user_consents` com registro completo de consentimentos, modal de consentimento no primeiro uso de IA, e validação em todas as chamadas de IA.

### Rationale
- LGPD exige consentimento explícito, específico e documentado
- Registro de IP, timestamp e versão do termo é requisito para auditoria ANPD
- Consentimento separado para dados biométricos (áudio) é obrigatório por Art. 11

### Consent Types
| Type | Description | Required For |
|------|-------------|--------------|
| `AI_DATA_PROCESSING` | Processamento de dados pessoais por IA externa | Todas as funcionalidades de IA |
| `AI_BIOMETRIC_DATA` | Processamento de dados biométricos (voz) | `processAudioNote` |

### Alternatives Considered
| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| Consent implícito em ToS | Simples de implementar | Não cumpre LGPD Art. 8º | Ilegal |
| Consent por sessão (memória) | Sem persistência | Não auditável, perde ao fechar browser | Não cumpre requisitos |
| Consent apenas em settings | Discreta | Usuário pode usar IA sem ver consent | Não cumpre LGPD |

### UI/UX Flow
```
1. Usuário clica em funcionalidade de IA
2. Sistema verifica `user_consents` para o tipo necessário
3. Se não há consent:
   a. Modal de consentimento é exibido (bloqueante)
   b. Usuário lê e aceita/recusa
   c. Se aceitar: registro em `user_consents` + prosseguir
   d. Se recusar: toast informativo + funcionalidade desabilitada
4. Se há consent válido: prosseguir com a operação
```

---

## 4. Cross-Tenant Validation (VULN-004)

### Decision
Adicionar validação explícita de `company_id` na Edge Function `delete-user` antes de qualquer operação de exclusão.

### Rationale
- Defense in depth: não depender apenas de RLS
- Fail-safe: se RLS falhar, ainda há proteção
- Auditável: log explícito de tentativas cross-tenant

### Implementation Pattern
```typescript
// ANTES de deletar, validar company match
if (targetProfile.company_id !== currentUserProfile.company_id) {
    // Log tentativa suspeita
    await logAuditEvent('CROSS_TENANT_DELETE_ATTEMPT', {
        attacker_id: currentUser.id,
        target_id: userId,
        attacker_company: currentUserProfile.company_id,
        target_company: targetProfile.company_id
    });
    
    return new Response(
        JSON.stringify({ error: 'Forbidden: cross-tenant operation' }),
        { status: 403 }
    );
}
```

### Audit Log Schema
```sql
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    company_id UUID REFERENCES public.companies(id),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Invite Token Hardening (VULN-005)

### Decision
Restaurar validação de `used_at` comentada, tornar `expires_at` NOT NULL com default de 7 dias, e migrar convites existentes.

### Rationale
- Token de uso único é prática padrão de segurança
- Expiração obrigatória limita janela de ataque
- Migração retroativa previne abuse de tokens antigos

### Migration Strategy
```sql
-- Step 1: Definir expiração para convites existentes sem data
UPDATE public.company_invites
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Step 2: Tornar coluna obrigatória
ALTER TABLE public.company_invites
ALTER COLUMN expires_at SET NOT NULL;

-- Step 3: Adicionar default para novos registros
ALTER TABLE public.company_invites
ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '7 days';
```

### Edge Function Changes
```typescript
// Restaurar validação de used_at
.is("used_at", null) // Remover comentário

// Após criar usuário, marcar token como usado
await adminClient
    .from("company_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);
```

---

## 6. CORS Hardening

### Decision
Substituir `Access-Control-Allow-Origin: *` por whitelist específica em todas as Edge Functions.

### Rationale
- CORS wildcard permite requisições de qualquer site (phishing, CSRF)
- Whitelist limita a origens conhecidas e confiáveis
- Essencial para Edge Functions que aceitam credenciais

### Implementation
```typescript
const ALLOWED_ORIGINS = [
    'http://localhost:3003',          // Dev
    'https://crmia.vercel.app',       // Production
    'https://crmia-*.vercel.app',     // Preview deployments
];

function getCorsHeaders(req: Request): HeadersInit {
    const origin = req.headers.get('origin') || '';
    const isAllowed = ALLOWED_ORIGINS.some(allowed => 
        allowed.includes('*') 
            ? origin.match(new RegExp(allowed.replace('*', '.*'))) 
            : origin === allowed
    );
    
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-setup-token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}
```

---

## 7. API Key Encryption at Rest

### Decision
Usar extensão `pgcrypto` para encriptar API keys no banco de dados, com master key armazenada em Supabase Secrets.

### Rationale
- Proteção adicional contra data breach
- Compliance com práticas de segurança de dados
- pgcrypto é nativa do PostgreSQL, não requer extensão externa

### Implementation
```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para encriptar
CREATE OR REPLACE FUNCTION encrypt_api_key(key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(key, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para decriptar
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Migration
1. Adicionar coluna `ai_api_key_encrypted BYTEA`
2. Migrar dados existentes com encriptação
3. Remover coluna `ai_api_key TEXT` original
4. Atualizar Edge Function `ai-proxy` para decriptar

---

## Technology Decisions Summary

| Area | Decision | Confidence |
|------|----------|------------|
| Setup Auth | X-Setup-Token header | High |
| AI Proxy | Edge Function proxy | High |
| Consent | Modal + DB table | High |
| Multi-tenant | Explicit company_id check | High |
| Invite Tokens | used_at + expires_at NOT NULL | High |
| CORS | Origin whitelist | High |
| Encryption | pgcrypto (AES-256) | High |

---

## Dependencies

### Supabase Configuration Required
- [ ] Secret: `SETUP_SECRET_TOKEN` (UUID ou string aleatória de 32+ chars)
- [ ] Secret: `DB_ENCRYPTION_KEY` (string aleatória de 32 chars para AES-256)
- [ ] Extension: `pgcrypto` (já disponível por padrão)

### Frontend Changes Required
- [ ] Remover `VITE_GEMINI_API_KEY` do .env
- [ ] Refatorar `geminiService.ts` para usar proxy
- [ ] Criar componente `AIConsentModal`
- [ ] Criar hook `useAIConsent`

### Database Migrations Required
- [ ] Criar tabela `user_consents`
- [ ] Criar tabela `audit_logs`
- [ ] Modificar `user_settings` (add encrypted column, drop plain text)
- [ ] Modificar `company_invites` (expires_at NOT NULL)

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Usuários não concordam com consent | Bloqueio de funcionalidades IA | Medium | UI clara sobre benefícios, permitir funcionalidades básicas |
| Latência adicional do proxy | UX degradada | Low | Edge Functions são rápidas, cache de validação JWT |
| Token de setup comprometido | Takeover antes do uso | Low | Instruir uso imediato após deploy, rotação de token |
| Migração de encryption falha | Perda de API keys | Medium | Backup antes de migrar, rollback plan |
