# Security Operations Runbook

Este documento contém procedimentos operacionais para administradores do NossoCRM.

---

## 1. Verificação de Saúde do Sistema

### 1.1 Checklist Diário

```bash
# 1. Verificar alertas de segurança não reconhecidos
SELECT COUNT(*) FROM security_alerts WHERE acknowledged_at IS NULL;

# 2. Verificar logs críticos das últimas 24h
SELECT COUNT(*) FROM audit_logs 
WHERE severity = 'critical' 
  AND created_at > NOW() - INTERVAL '24 hours';

# 3. Verificar rate limiting ativo
SELECT key, count FROM rate_limits 
WHERE window_start > NOW() - INTERVAL '1 hour'
ORDER BY count DESC LIMIT 10;
```

### 1.2 Checklist Semanal

- [ ] Revisar alertas de segurança da semana
- [ ] Verificar padrões de uso anormais
- [ ] Confirmar que backups estão funcionando
- [ ] Verificar espaço em disco para audit logs

---

## 2. Gerenciamento de Usuários

### 2.1 Criar Novo Usuário

**Via Dashboard Admin:**
1. Acesse Configurações > Equipe
2. Clique em "Convidar Usuário"
3. Preencha email e role
4. Usuário receberá email de convite

**Via API (Admin Only):**
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/create-user" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "novo@email.com", "role": "vendedor"}'
```

### 2.2 Desativar Usuário

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/delete-user" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_UUID"}'
```

### 2.3 Alterar Role de Usuário

```sql
-- Promover para admin
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';

-- Rebaixar para vendedor
UPDATE profiles SET role = 'vendedor' WHERE id = 'USER_UUID';
```

---

## 3. Respondendo a Incidentes de Segurança

### 3.1 Cross-Tenant Attempt Detectado

**Severidade**: Crítico

**Passos:**

