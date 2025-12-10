# Feature Specification: Correções de Segurança Críticas

**Feature Branch**: `001-security-fixes-critical`  
**Created**: 03/12/2025  
**Status**: Draft  
**Input**: Implementar correções de segurança críticas identificadas na auditoria de segurança (VULN-001 a VULN-005)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Proteção da Inicialização da Instância (Priority: P1)

Como **administrador da plataforma**, preciso que o processo de setup inicial da instância seja protegido por um token secreto, para que apenas pessoas autorizadas possam criar a primeira empresa e usuário admin.

**Why this priority**: Esta é a vulnerabilidade mais crítica (CVSS 9.8) que permite takeover completo da instância antes do setup legítimo. Impacto total na segurança do sistema.

**Independent Test**: Pode ser testado chamando a Edge Function setup-instance sem/com token e verificando se o acesso é negado/permitido corretamente.

**Acceptance Scenarios**:

1. **Given** uma instância nova não inicializada, **When** alguém tenta acessar setup-instance sem token, **Then** recebe erro 401 Unauthorized
2. **Given** uma instância nova não inicializada, **When** alguém tenta acessar setup-instance com token inválido, **Then** recebe erro 401 Unauthorized
3. **Given** uma instância nova não inicializada, **When** o admin autorizado acessa setup-instance com token válido, **Then** a empresa e usuário admin são criados com sucesso
4. **Given** uma instância já inicializada, **When** alguém tenta acessar setup-instance mesmo com token válido, **Then** recebe erro 403 Forbidden

---

### User Story 2 - Proteção de Chaves de API no Backend (Priority: P1)

Como **usuário do sistema**, preciso que minhas chaves de API de serviços de IA nunca sejam expostas no frontend, para que terceiros não possam abusar das minhas credenciais e gerar custos.

**Why this priority**: Vulnerabilidade crítica (CVSS 9.1) que expõe credenciais no bundle JavaScript. Permite abuse ilimitado com impacto financeiro direto.

**Independent Test**: Pode ser testado verificando que o bundle JavaScript compilado não contém nenhuma API key e que chamadas de IA passam exclusivamente pelo proxy backend.

**Acceptance Scenarios**:

1. **Given** a aplicação em produção, **When** um usuário inspeciona o código JavaScript no navegador, **Then** não encontra nenhuma chave de API
2. **Given** um usuário configurou sua chave de API, **When** ele usa funcionalidades de IA, **Then** a chamada passa por uma Edge Function proxy sem expor a chave
3. **Given** um usuário tenta chamar APIs de IA diretamente, **When** sem passar pelo proxy autenticado, **Then** a chamada falha por falta de credenciais
4. **Given** chaves de API armazenadas no banco, **When** consultadas, **Then** estão encriptadas e não em texto plano

---

### User Story 3 - Consentimento para Uso de IA com Dados Pessoais (Priority: P1)

Como **titular dos dados (LGPD)**, preciso dar consentimento explícito antes que meus dados pessoais sejam enviados para APIs de IA externas, para garantir conformidade legal e transparência.

**Why this priority**: Violação direta da LGPD (Art. 7º, 8º, 48º) com risco de multa de até 2% do faturamento. Afeta todos os usuários e seus clientes.

**Independent Test**: Pode ser testado verificando que funcionalidades de IA só funcionam após aceite explícito do termo de consentimento.

**Acceptance Scenarios**:

1. **Given** um usuário novo que nunca usou IA, **When** tenta usar qualquer funcionalidade de IA, **Then** vê um modal solicitando consentimento explícito
2. **Given** o modal de consentimento exibido, **When** o usuário lê e aceita os termos, **Then** o consentimento é registrado com timestamp, IP e versão do termo
3. **Given** um usuário que aceitou o consentimento, **When** usa funcionalidades de IA, **Then** as chamadas são permitidas normalmente
4. **Given** um usuário que não aceitou ou revogou consentimento, **When** tenta usar IA, **Then** as funcionalidades estão desabilitadas com mensagem explicativa
5. **Given** funcionalidades que usam áudio (biometria), **When** o usuário tenta usá-las, **Then** é solicitado consentimento específico adicional para dados biométricos
6. **Given** um usuário que deseja revogar seu consentimento, **When** acessa as configurações de privacidade, **Then** pode revogar e as funcionalidades de IA são desabilitadas imediatamente

