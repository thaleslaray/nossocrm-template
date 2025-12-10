# API Contracts: Correções de Segurança Críticas

**Feature**: `001-security-fixes-critical`  
**Date**: 03/12/2025  
**Format**: OpenAPI 3.0 (simplified)

---

## Edge Functions

### 1. setup-instance (Modified)

**Endpoint**: `POST /functions/v1/setup-instance`

**Headers Required:**
```yaml
X-Setup-Token: string  # Required - Secret token for authorization
Content-Type: application/json
```

**Request Body:**
```typescript
interface SetupInstanceRequest {
  companyName: string;  // Required - Nome da empresa
  email: string;        // Required - Email do admin
  password: string;     // Required - Senha do admin (min 8 chars)
}
```

**Response:**

| Status | Description | Body |
|--------|-------------|------|
| 200 | Success | `{ message: string, company: Company, user: User }` |
| 400 | Invalid request / Already initialized | `{ error: string }` |
| 401 | Unauthorized (missing/invalid token) | `{ error: "Unauthorized" }` |
| 403 | Forbidden (already initialized) | `{ error: "Instance already initialized" }` |

**CORS:**
```yaml
Access-Control-Allow-Origin: [whitelist]
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-setup-token
```

---

### 2. ai-proxy (New)

**Endpoint**: `POST /functions/v1/ai-proxy`

**Headers Required:**
```yaml
Authorization: Bearer <JWT>  # Required - Supabase JWT
Content-Type: application/json
```

**Request Body:**
```typescript
interface AIProxyRequest {
  action: 'analyzeLead' | 'generateEmailDraft' | 'generateObjectionResponse' | 
          'processAudioNote' | 'generateDailyBriefing' | 'generateRescueMessage' |
          'parseNaturalLanguageAction' | 'chatWithCRM' | 'generateBirthdayMessage' |
          'generateBoardStructure' | 'generateBoardStrategy' | 'refineBoardWithAI' |
          'chatWithBoardAgent';
  data: Record<string, unknown>;  // Action-specific data
}
```

**Response:**

| Status | Description | Body |
|--------|-------------|------|
| 200 | Success | `{ result: unknown }` (action-specific) |
| 400 | Invalid request | `{ error: string }` |
| 401 | Unauthorized (invalid/missing JWT) | `{ error: "Unauthorized" }` |
| 403 | Consent required | `{ error: "AI consent required", consentType: string }` |
| 429 | Rate limited | `{ error: "Rate limit exceeded", retryAfter: number }` |
| 500 | Provider error | `{ error: string, provider: string }` |

**Rate Limits:**
- 60 requests/minute per user
- 1000 requests/day per user

---

### 3. delete-user (Modified)

**Endpoint**: `POST /functions/v1/delete-user`

**Headers Required:**
```yaml
Authorization: Bearer <JWT>  # Required - Supabase JWT (admin only)
Content-Type: application/json
```

**Request Body:**
```typescript
interface DeleteUserRequest {
  userId: string;  // Required - UUID of user to delete
}
```

**Response:**

| Status | Description | Body |
|--------|-------------|------|
| 200 | Success | `{ success: true, message: "User deleted successfully" }` |
| 200 | Failure | `{ success: false, error: string }` |
| 401 | Unauthorized | `{ error: "Not authenticated" }` |
| 403 | Forbidden (cross-tenant) | `{ error: "Forbidden: cross-tenant operation" }` |
| 403 | Forbidden (not admin) | `{ error: "Only admins can delete users" }` |
| 403 | Forbidden (self-delete) | `{ error: "Você não pode remover a si mesmo" }` |

**Audit Log Entry:**
```typescript
{
  action: 'USER_DELETE' | 'CROSS_TENANT_DELETE_ATTEMPT',
  target_type: 'user',
  target_id: userId,
  details: {
    target_email: string,
    success: boolean
  }
}
```

---

### 4. accept-invite (Modified)

**Endpoint**: `POST /functions/v1/accept-invite`

