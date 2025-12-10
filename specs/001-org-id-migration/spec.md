# Feature Specification: Multi-Tenant Organization ID Migration

**Feature Branch**: `001-org-id-migration`  
**Created**: 2025-12-03  
**Status**: Draft  
**Input**: User description: "Migrate company_id to organization_id - Full multi-tenant naming convention refactor following Clerk/Auth0 patterns (Option B.1 - Complete Migration)"

## Context & Problem Statement

O NossoCRM é um CRM multi-tenant SaaS que atualmente usa `company_id` para dois conceitos distintos:

1. **Tenant** (quem PAGA pelo CRM) - `profile.company_id` → tabela `companies`
2. **Empresa Cliente** (com quem o usuário negocia) - `deal.companyId` → `crm_company_id`

Esta ambiguidade causa confusão no código e já causou bugs de produção (403 Forbidden em activities INSERT). Seguindo padrões de mercado (Clerk, Auth0, WorkOS), esta migração renomeia:

- `companies` → `organizations` (tabela de tenants)
- `company_id` → `organization_id` (FK de tenant em todas as tabelas)
- `Deal.companyId` → `Deal.clientCompanyId` (no TypeScript, para clareza)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desenvolvedores navegam código sem confusão (Priority: P1)

Como desenvolvedor do NossoCRM, eu preciso que os nomes de variáveis e tabelas sejam semanticamente claros, para que ao ler `organization_id` eu saiba que é o tenant (quem paga) e ao ler `clientCompanyId` eu saiba que é a empresa cliente.

**Why this priority**: Elimina a causa raiz de bugs recorrentes e reduz onboarding time de novos devs.

**Independent Test**: Um novo desenvolvedor lendo o código consegue distinguir tenant de cliente em 100% dos casos sem consultar documentação.

**Acceptance Scenarios**:

1. **Given** código TypeScript com `profile.organizationId`, **When** desenvolvedor lê o código, **Then** entende que é o ID do tenant sem ambiguidade
2. **Given** tipo `Deal` com `clientCompanyId`, **When** desenvolvedor lê o código, **Then** entende que é a empresa cliente (CRM) e não o tenant
3. **Given** consulta SQL com `organization_id`, **When** desenvolvedor vê a query, **Then** sabe que é isolamento multi-tenant

---

### User Story 2 - Sistema continua funcionando após migração (Priority: P1)

Como usuário do CRM, eu preciso que todas as funcionalidades existentes continuem funcionando normalmente após a migração de nomenclatura.

**Why this priority**: Migração não pode quebrar produção - é pré-requisito básico.

**Independent Test**: Todos os testes automatizados passam e fluxos críticos funcionam em staging.

**Acceptance Scenarios**:

1. **Given** usuário autenticado, **When** acessa o board de vendas, **Then** vê seus deals normalmente
2. **Given** usuário arrasta deal entre estágios, **When** solta em novo estágio, **Then** deal é atualizado sem erros 403
3. **Given** usuário cria nova atividade, **When** salva, **Then** atividade é criada corretamente com organization_id do tenant
4. **Given** usuário de tenant A, **When** tenta acessar dados, **Then** vê apenas dados do seu tenant (RLS funciona)

---

### User Story 3 - Documentação reflete nova nomenclatura (Priority: P2)

Como desenvolvedor, eu preciso que o `copilot-instructions.md` e documentação estejam atualizados com a nova terminologia.

**Why this priority**: Documentação desatualizada perpetua confusão.

**Independent Test**: Toda menção a `company_id` (como tenant) é substituída por `organization_id`.

**Acceptance Scenarios**:

1. **Given** arquivo `copilot-instructions.md`, **When** busco por "company_id" em contexto de tenant, **Then** encontro "organization_id"
2. **Given** comentários TSDoc nos services, **When** leio sobre parâmetros de tenant, **Then** vejo `organizationId` documentado

---

### Edge Cases

- **Rollback**: Se a migração falhar no meio, como reverter? 
  - Manter backup do banco antes da migração
  - Migrations devem ser reversíveis (DOWN migration)
- **Cache/Sessions**: Usuários logados durante a migração podem ter tokens com `company_id`?
  - Supabase JWT contém `company_id` em custom claims? Se sim, precisa refresh de tokens
- **Integrações externas**: Há webhooks ou APIs externas que esperam `company_id`?
  - Verificar Edge Functions e serviços de IA (Gemini)

