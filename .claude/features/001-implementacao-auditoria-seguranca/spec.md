---
parent_branch: main
feature_number: 001
status: In Progress
created_at: 2025-12-02T21:30:00-03:00
---

# Feature: Correção Completa de Vulnerabilidades de Segurança e Conformidade LGPD

## Overview

Uma auditoria de segurança identificou 24 vulnerabilidades críticas, altas, médias e baixas no sistema CRMIA, incluindo falhas de autenticação, exposição de credenciais, violações de isolamento multi-tenant, não-conformidade com LGPD e ausência de controles de segurança essenciais.

**Risco Atual**: 🔴 CRÍTICO
- 3 vulnerabilidades críticas com potencial de takeover completo ou financial loss ilimitado
- 6 vulnerabilidades altas com risco de vazamento de dados cross-tenant
- 11 vulnerabilidades médias afetando CORS, rate limiting, validações e auditoria
- 4 vulnerabilidades baixas relacionadas a timeouts e soft delete
- **Risco Financeiro Total**: R$ 4.250.000 (multas LGPD + custos operacionais)
- **Multa LGPD Estimada**: R$ 2-10 milhões por não-conformidade com Art. 7º, 8º, 46º, 48º

**Objetivo desta Feature**: Implementar todas as 24 correções organizadas em 5 sprints conforme roadmap de remediação, eliminando riscos críticos de segurança e garantindo conformidade total com LGPD.

**Por que é importante**:
- Proteção contra takeover de instância antes do setup legítimo
- Prevenção de custos ilimitados por abuso de API keys expostas
- Conformidade legal obrigatória com LGPD (evitar multas milionárias)
- Garantia de isolamento multi-tenant (SaaS trust fundamental)
- Proteção de dados pessoais e biométricos de usuários

## User Scenarios

### Cenário 1: Setup Seguro da Instância (VULN-001)
**Como**: Primeiro usuário admin do sistema
**Quero**: Configurar a instância com garantia de que sou o único capaz de criar a conta administrativa
**Para que**: Nenhum atacante possa tomar controle da instância antes de mim

**Fluxo Atual (INSEGURO)**:
1. Admin descobre URL do projeto Supabase
2. Atacante também pode descobrir a URL (via enumeration, vazamento, etc.)
3. Atacante chama endpoint `/setup-instance` SEM AUTENTICAÇÃO
4. Atacante cria conta admin maliciosa e controla instância INTEIRA
5. Admin legítimo é bloqueado ao tentar setup (instância já inicializada)

**Fluxo Esperado (SEGURO)**:
1. Admin recebe token secreto único via canal seguro
2. Admin acessa página de setup e insere token + dados da empresa
3. Sistema valida token e marca como usado (single-use)
4. Qualquer tentativa posterior retorna erro 403 "Setup already completed"
5. Tentativas sem token válido retornam erro 401 "Unauthorized"

### Cenário 2: Uso de Recursos de IA com Consentimento (VULN-002, VULN-003)
**Como**: Usuário do CRM que deseja usar funcionalidades de IA
**Quero**: Ser informado claramente sobre compartilhamento de dados e autorizar explicitamente
**Para que**: Meus dados pessoais e de clientes sejam protegidos conforme LGPD

**Fluxo Atual (NÃO-CONFORME LGPD)**:
1. Usuário clica em "Gerar rascunho de email com IA"
2. Sistema envia nome, email, empresa do contato para Google Gemini/OpenAI/Anthropic (EUA)
3. Dados são processados em país SEM adequação LGPD
4. Nenhum consentimento foi solicitado
5. API key está EXPOSTA no bundle JavaScript (qualquer um pode extrair)

**Fluxo Esperado (CONFORME LGPD)**:
1. Usuário clica em funcionalidade de IA pela primeira vez
2. Modal de consentimento aparece explicando:
   - Quais dados serão compartilhados (nomes, empresas, valores)
   - Quais parceiros receberão dados (Google, OpenAI, Anthropic - EUA)
   - Finalidade (análise preditiva, geração de insights)
   - Retenção (30 dias, depois deletado automaticamente)
   - Direito de revogação a qualquer momento