1. **Identificar o usuário**
   ```sql
   SELECT user_id, action, resource_type, details, created_at
   FROM audit_logs
   WHERE action = 'CROSS_TENANT_ATTEMPT'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Verificar padrão de comportamento**
   ```sql
   SELECT COUNT(*), action
   FROM audit_logs
   WHERE user_id = 'SUSPICIOUS_USER_ID'
     AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY action;
   ```

3. **Decidir ação**
   - < 3 tentativas: Monitorar
   - 3-10 tentativas: Contatar usuário
   - > 10 tentativas: Suspender conta

4. **Suspender conta (se necessário)**
   ```sql
   -- Desabilitar usuário no Supabase Auth
   UPDATE auth.users 
   SET banned_until = '2099-12-31'
   WHERE id = 'USER_UUID';
   ```

5. **Reconhecer alerta**
   ```sql
   UPDATE security_alerts
   SET acknowledged_at = NOW(), acknowledged_by = 'ADMIN_USER_ID'
   WHERE id = 'ALERT_ID';
   ```

### 3.2 Mass Deletion Detectada

**Severidade**: Crítico

**Passos:**

1. **Identificar registros deletados**
   ```sql
   SELECT resource_type, COUNT(*) as deleted_count
   FROM audit_logs
   WHERE user_id = 'USER_ID'
     AND action IN ('SOFT_DELETE', 'DATA_DELETION')
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY resource_type;
   ```

2. **Verificar se foi intencional**
   - Contatar usuário por telefone
   - Verificar contexto (migração, limpeza, etc)

3. **Restaurar dados (se necessário)**
   ```sql
   -- Restaurar contatos deletados nas últimas 2 horas
   UPDATE contacts
   SET deleted_at = NULL, deleted_by = NULL
   WHERE deleted_by = 'USER_ID'
     AND deleted_at > NOW() - INTERVAL '2 hours';
   ```

### 3.3 Excessive Data Export

**Severidade**: Warning

**Passos:**

1. **Verificar exportações**
   ```sql
   SELECT details, created_at
   FROM audit_logs
   WHERE user_id = 'USER_ID'
     AND action = 'DATA_EXPORT'
   ORDER BY created_at DESC;
   ```

2. **Avaliar contexto**
   - Usuário está saindo da empresa?
   - Há razão legítima?

3. **Se suspeito, restringir temporariamente**
   - Alterar role para 'viewer' (se existir)
   - Contatar gerência

---

## 4. Atendendo Solicitações LGPD

### 4.1 Solicitação de Acesso (Art. 18, I)

**Prazo**: 15 dias

**Passos:**

1. **Validar identidade do solicitante**
   - Solicitar documento
   - Verificar email cadastrado

2. **Gerar exportação**
   ```bash
   curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/export-user-data" \
     -H "Authorization: Bearer USER_JWT_TOKEN"
   ```

3. **Enviar dados**
   - Usar canal seguro (email criptografado ou download autenticado)
   - Registrar atendimento

### 4.2 Solicitação de Exclusão (Art. 18, VI)

**Prazo**: 15 dias (pode solicitar extensão para dados compartilhados)

**Passos:**

1. **Validar identidade**

2. **Soft delete dos dados**
   ```sql
   -- Marca dados para exclusão
   UPDATE contacts SET deleted_at = NOW(), deleted_by = 'LGPD_REQUEST'
   WHERE owner_id = 'USER_ID';
   
   UPDATE deals SET deleted_at = NOW(), deleted_by = 'LGPD_REQUEST'
   WHERE owner_id = 'USER_ID';
   
   UPDATE activities SET deleted_at = NOW(), deleted_by = 'LGPD_REQUEST'
   WHERE owner_id = 'USER_ID';
   ```

3. **Registrar solicitação**
   ```sql
   INSERT INTO audit_logs (user_id, action, resource_type, details, severity)
   VALUES ('USER_ID', 'LGPD_DELETION_REQUEST', 'user', 
     '{"request_date": "2024-01-01", "protocol": "LGPD-2024-001"}', 'info');
   ```

4. **Hard delete será automático após 30 dias**

### 4.3 Revogação de Consentimento de IA

**Imediato**

O usuário pode fazer sozinho via Configurações, mas se solicitado:

```sql
-- Revogar consentimento de IA
UPDATE user_consents
SET revoked_at = NOW()
WHERE user_id = 'USER_ID' AND revoked_at IS NULL;

-- Criar novo consentimento sem IA
INSERT INTO user_consents (user_id, version, terms_accepted, privacy_accepted, ai_data_sharing, marketing_emails)
VALUES ('USER_ID', '1.0', TRUE, TRUE, FALSE, TRUE);
```

---

## 5. Manutenção de Rotina

### 5.1 Hard Delete Manual (Emergência)

⚠️ **CUIDADO**: Irreversível!

```sql
-- Apenas para registros muito antigos ou por ordem legal
DELETE FROM contacts 
WHERE deleted_at < NOW() - INTERVAL '90 days';

DELETE FROM deals 
WHERE deleted_at < NOW() - INTERVAL '90 days';

DELETE FROM activities 
WHERE deleted_at < NOW() - INTERVAL '90 days';
```

### 5.2 Arquivamento de Audit Logs

```sql
-- Executar mensalmente
SELECT archive_old_audit_logs();
```

### 5.3 Limpeza de Rate Limits Antigos

```sql
DELETE FROM rate_limits 
WHERE window_start < NOW() - INTERVAL '1 day';
```

---

## 6. Contatos de Emergência

| Papel | Nome | Email | Telefone |
|-------|------|-------|----------|
| Security Lead | [Nome] | security@empresa.com | +55 XX XXXXX-XXXX |
| DPO | [Nome] | dpo@empresa.com | +55 XX XXXXX-XXXX |
| Supabase Support | - | support@supabase.io | - |
| Vercel Support | - | support@vercel.com | - |

---

## Changelog

| Data | Versão | Alteração |
|------|--------|-----------|
| 2024-12-04 | 1.0 | Documento inicial |
