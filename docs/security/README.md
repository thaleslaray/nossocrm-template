# Security Architecture Documentation

## Overview

Este documento descreve a arquitetura de segurança do NossoCRM, incluindo medidas de proteção multi-tenant, conformidade LGPD e procedimentos operacionais.

---

## 1. Threat Model

### 1.1 Assets Protegidos

| Asset | Classificação | Descrição |
|-------|---------------|-----------|
| Dados de Clientes | Crítico | Contatos, deals, atividades |
| Credenciais | Crítico | API keys, tokens de acesso |
| Dados de Empresa | Alto | Configurações, boards, produtos |
| Audit Logs | Alto | Registros de segurança |
| Configurações de IA | Médio | Preferências, prompts |

### 1.2 Threat Actors

1. **Atacante Externo**: Tentativas de acesso não autorizado via APIs públicas
2. **Insider Malicioso**: Funcionário tentando acessar dados de outras empresas
3. **Usuário Comprometido**: Conta legítima com credenciais vazadas
4. **Bot/Crawler**: Tentativas automatizadas de scraping

### 1.3 Attack Vectors Mitigados

| Vetor | Mitigação | Status |
|-------|-----------|--------|
| SQL Injection | RLS + Supabase ORM | ✅ |
| XSS | React escaping + CSP | ✅ |
| CSRF | SameSite cookies | ✅ |
| Cross-Tenant Access | Defense-in-depth | ✅ |
| API Key Exposure | Server-side proxy | ✅ |
| Rate Abuse | Rate limiting | ✅ |
| Data Leakage | Soft delete + audit | ✅ |

---

## 2. Multi-Tenant Security Architecture

### 2.1 Isolation Model

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Auth                         │
│  (JWT Token com user_id)                                │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     RLS Layer 1                          │
│  (Banco filtra por company_id automaticamente)          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Defense-in-Depth Layer 2                    │
│  (Services validam company_id antes de operações)       │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Audit Layer 3                         │
│  (Todas as operações são logadas)                       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Defense-in-Depth Implementation

```typescript
// Padrão implementado em todos os services
async function update(id: string, data: UpdateDTO) {
  // 1. Obter company_id do usuário
  const userCompanyId = await getCurrentUserCompanyId();
  if (!userCompanyId) return { error: 'Unauthenticated' };

  // 2. Verificar se recurso pertence à empresa
  const { data: resource } = await supabase
    .from('table')
    .select('company_id')
    .eq('id', id)
    .single();

  if (resource?.company_id !== userCompanyId) {
    // 3. Logar tentativa cross-tenant
    await logCrossTenantAttempt(userCompanyId, 'table', id);
    return { error: 'Cross-tenant access denied' };
  }

  // 4. Executar operação com filtro explícito
  return supabase
    .from('table')
    .update(data)
    .eq('id', id)
    .eq('company_id', userCompanyId);
}
```

### 2.3 RLS Policies

Todas as tabelas principais usam o padrão:

```sql
CREATE POLICY "company_isolation" ON table_name
  FOR ALL
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = (SELECT auth.uid()))
    AND deleted_at IS NULL
  );
```

---

## 3. LGPD Compliance Measures

### 3.1 Direitos dos Titulares (Art. 18)

| Direito | Implementação | Endpoint |
|---------|---------------|----------|
| Acesso | Export de dados | `/functions/v1/export-user-data` |
| Correção | CRUD padrão | API services |
| Exclusão | Soft delete + hard delete após 30 dias | Delete endpoints |
| Portabilidade | JSON export | `/functions/v1/export-user-data` |
| Revogação de Consentimento | consentsService | Settings page |

### 3.2 Gestão de Consentimento

```typescript
// Estrutura de consentimento granular
interface UserConsent {
  version: string;           // Versão dos termos
  terms_accepted: boolean;   // Termos de uso
  privacy_accepted: boolean; // Política de privacidade
  ai_data_sharing: boolean;  // Uso de dados por IA
  marketing_emails: boolean; // E-mails de marketing
  revoked_at: string | null; // Data de revogação
}
```

### 3.3 Retenção de Dados

| Tipo de Dado | Retenção | Justificativa |
|--------------|----------|---------------|
| Dados ativos | Indefinida | Operação normal |
| Soft deleted | 30 dias | Recuperação de erros |
| Audit logs | 5 anos | Compliance legal |
| Backups | 30 dias | Disaster recovery |