3. Usuário lê e marca checkboxes:
   - [ ] Autorizo compartilhamento de dados de negócios para IA
   - [ ] Autorizo ESPECIFICAMENTE processamento de áudio (biometria)
4. Sistema registra consent com IP, timestamp, versão do termo
5. Apenas após autorização, funcionalidades de IA são habilitadas
6. API keys NUNCA são expostas no frontend (proxy server-side)

### Cenário 3: Administração de Usuários com Isolamento Multi-Tenant (VULN-004, VULN-012)
**Como**: Admin da Empresa A
**Quero**: Gerenciar apenas usuários da minha empresa
**Para que**: Não haja risco de afetar dados de outras empresas acidentalmente ou maliciosamente

**Fluxo Atual (INSEGURO - Cross-Tenant)**:
1. Admin de Empresa A descobre user_id de Empresa B (via enumeration)
2. Admin chama endpoint `/delete-user` com user_id de Empresa B
3. Sistema valida que é admin ✅
4. Sistema NÃO valida que user pertence à mesma empresa ❌
5. Usuário de Empresa B é DELETADO PERMANENTEMENTE
6. Empresa B perde acesso, dados órfãos, violação SaaS

**Fluxo Esperado (SEGURO - Tenant Isolated)**:
1. Admin tenta deletar user_id de outra empresa
2. Sistema valida:
   - ✅ É admin? Sim
   - ✅ User existe? Sim
   - ✅ User pertence à MESMA empresa? NÃO
3. Sistema retorna erro 403 "Forbidden: Cannot delete users from other companies"
4. Sistema registra tentativa em audit log
5. Alerta automático se múltiplas tentativas cross-tenant detectadas

### Cenário 4: Acesso Público Controlado (VULN-011, VULN-019)
**Como**: Usuário não autenticado ou de outra empresa
**Quero**: Acessar apenas dados públicos explicitamente autorizados
**Para que**: Dados sensíveis como convites, emails e roles não vazem

**Fluxo Atual (INSEGURO)**:
1. Qualquer pessoa (até sem login) executa: `SELECT * FROM company_invites`
2. Sistema retorna TODOS os convites de TODAS as empresas (policy `USING (true)`)
3. Exposição de: emails, company_ids, roles, tokens válidos
4. Atacante usa emails para phishing direcionado
5. Atacante pode tentar usar tokens expostos

**Fluxo Esperado (SEGURO)**:
1. Usuário anônimo tenta listar convites
2. Sistema retorna lista VAZIA (RLS policy restritiva)
3. Apenas admins da PRÓPRIA empresa veem convites da empresa
4. Validação de token de convite ocorre server-side (Edge Function)
5. CORS permite apenas origens whitelisted (não `*`)

### Cenário 5: Operações Auditadas e Rastreáveis (VULN-023)
**Como**: DPO (Data Protection Officer) ou auditor LGPD
**Quero**: Rastrear todas as ações críticas no sistema
**Para que**: Investigações de incidentes e compliance LGPD Art. 48 sejam possíveis

**Fluxo Atual (NÃO-CONFORME)**:
1. Admin deleta usuário
2. Nenhum registro é criado
3. Impossível saber: quem deletou, quando, de onde (IP), por quê
4. Violação LGPD Art. 48 (rastreabilidade)

**Fluxo Esperado (CONFORME)**:
1. Admin executa ação crítica (delete user, change role, export data)
2. Sistema registra em `audit_logs`:
   - Quem (user_id)
   - O quê (ação executada)
   - Quando (timestamp)
   - Onde (IP, user agent)
   - Resultado (success/error)
3. Logs acessíveis por admins e DPO
4. Dashboard de auditoria mostra atividades suspeitas
5. Alertas automáticos para padrões anormais

## Functional Requirements