## Requirements *(mandatory)*

### Functional Requirements

#### Database Layer

- **FR-001**: Sistema DEVE renomear tabela `public.companies` para `public.organizations`
- **FR-002**: Sistema DEVE renomear coluna `company_id` para `organization_id` em TODAS as tabelas:
  - `profiles`
  - `crm_companies`
  - `boards`
  - `board_stages`
  - `contacts`
  - `products`
  - `deals`
  - `deal_items`
  - `activities`
  - `tags`
  - `lifecycle_stages`
  - `user_settings`
  - `ai_conversations`
  - `ai_decisions`
  - `ai_audio_notes`
- **FR-003**: Sistema DEVE atualizar todos os índices de `*_company_id_idx` para `*_organization_id_idx`
- **FR-004**: Sistema DEVE atualizar todas as RLS policies para usar `organization_id`
- **FR-005**: Sistema DEVE atualizar função `get_user_company_id()` para `get_user_organization_id()`

#### TypeScript Layer

- **FR-006**: Sistema DEVE criar type alias `type OrganizationId = string` em `types.ts`
- **FR-007**: Sistema DEVE renomear `Profile.companyId` para `Profile.organizationId`
- **FR-008**: Sistema DEVE renomear `Deal.companyId` para `Deal.clientCompanyId` (este é empresa cliente, não tenant)
- **FR-009**: Sistema DEVE renomear `Contact.companyId` para `Contact.clientCompanyId`
- **FR-010**: Sistema DEVE atualizar todos os services em `lib/supabase/*.ts` para usar `organization_id`
- **FR-011**: Sistema DEVE atualizar todos os query hooks em `lib/query/hooks/*.ts`
- **FR-012**: Sistema DEVE atualizar todos os controllers em `features/*/hooks/*.ts`
- **FR-013**: Sistema DEVE atualizar `AuthContext.tsx` para expor `profile.organizationId`

#### Edge Functions

- **FR-014**: Sistema DEVE atualizar Edge Functions que usam `company_id`:
  - `setup-instance`
  - `create-user`
  - `delete-user`
  - `list-users`
  - `invite-users`

#### Documentation

- **FR-015**: Sistema DEVE atualizar `copilot-instructions.md` com nova terminologia
- **FR-016**: Sistema DEVE adicionar glossário de termos no README ou docs

### Key Entities

- **Organization** (antes Company): Representa o tenant que paga pelo CRM. Cada organização tem múltiplos usuários (profiles) e todos os dados são isolados por `organization_id`.
  - Atributos: `id`, `name`, `industry`, `website`, `createdAt`

- **CRM Company** (crm_companies): Representa empresas CLIENTES que o usuário gerencia dentro do CRM. 
  - FK: `organization_id` (tenant que possui este registro)
  - Relaciona com: Contacts, Deals

- **Profile**: Usuário do sistema, pertence a uma Organization
  - FK: `organization_id` (antes `company_id`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das ocorrências de `company_id` (como tenant) no código são substituídas por `organization_id`
- **SC-002**: 0 erros de TypeScript após migração (`npx tsc --noEmit` passa)
- **SC-003**: 100% dos testes automatizados passam após migração
- **SC-004**: Tempo de migração do banco de dados não excede 5 minutos para dataset atual
- **SC-005**: Zero downtime para usuários (migração pode ser feita em manutenção programada curta)
- **SC-006**: Novos desenvolvedores conseguem entender a distinção tenant/cliente em menos de 5 minutos lendo o código
- **SC-007**: Nenhum bug de "403 Forbidden" relacionado a confusão de IDs após 30 dias da migração

## Assumptions

1. **Dados existentes serão migrados automaticamente** - A migration SQL faz ALTER TABLE RENAME, preservando dados
2. **Não há integrações externas** que dependam de `company_id` via API REST pública
3. **Tokens JWT** do Supabase Auth não contêm `company_id` como custom claim (verificar)
4. **Ambiente de staging** está disponível para validação antes de produção
5. **Backup do banco** será feito antes da migração

## Out of Scope

- Migração de histórico de logs/auditoria que mencionem `company_id`
- Mudança de `crm_companies` para outro nome (mantém como está, pois já é claro)
- Internacionalização de labels de UI (fora do escopo técnico)

## Dependencies

- Supabase CLI para executar migrations
- Acesso administrativo ao banco de produção
- Janela de manutenção de ~15-30 minutos para migração