---

### User Story 4 - Isolamento Multi-Tenant em Exclusão de Usuários (Priority: P1)

Como **administrador de uma empresa**, preciso que a exclusão de usuários seja restrita apenas aos membros da minha própria empresa, para garantir isolamento completo entre tenants.

**Why this priority**: Vulnerabilidade alta (CVSS 7.1) que permite destruição de dados cross-tenant. Viola o princípio fundamental de isolamento SaaS.

**Independent Test**: Pode ser testado tentando excluir um usuário de outra empresa e verificando que a operação é bloqueada.

**Acceptance Scenarios**:

1. **Given** um admin da Empresa A, **When** tenta excluir um usuário da Empresa A, **Then** a exclusão é permitida e auditada
2. **Given** um admin da Empresa A, **When** tenta excluir um usuário da Empresa B, **Then** recebe erro 403 Forbidden
3. **Given** qualquer tentativa de exclusão, **When** executada, **Then** é registrada em log de auditoria com detalhes da operação
4. **Given** um admin, **When** tenta excluir a si mesmo, **Then** recebe erro indicando que não pode excluir a própria conta

---

### User Story 5 - Tokens de Convite de Uso Único (Priority: P2)

Como **administrador de uma empresa**, preciso que os tokens de convite para novos usuários sejam de uso único e com expiração obrigatória, para evitar criação não autorizada de contas.

**Why this priority**: Vulnerabilidade alta (CVSS 6.8) que permite reutilização infinita de tokens e criação massiva de contas não autorizadas.

**Independent Test**: Pode ser testado usando um token de convite duas vezes e verificando que o segundo uso é rejeitado.

**Acceptance Scenarios**:

1. **Given** um token de convite válido e não utilizado, **When** usado para criar uma conta, **Then** a conta é criada e o token é marcado como usado
2. **Given** um token de convite já utilizado, **When** alguém tenta usá-lo novamente, **Then** recebe erro indicando token inválido ou já utilizado
3. **Given** um token de convite expirado, **When** alguém tenta usá-lo, **Then** recebe erro indicando token expirado
4. **Given** a criação de um novo convite, **When** não especificada data de expiração, **Then** é aplicado um prazo padrão de 7 dias
5. **Given** convites antigos sem data de expiração, **When** o sistema é atualizado, **Then** recebem expiração automática baseada na data de criação

---

### Edge Cases

- O que acontece se o token de setup for comprometido antes do primeiro uso?
  - O admin legítimo deve poder invalidar o token e gerar um novo via painel de controle do Supabase
- Como o sistema lida se a Edge Function de proxy de IA ficar indisponível?
  - Funcionalidades de IA mostram mensagem de erro amigável e permitem retry
- O que acontece se um usuário tentar revogar consentimento enquanto uma operação de IA está em andamento?
  - A operação em andamento é completada, mas novas operações são bloqueadas
- Como lidar com convites enviados para emails que já têm conta?
  - O convite é rejeitado com mensagem indicando que o email já está registrado

---

## Requirements *(mandatory)*

### Functional Requirements

**Setup-Instance (VULN-001):**
- **FR-001**: Sistema DEVE exigir um token secreto (SETUP_SECRET_TOKEN) para permitir execução do setup-instance
- **FR-002**: Sistema DEVE retornar 401 Unauthorized quando token não fornecido ou inválido
- **FR-003**: Sistema DEVE retornar 403 Forbidden quando instância já foi inicializada
- **FR-004**: Sistema DEVE restringir CORS para origens específicas ao invés de wildcard

**Proteção de API Keys (VULN-002):**
- **FR-005**: Sistema NÃO DEVE incluir API keys no bundle JavaScript do frontend
- **FR-006**: Sistema DEVE prover uma Edge Function proxy para chamadas de IA
- **FR-007**: Edge Function proxy DEVE validar autenticação JWT antes de usar API keys
- **FR-008**: Sistema DEVE armazenar API keys de forma encriptada no banco de dados
- **FR-009**: Interface DEVE informar corretamente onde as chaves são armazenadas (banco, não localStorage)