### Sprint 0: Contenção Imediata (1-2 dias) - P0 Crítico

**REQ-S0-1: Desabilitar Setup-Instance Temporariamente**
- Setup-instance edge function deve ser comentada/desabilitada até correção completa
- Banner visível no app: "Sistema em manutenção de segurança"
- Nenhum setup pode ser executado até implementação de token secreto

**REQ-S0-2: Remover API Keys do Frontend**
- Todas variáveis `VITE_GEMINI_API_KEY` removidas do `.env`
- Rebuild do bundle JavaScript sem API keys
- Features de IA desabilitadas temporariamente
- Banner: "AI features temporarily disabled for security upgrades"

**REQ-S0-3: Corrigir Policy Pública de company_invites**
- Policy `"Public can view invite by token"` deve ser dropada
- Usuários anônimos não podem mais listar convites
- Apenas admins da própria empresa podem gerenciar convites
- Edge Function `accept-invite` continua funcionando (usa Service Role)

**REQ-S0-4: Comunicação de Stakeholders**
- Tech Lead e CEO devem ser informados sobre descobertas
- Plano de remediação aprovado antes de prosseguir

### Sprint 1: Vulnerabilidades P0 Críticas (1 semana) - Segurança Core

**REQ-S1-1: Setup-Instance com Autenticação**
- Setup requer token secreto único gerado via `crypto.randomUUID()`
- Token validado antes de permitir criação de empresa/admin
- Setup marcado como concluído após primeira execução (flag `SETUP_COMPLETED`)
- Tentativas sem token retornam HTTP 401 "Unauthorized"
- Tentativas após setup completo retornam HTTP 403 "Setup already completed"
- Testes: setup sem token, token errado, token válido usado 2x

**REQ-S1-2: API Keys Protegidas via Proxy Server-Side**
- API keys NUNCA expostas no frontend (sem `VITE_*`)
- Edge Function proxy intermediária recebe requests do frontend
- Proxy valida JWT do usuário antes de chamar APIs externas
- Proxy usa API key armazenada server-side (banco ou env)
- Frontend chama `/functions/v1/ai-proxy` ao invés de APIs diretas
- Encryption at rest de API keys no banco (pgcrypto)
- Testes: bundle sem keys, network tab sem keys, proxy valida JWT

**REQ-S1-3: Consent Management para IA e Dados Pessoais**
- Tabela `user_consents` criada com campos: ai_data_sharing, ai_audio_processing
- Modal de consentimento aparece na primeira tentativa de uso de IA
- Modal explica claramente:
  - Dados compartilhados (nomes, empresas, valores, áudio)
  - Parceiros (Google, OpenAI, Anthropic - EUA)
  - Finalidade (análise preditiva)
  - Retenção (30 dias)
  - Direitos (revogação a qualquer momento)
- Checkbox separado para áudio (dados biométricos - Art. 8º LGPD)
- Validação server-side antes de cada chamada de IA
- Revogação de consent desabilita IA imediatamente
- Auditoria de consents (quem, quando, IP, versão do termo)
- Testes: sem consent = erro, revogação = IA desabilitada

**REQ-S1-4: Rate Limiting em Todas Edge Functions**
- Implementação de rate limiting com limite configurável
- Exemplo: 10 requisições por minuto por IP
- Resposta HTTP 429 "Rate limit exceeded" quando ultrapassado
- Proteção contra: brute-force, DoS, account farming
- Testes: 20 requests em 10 segundos = últimas 10 bloqueadas

### Sprint 2: Vulnerabilidades P0 Restantes (1 semana) - Isolamento Multi-Tenant

**REQ-S2-1: Validação Cross-Tenant em delete-user**
- Antes de deletar, validar: `targetProfile.company_id === currentUser.company_id`
- Erro 403 se company_id diferente: "Cannot delete users from other companies"
- Audit log registra tentativas cross-tenant
- Testes: admin A deleta user A (ok), admin A deleta user B (erro 403)