---

## 4. Incident Response Plan

### 4.1 Classificação de Incidentes

| Severidade | Descrição | SLA |
|------------|-----------|-----|
| Crítico | Vazamento de dados, acesso não autorizado | 1 hora |
| Alto | Tentativa de cross-tenant (múltiplas) | 4 horas |
| Médio | Rate limiting excessivo, erros de autenticação | 24 horas |
| Baixo | Alertas informativos | 72 horas |

### 4.2 Workflow de Resposta

```
Detecção → Triagem → Contenção → Erradicação → Recuperação → Lições Aprendidas
   │          │          │           │             │              │
   ▼          ▼          ▼           ▼             ▼              ▼
Alertas   Severidade   Bloqueio   Fix deploy   Validação   Post-mortem
automát.  assessment   de acesso  e patching   de dados    document
```

### 4.3 Contatos de Emergência

| Papel | Responsabilidade |
|-------|------------------|
| Security Lead | Decisões técnicas, contenção |
| DPO | Notificação ANPD, comunicação com titulares |
| CTO | Aprovação de mudanças críticas |
| Suporte | Comunicação com clientes |

---

## 5. Security Best Practices for Developers

### 5.1 Regras de Ouro

1. **Nunca confie em dados do frontend** - Sempre valide no backend
2. **Use defense-in-depth** - RLS não é suficiente sozinho
3. **Log tudo** - Se não está logado, não aconteceu
4. **Valide IDs** - Use `sanitizeUUID()` e `requireUUID()`
5. **Filtro explícito** - Sempre inclua `company_id` nas queries

### 5.2 Padrão de Service

```typescript
// ✅ CORRETO
async function update(id: string, data: UpdateDTO) {
  const userCompanyId = await getCurrentUserCompanyId();
  
  // Verificar propriedade
  const { data: resource } = await supabase
    .from('table')
    .select('company_id')
    .eq('id', id)
    .single();

  if (resource?.company_id !== userCompanyId) {
    await logCrossTenantAttempt(...);
    return { error: 'Denied' };
  }

  // Operação com filtro
  return supabase
    .from('table')
    .update(data)
    .eq('id', id)
    .eq('company_id', userCompanyId);
}

// ❌ ERRADO
async function update(id: string, data: UpdateDTO) {
  // Sem verificação de company_id!
  return supabase.from('table').update(data).eq('id', id);
}
```

### 5.3 Checklist de Code Review

- [ ] Operação verifica `company_id` do usuário?
- [ ] Tentativas cross-tenant são logadas?
- [ ] IDs são validados antes de uso?
- [ ] Filtro explícito de `company_id` nas queries?
- [ ] Erros não expõem informações sensíveis?
- [ ] Rate limiting aplicado em endpoints públicos?

---

## 6. Audit Log Analysis Guide

### 6.1 Acessando Logs

**Via Dashboard**:
1. Acesse Configurações > Auditoria
2. Use filtros: severidade, ação, período
3. Expanda logs para ver detalhes

**Via SQL**:
```sql
SELECT * FROM audit_logs
WHERE severity = 'critical'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### 6.2 Alertas de Segurança

O sistema gera alertas automáticos para:

| Padrão | Threshold | Ação |
|--------|-----------|------|
| Cross-tenant attempts | 3+ em 1 hora | Alerta crítico |
| Excessive exports | 5+ em 24 horas | Alerta warning |
| Mass deletions | 10+ em 1 hora | Alerta crítico |

### 6.3 Investigação de Incidentes

```sql
-- 1. Identificar usuário suspeito
SELECT user_id, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'CROSS_TENANT_ATTEMPT'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY attempts DESC;

-- 2. Timeline de atividades do usuário
SELECT action, resource_type, resource_id, created_at
FROM audit_logs
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 100;

-- 3. Verificar IPs suspeitos
SELECT ip_address, COUNT(*) as requests
FROM audit_logs
WHERE severity = 'critical'
GROUP BY ip_address
ORDER BY requests DESC;
```

---

## Changelog

| Data | Versão | Alteração |
|------|--------|-----------|
| 2024-12-04 | 1.0 | Documento inicial |