**Consentimento LGPD (VULN-003):**
- **FR-010**: Sistema DEVE bloquear funcionalidades de IA até consentimento explícito do usuário
- **FR-011**: Sistema DEVE exibir modal de consentimento na primeira tentativa de uso de IA
- **FR-012**: Sistema DEVE registrar consentimento com: user_id, tipo, versão do termo, timestamp, IP
- **FR-013**: Sistema DEVE permitir revogação de consentimento a qualquer momento
- **FR-014**: Sistema DEVE exigir consentimento específico para dados biométricos (áudio)
- **FR-015**: Sistema DEVE aplicar minimização de dados enviados para APIs externas

**Cross-Tenant User Deletion (VULN-004):**
- **FR-016**: Edge Function delete-user DEVE validar que targetProfile.company_id === currentUser.company_id
- **FR-017**: Sistema DEVE retornar 403 Forbidden em tentativas de exclusão cross-tenant
- **FR-018**: Sistema DEVE registrar todas as tentativas de exclusão em log de auditoria

**Tokens de Convite (VULN-005):**
- **FR-019**: Sistema DEVE marcar token como usado (used_at) após primeiro uso
- **FR-020**: Sistema DEVE rejeitar tokens já utilizados (used_at IS NOT NULL)
- **FR-021**: Sistema DEVE exigir data de expiração obrigatória em todos os convites
- **FR-022**: Sistema DEVE aplicar expiração padrão de 7 dias para novos convites
- **FR-023**: Migração DEVE adicionar expiração retroativa a convites existentes sem data

### Key Entities

- **user_consents**: Registro de consentimentos de usuários (user_id, consent_type, version, granted_at, ip_address, revoked_at)
- **audit_logs**: Log de auditoria para operações sensíveis (user_id, action, target_id, company_id, details, timestamp)
- **company_invites**: Convites de usuários (id, email, role, company_id, expires_at NOT NULL, used_at, created_at)
- **user_settings**: Configurações do usuário com campo ai_api_key_encrypted (BYTEA) ao invés de texto plano

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Segurança:**
- **SC-001**: Zero possibilidade de setup-instance não autorizado (100% das chamadas sem token válido retornam 401)
- **SC-002**: Zero API keys expostas no bundle JavaScript (verificável via grep no diretório dist/)
- **SC-003**: 100% das chamadas de IA passam pelo proxy autenticado
- **SC-004**: Zero exclusões cross-tenant possíveis (100% das tentativas são bloqueadas)
- **SC-005**: Zero reutilização de tokens de convite (100% das segundas tentativas falham)

**Compliance LGPD:**
- **SC-006**: 100% dos usuários de IA têm consentimento registrado antes do primeiro uso
- **SC-007**: Tempo médio para exibir modal de consentimento inferior a 500ms
- **SC-008**: Revogação de consentimento desabilita IA em tempo real (menos de 1 segundo)

**Auditoria:**
- **SC-009**: 100% das operações de exclusão de usuário são registradas em audit_logs
- **SC-010**: Logs de auditoria incluem: quem, o quê, quando, de onde (IP), resultado

**Usabilidade:**
- **SC-011**: Mensagens de erro são claras e orientam o usuário sobre próximos passos
- **SC-012**: Funcionalidades de IA continuam funcionando normalmente após aceite de consentimento

---

## Assumptions

- O Supabase Dashboard permite configurar secrets para Edge Functions (SETUP_SECRET_TOKEN, DB_ENCRYPTION_KEY)
- A extensão pgcrypto está disponível no PostgreSQL do Supabase para encriptação
- Os usuários têm navegadores modernos que suportam as APIs necessárias
- A equipe tem acesso para criar/modificar Edge Functions no Supabase
- DPAs (Data Processing Agreements) com Google, OpenAI e Anthropic serão negociados separadamente (fora do escopo técnico)