**REQ-S2-2: Tokens de Convite Single-Use**
- Restaurar validação `.is("used_at", null)` antes de aceitar convite
- Após aceite, marcar `used_at = NOW()`
- Campo `expires_at` obrigatório (default 7 dias)
- Tokens expirados rejeitados com erro 400 "Convite expirado"
- Remover campo 'status' inexistente do INSERT
- Job de cleanup diário para tokens expirados
- Testes: token usado 2x (erro), token expirado (erro)

**REQ-S2-3: RLS Policies Consistentes**
- TODAS policies padronizadas para usar `get_user_company_id()`
- Remover dependência de JWT claims `auth.jwt()->>'company_id'`
- Policies de `companies` e `profiles` atualizadas
- Testes abrangentes de RLS em todas tabelas
- Auth Hook desabilitado se presente

**REQ-S2-4: Compliance LGPD - Documentação e Contratos**
- Data Processing Agreements (DPAs) assinados com Google, OpenAI, Anthropic
- Relatório de Impacto à Proteção de Dados (RIPD) criado
- Privacy Policy atualizada com seção de IA
- Cláusulas contratuais: subprocessadores, exclusão de dados, SCCs
- Documentação de não-uso de dados para treinamento

**REQ-S2-5: Defense-in-Depth em Isolamento Multi-Tenant**
- Validação de `company_id` em CAMADA DE APLICAÇÃO (além de RLS)
- Exemplo em deals.update():
  1. SELECT deal para obter company_id
  2. Verificar se company_id do deal === company_id do usuário
  3. Se diferente: erro 403 "Unauthorized: Cross-tenant access denied"
  4. Apenas se OK: executar UPDATE com filtro `.eq('company_id', userCompanyId)`
- Aplicar em: deals, contacts, boards, activities services
- Testes: tentativa cross-tenant em cada serviço = erro 403

### Sprint 3: Hardening e P1 (1 semana) - Segurança Adicional

**REQ-S3-1: CORS Restritivo com Whitelist**
- CORS `Allow-Origin: "*"` substituído por whitelist específica
- Origens permitidas por ambiente:
  - Production: `https://crmia.app`, `https://www.crmia.app`
  - Staging: `https://staging.crmia.app`
  - Development: `http://localhost:3000`, `http://localhost:5173`
- Validação de header `Origin` antes de retornar CORS
- `Access-Control-Allow-Credentials: true` adicionado
- Aplicado em TODAS as 6 Edge Functions
- Testes: request de origem não-whitelisted = CORS error

**REQ-S3-2: Content Security Policy (CSP) Headers**
- Headers de segurança adicionados em `vercel.json`:
  - `Content-Security-Policy`: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' *.supabase.co *.googleapis.com
  - `X-Frame-Options`: DENY
  - `X-Content-Type-Options`: nosniff
  - `Referrer-Policy`: strict-origin-when-cross-origin
  - `Permissions-Policy`: camera=(), microphone=(), geolocation=()
- Aplicado em todas rotas `/(.*)`
- Testes: headers presentes em response, CSP bloqueia scripts inline maliciosos

**REQ-S3-3: Validação de Comprimento em Schemas Zod**
- Função `requiredString()` atualizada com parâmetro `maxLength`
- Todos schemas com limites razoáveis:
  - Nome: 100 caracteres
  - Email: 255 caracteres
  - Telefone: 50 caracteres
  - Role: 50 caracteres
  - Empresa: 200 caracteres
- Mensagem de erro clara: "Campo X excede limite de Y caracteres"
- Testes: input com 1000 caracteres = erro de validação

**REQ-S3-4: list-users com Paginação**
- Remover `admin.listUsers()` sem paginação
- Usar apenas tabela `profiles` (RLS já filtra por company)
- Se listUsers necessário, implementar paginação:
  - PAGE_SIZE = 100
  - Loop com `page++` até `hasMore = false`
- Testes: 500 usuários no sistema, list-users não timeout