**Request Body:**
```typescript
interface AcceptInviteRequest {
  email: string;     // Required
  password: string;  // Required (min 8 chars)
  token: string;     // Required - UUID invite token
  name?: string;     // Optional - Display name
}
```

**Response:**

| Status | Description | Body |
|--------|-------------|------|
| 200 | Success | `{ user: User, message: "Convite aceito com sucesso!" }` |
| 400 | Invalid request | `{ error: string }` |
| 400 | Token not found | `{ error: "Convite inválido ou não encontrado" }` |
| 400 | Token expired | `{ error: "Convite expirado" }` |
| 400 | Token already used | `{ error: "Este convite já foi utilizado" }` |
| 400 | Email mismatch | `{ error: "Este convite não é válido para este email" }` |

**Validation Rules:**
- Token must exist AND `used_at IS NULL` AND `expires_at > NOW()`
- If `invite.email` is set, must match request email (case-insensitive)
- After success, `used_at` is set to current timestamp

---

## Frontend APIs

### 5. useAIConsent Hook

**Interface:**
```typescript
interface UseAIConsentResult {
  // State
  hasConsent: (type: ConsentType) => boolean;
  isLoading: boolean;
  
  // Actions
  requestConsent: (type: ConsentType) => Promise<boolean>;
  revokeConsent: (type: ConsentType) => Promise<void>;
  
  // Modal
  showConsentModal: boolean;
  pendingConsentType: ConsentType | null;
  onConsentAccept: () => Promise<void>;
  onConsentDecline: () => void;
}

type ConsentType = 'AI_DATA_PROCESSING' | 'AI_BIOMETRIC_DATA';
```

**Usage:**
```typescript
const { hasConsent, requestConsent } = useAIConsent();

const handleAIAction = async () => {
  if (!hasConsent('AI_DATA_PROCESSING')) {
    const consented = await requestConsent('AI_DATA_PROCESSING');
    if (!consented) return; // User declined
  }
  // Proceed with AI action
};
```

---

### 6. AIConsentModal Component

**Props:**
```typescript
interface AIConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  consentType: ConsentType;
  isLoading?: boolean;
}
```

**Content by Type:**

| Type | Title | Description |
|------|-------|-------------|
| AI_DATA_PROCESSING | Consentimento para Uso de IA | Autorizo o processamento de meus dados por APIs de IA externas (Google, OpenAI, Anthropic)... |
| AI_BIOMETRIC_DATA | Consentimento para Dados Biométricos | Autorizo o processamento de minha voz (dado biométrico sensível)... |

---

## Database Procedures

### 7. log_audit_event

**Signature:**
```sql
FUNCTION log_audit_event(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_success BOOLEAN DEFAULT TRUE
) RETURNS UUID
```

**Usage:**
```sql
SELECT log_audit_event(
  'USER_DELETE',
  'user',
  '123e4567-e89b-12d3-a456-426614174000',
  '{"email": "deleted@example.com"}'::jsonb,
  TRUE
);
```

---

### 8. encrypt_api_key / decrypt_api_key

**Signatures:**
```sql
FUNCTION encrypt_api_key(plain_key TEXT) RETURNS BYTEA
FUNCTION decrypt_api_key(encrypted_key BYTEA) RETURNS TEXT
```

**Security:**
- SECURITY DEFINER
- Requires `app.encryption_key` to be set in session
- Never exposes key to RLS-filtered queries

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_REQUIRED | 401 | JWT missing or invalid |
| FORBIDDEN | 403 | Operation not allowed for user |
| CONSENT_REQUIRED | 403 | AI consent not granted |
| CROSS_TENANT | 403 | Cross-tenant operation attempted |
| TOKEN_EXPIRED | 400 | Invite token expired |
| TOKEN_USED | 400 | Invite token already used |
| TOKEN_INVALID | 400 | Invite token not found |
| RATE_LIMITED | 429 | Too many requests |
| PROVIDER_ERROR | 500 | AI provider error |