**REQ-S3-5: Verificação de Admin em list-users**
- Adicionar verificação: `if (profile.role !== 'admin') throw Error()`
- Apenas admins podem listar usuários da empresa
- Vendedores não têm acesso à lista completa
- Testes: vendedor tenta listar = erro 403

**REQ-S3-6: company_id Explícito em Criações**
- boards.addStage(): passar `company_id` explicitamente
- deals.create(): usar parâmetro `companyId` fornecido
- Não depender 100% de triggers (defense in depth)
- Testes: trigger desabilitado, stage/deal ainda tem company_id

### Sprint 4: Compliance e Monitoramento (1 semana) - Auditoria

**REQ-S4-1: Audit Logs Completos**
- Tabela `audit_logs` criada com campos:
  - id, company_id, user_id, action, resource_type, resource_id
  - old_values (JSONB), new_values (JSONB)
  - ip_address, user_agent, created_at
- Registrar ações críticas:
  - CREATE_USER, DELETE_USER, UPDATE_ROLE
  - DELETE_DEAL, DELETE_CONTACT
  - EXPORT_DATA, REVOKE_CONSENT
- RLS policy: usuário vê apenas logs da própria empresa
- Dashboard de auditoria para admins
- Alertas automáticos para ações suspeitas (ex: 5 deletes em 1 minuto)
- Testes: cada ação crítica gera log, vendedor não vê logs de admin

**REQ-S4-2: Soft Delete em Cascata**
- Adicionar campo `deleted_at` em tabelas:
  - deals, contacts, boards, activities
- RLS policies atualizadas: `AND deleted_at IS NULL`
- Triggers de soft delete cascade (ex: board deletado = deals marcados deleted)
- Views para filtrar deletados automaticamente
- Job de cleanup: hard delete após 90 dias de soft delete
- Testes: soft delete preserva dados, hard delete remove permanentemente

**REQ-S4-3: Direitos dos Titulares LGPD**
- Endpoint `/api/data/export`: retorna JSON com todos dados do usuário
- Endpoint `/api/data/export?format=csv`: exporta em CSV
- Endpoint `/api/consents/ai`: revoga consent com efeito imediato
- Anonimização em delete de conta (não hard delete total)
- Testes: export retorna dados completos, revogação desabilita IA

**REQ-S4-4: Idle Timeout de Sessão**
- AuthContext detecta inatividade após 30 minutos
- Eventos monitorados: mousedown, keydown, scroll, touchstart
- Timer verifica a cada 1 minuto se `Date.now() - lastActivity > 30min`
- Se idle: logout automático + mensagem "Sessão expirada por inatividade"
- Testes: 31 minutos sem ação = logout, ação aos 29 min = sessão mantida

### Sprint 5: Testes e Documentação (3-5 dias) - Validação Final

**REQ-S5-1: Testes de Segurança Abrangentes**
- Validação de TODAS as 24 correções implementadas
- Testes de penetração:
  - Tentativas de bypass de autenticação
  - Ataques cross-tenant
  - Extração de API keys (deve falhar)
  - Enumeração de recursos
  - CORS violations
  - Rate limiting bypass
- Testes automatizados OWASP ZAP
- Pentesting manual com Burp Suite
- Cada vulnerabilidade = teste que DEVE PASSAR

**REQ-S5-2: Documentação de Segurança**
- Security policies documentadas em `/docs/security/`
- Incident Response Plan finalizado e testado
- Runbook de operações seguras para DevOps
- Procedimento de notificação ANPD (< 72h)
- Processo de revogação de consent documentado

**REQ-S5-3: Treinamento de Equipe**
- Sessão de 2h sobre vulnerabilidades corrigidas
- Demonstração prática dos ataques (antes/depois)
- Boas práticas de segurança para desenvolvimento
- Responsabilidades LGPD de cada membro
- Q&A com DPO

**REQ-S5-4: Auditoria Externa (Opcional mas Recomendado)**
- Contratar pentest externo para validação independente
- Auditoria LGPD por consultoria especializada
- Certificação de conformidade se possível

## Success Criteria

### Segurança

1. **Zero Vulnerabilidades Críticas**: Nenhuma vulnerabilidade CVSS >= 9.0 permanece no sistema
2. **Zero Acessos Cross-Tenant**: 100% de tentativas de acesso cross-tenant bloqueadas com erro 403
3. **API Keys Protegidas**: Zero API keys encontradas em bundle JavaScript, DevTools, ou Network Tab
4. **Setup Protegido**: 100% de tentativas de setup sem token válido bloqueadas com erro 401/403
5. **Rate Limiting Ativo**: 95% de ataques de brute-force bloqueados automaticamente
6. **Audit Trail Completo**: 100% de ações críticas registradas em audit logs com timestamp, IP, user_id

### Conformidade LGPD

7. **Consent Rate**: 100% de usuários de IA com consent explícito registrado
8. **DPAs Assinados**: 3/3 parceiros de IA (Google, OpenAI, Anthropic) com contratos LGPD-compliant
9. **RIPD Aprovado**: Relatório de Impacto à Proteção de Dados aprovado por DPO e diretoria
10. **Tempo de Resposta a Solicitações**: 95% de solicitações de direitos dos titulares respondidas em < 15 dias (prazo LGPD)
11. **Privacy Policy Atualizada**: 100% de usuários informados sobre mudanças na política de privacidade

### Performance e Usabilidade

12. **Zero Downtime**: Implementação sem interrupção de serviço para usuários finais
13. **Tempo de Setup**: Setup seguro concluído em < 5 minutos (vs < 2 minutos antes, aceitável)
14. **Latência de IA**: Chamadas via proxy < 500ms mais lentas que diretas (overhead aceitável)
15. **Taxa de Erro de Validação**: < 0.1% de validações legítimas bloqueadas por false positives

### Operacional

16. **Cobertura de Testes**: >= 90% de correções cobertas por testes automatizados
17. **Documentação Completa**: 100% de correções documentadas em runbooks
18. **Treinamento de Equipe**: 100% da equipe técnica treinada em novas práticas de segurança
19. **Incident Response Time**: < 1h para detectar e conter incidente de segurança
20. **Custo de Remediação**: Total em <= R$ 150.000 (desenvolvimento + consultoria + pentesting)

### Métricas de Negócio

21. **Redução de Risco Financeiro**: De R$ 4.250.000 para < R$ 100.000 (98% de redução)
22. **Postura de Segurança**: De 🔴 CRÍTICO para 🟢 BAIXO
23. **Certificação**: Apto para certificações de segurança (SOC 2 Type II, ISO 27001 - futuro)
24. **Customer Trust**: Zero clientes perdidos por motivos de segurança durante implementação

## Key Entities

### Segurança

**Setup Token**: Token secreto único para autorização de setup inicial da instância
- Campos: token (UUID), expires_at, used_at
- Lifecycle: gerado → enviado ao owner → validado → marcado como usado

**User Consent**: Registro de consentimento LGPD para processamento de dados
- Campos: user_id, ai_data_sharing (bool), ai_audio_processing (bool), granted_at, revoked_at, ip_address, consent_version
- Lifecycle: não-consentido → modal apresentado → autorizado → ativo → pode ser revogado

**Audit Log**: Registro imutável de ações críticas no sistema
- Campos: id, company_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, created_at
- Lifecycle: ação executada → log criado → persiste indefinidamente → acessível por admins/DPO

**API Key Encrypted**: Chave de API armazenada com encryption at rest
- Campos: user_id, ai_provider, ai_api_key_encrypted (BYTEA), created_at
- Lifecycle: usuário configura → encriptada com master key → armazenada → decriptada server-side para uso → nunca exposta ao frontend

### Multi-Tenancy

**Company Isolation**: Garantia de isolamento total entre empresas
- Validações: RLS policies + application-layer checks + explicit company_id filters
- Proteções: cross-tenant read/write/delete bloqueados em múltiplas camadas

**Invite Token**: Token single-use para convites de usuários
- Campos: token, email, role, company_id, expires_at, used_at, used_by
- Lifecycle: admin cria → token gerado → email enviado → usuário aceita → token marcado como usado → não pode ser reutilizado

### Compliance

**Data Processing Agreement (DPA)**: Contrato com processadores de dados
- Parceiros: Google LLC, OpenAI LP, Anthropic PBC
- Cláusulas: proteção LGPD/GDPR, subprocessadores, exclusão de dados, SCCs, notificação de incidentes

**RIPD (Relatório de Impacto)**: Documentação obrigatória LGPD
- Seções: descrição do tratamento, necessidade e proporcionalidade, riscos, medidas de segurança, conclusão
- Aprovação: DPO + Diretoria

**Privacy Policy**: Política de privacidade atualizada
- Seções: uso de IA, parceiros tecnológicos, dados compartilhados, finalidade, retenção, direitos dos titulares, base legal, transferência internacional

## Dependencies

### Externas

1. **Supabase Upgrade (se necessário)**: Algumas features de rate limiting podem requerer Supabase Pro plan
2. **DPA Assinaturas**: Resposta dos parceiros de IA pode levar 2-4 semanas
3. **Consultoria LGPD**: Disponibilidade de DPO/advogado especializado
4. **Pentesting Externo**: Agendamento com empresa de segurança (lead time ~2 semanas)
5. **Upstash Redis**: Serviço externo para rate limiting (ou alternativa similar)

### Internas

6. **Feature 002 (Futura)**: Implementação de CSRF tokens (não-bloqueante)
7. **Feature 003 (Futura)**: Subresource Integrity (SRI) para scripts (não-bloqueante)
8. **Aprovação de Budget**: R$ 150.000 para desenvolvimento + consultoria + ferramentas
9. **Alocação de Recursos**: 2 desenvolvedores full-time por 5-6 semanas
10. **Downtime de Deploy**: Janelas de manutenção para migrações de banco

### Bloqueantes

**NENHUM BLOQUEANTE CRÍTICO IDENTIFICADO**

Todas correções podem ser implementadas com tecnologias existentes (React, TypeScript, Supabase, PostgreSQL, Deno Edge Functions, Vercel).

## Assumptions

### Técnicas

1. **Stack Atual Suficiente**: React 19 + Supabase + Vercel suportam todas implementações sem upgrade de frameworks
2. **Backward Compatibility**: Correções não quebram funcionalidades existentes (testes de regressão garantem)
3. **pgcrypto Disponível**: Extensão PostgreSQL `pgcrypto` está habilitada no Supabase para encryption at rest
4. **Supabase RLS Confiável**: RLS policies funcionam corretamente quando bem configuradas (complementadas por validações de aplicação)
5. **Triggers Ativos**: Triggers de auto-preenchimento de company_id existentes continuam funcionando (usados como fallback)

### Negócio

6. **Budget Aprovado**: R$ 150.000 disponíveis para desenvolvimento + consultoria + pentesting
7. **Prioridade Máxima**: Feature tem prioridade P0, outras features podem ser pausadas temporariamente
8. **Stakeholders Alinhados**: CEO, CTO, Legal concordam com abordagem e timeline de 5-6 semanas
9. **Usuários Tolerantes**: Usuários aceitam pequenas fricções (ex: consent modal, setup token) em troca de segurança
10. **Sem Dados em Produção Críticos Ainda**: Correções podem ser testadas em staging antes de produção sem grandes impactos

### LGPD e Legal

11. **Parceiros Cooperativos**: Google, OpenAI, Anthropic responderão solicitações de DPA em tempo razoável
12. **DPO Disponível**: Existe DPO interno ou contratado disponível para aprovar RIPD e privacy policy
13. **Transferência Internacional Permitida**: SCCs (Standard Contractual Clauses) são suficientes para legalizar transferência para EUA
14. **Prazo de Implementação Razoável**: ANPD não processará denúncia durante período de remediação (boa-fé)
15. **Sem Incidentes Conhecidos**: Nenhuma vulnerabilidade foi exploitada até o momento (zero notificações ANPD necessárias)

### Operacional

16. **Equipe Capacitada**: 2 desenvolvedores têm conhecimento de segurança suficiente para implementar correções
17. **QA Robusto**: Equipe de QA consegue validar todas correções com testes manuais e automatizados
18. **Ambientes Separados**: Staging isolado de produção permite testes sem risco
19. **Rollback Possível**: Todas correções podem ser revertidas via git se necessário (mas não esperado)
20. **Monitoramento Ativo**: Sistema de monitoramento (logs, alertas) já está configurado para detectar anomalias

### Defaults Razoáveis

21. **Rate Limit Default**: 10 requisições/minuto suficiente para uso legítimo, previne abusos
22. **Idle Timeout Default**: 30 minutos balanceia segurança e usabilidade
23. **Consent Modal**: Usuários leem e compreendem termos (medido por tempo médio de leitura > 30 segundos)
24. **API Key Rotation**: Não necessário imediatamente após correção (mas recomendado em 90 dias)
25. **Audit Log Retention**: Infinita por padrão, com opção de archive após 5 anos (compliance)

## Out of Scope

### Não Incluído Nesta Feature

1. **Migrações de Dados Existentes**: Dados históricos de usuários SEM consent não serão processados por IA retroativamente
2. **Refatoração de Código Não-Segurança**: Melhorias de código que não afetam segurança ficam para futuras features
3. **Performance Optimization**: Otimizações que não sejam critical path das correções
4. **UI/UX Redesign**: Interface permanece similar, exceto novos modals de consent e mensagens de erro
5. **Certificações Oficiais**: SOC 2, ISO 27001 são objetivos futuros, não parte desta feature
6. **Penetração de Infraestrutura**: Foco em vulnerabilidades de aplicação, não de infra Vercel/Supabase
7. **Funcionalidades Novas**: Zero novas features de negócio, apenas correções de segurança
8. **Integrações com SIEM**: Sistemas de Security Information and Event Management ficam para futuro
9. **Biometria Avançada**: Além de consent para áudio, outras biometrias não são tratadas (não existem no sistema)
10. **Compliance Além de LGPD**: GDPR, CCPA, HIPAA não são escopo direto (LGPD cobre maioria dos requisitos)

## Notes

### Priorização de Sprints

A ordem dos sprints foi definida por:
1. **Impacto de Risco**: Vulnerabilidades CVSS >= 9.0 primeiro (Sprint 1)
2. **Interdependências**: Correções que desbloqueiam outras vêm antes
3. **Compliance Legal**: LGPD crítico em Sprint 1-2 para evitar multas
4. **Facilidade de Implementação**: Sprint 0 são quick wins (1-2 dias)
5. **Validação Final**: Sprint 5 garante qualidade antes de produção

### Estratégia de Rollout

- **Sprint 0**: Deploy imediato (contenção de ataques)
- **Sprints 1-4**: Deploy incremental em staging → validação → produção
- **Sprint 5**: Testes finais em staging → deploy final em produção

### Comunicação com Usuários

- **Transparência**: Usuários informados sobre melhorias de segurança (sem detalhes de vulnerabilidades)
- **Consent Modal**: Apresentado de forma educativa, não intimidadora
- **Downtime**: Comunicado com 48h de antecedência se necessário (esperado: zero downtime)

### Post-Implementation

- **Monitoramento Contínuo**: Alertas configurados para novas tentativas de ataque
- **Security Review Trimestral**: Revisão periódica de segurança a cada 3 meses
- **Dependency Updates**: npm audit + dependabot configurados para alertas automáticos
- **Incident Response Drills**: Simulações de incidentes a cada 6 meses
