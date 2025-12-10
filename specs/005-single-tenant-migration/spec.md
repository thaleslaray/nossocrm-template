# Feature Specification: Migração para Single-Tenant

**Feature Branch**: `005-single-tenant-migration`  
**Created**: 2025-12-07  
**Status**: Draft  
**Input**: Migrar arquitetura multi-tenant para single-tenant para simplificar sistema e eliminar bugs de segurança

---

## Resumo Executivo

O sistema atualmente implementa arquitetura multi-tenant com isolamento via `organization_id` e políticas RLS complexas. Esta migração simplificará drasticamente o sistema removendo toda a lógica de tenant, reduzindo bugs de segurança e complexidade de código.

### Motivação

1. **Complexidade excessiva**: 26 tabelas com RLS, 12 triggers, dezenas de verificações de organization_id
2. **Bugs de segurança**: Falhas de isolamento como a encontrada em `audit_logs_archive`
3. **Código verboso**: Passar `organizationId` em praticamente todas as operações
4. **Uso real**: Sistema usado por uma única organização, não SaaS

---

## User Scenarios & Testing

### User Story 1 - Sistema Funciona Normalmente (Priority: P1)

Usuário continua usando o CRM normalmente após a migração, sem perceber mudanças funcionais. Login, criação de deals, contatos e atividades funcionam como antes.

**Why this priority**: Funcionalidade core não pode quebrar durante a migração.

**Independent Test**: Realizar todas as operações CRUD principais (criar deal, editar contato, completar atividade) e verificar que funcionam corretamente.

**Acceptance Scenarios**:

1. **Given** usuário logado, **When** cria um novo deal, **Then** deal é salvo e aparece no kanban
2. **Given** deal existente, **When** usuário move para nova coluna, **Then** deal atualiza estágio corretamente
3. **Given** contato existente, **When** usuário edita informações, **Then** alterações são persistidas

---

### User Story 2 - Código Simplificado sem Erros (Priority: P1)

Desenvolvedores conseguem trabalhar no código sem se preocupar com isolamento de tenants. Não existem erros de TypeScript relacionados a `organizationId` ausente.

**Why this priority**: Código quebrado impede qualquer desenvolvimento.

**Independent Test**: Build do projeto completa sem erros. Testes passam.

**Acceptance Scenarios**:

1. **Given** código migrado, **When** roda `npm run build`, **Then** compila sem erros
2. **Given** código migrado, **When** roda `npm run test`, **Then** testes passam

---

### User Story 3 - Banco de Dados Limpo (Priority: P2)

Schema SQL não contém mais políticas RLS complexas, triggers de auto_organization_id, ou funções de tenant.

**Why this priority**: Limpeza do banco é essencial para simplificação completa.

**Independent Test**: Arquivo de migração não contém referências a `organization_id` em políticas RLS.

**Acceptance Scenarios**:

1. **Given** schema migrado, **When** analisa políticas RLS, **Then** não há filtros por organization_id
2. **Given** schema migrado, **When** conta triggers, **Then** não existem triggers de auto_organization_id

---

### Edge Cases

- O que acontece com dados existentes que têm `organization_id`? → Manter coluna mas ignorar
- Como lidar com tabelas que referenciam `organizations`? → Manter FK mas tornar opcional
- O que fazer com audit_logs que registram organization_id? → Manter para histórico

---

## Requirements

### Functional Requirements

#### Banco de Dados

- **FR-001**: Sistema DEVE remover todas as políticas RLS que filtram por `organization_id`
- **FR-002**: Sistema DEVE substituir políticas por simples verificação de `auth.uid()` onde aplicável
- **FR-003**: Sistema DEVE remover triggers `auto_organization_id` de todas as tabelas
- **FR-004**: Sistema DEVE remover função `get_user_organization_id()`
- **FR-005**: Sistema DEVE manter colunas `organization_id` para compatibilidade de dados, mas torná-las opcionais

#### Frontend/Backend

- **FR-006**: Sistema DEVE remover passagem de `organizationId` em todas as chamadas de serviço
- **FR-007**: Sistema DEVE remover `organization_id` dos contextos React
- **FR-008**: Sistema DEVE simplificar AuthContext removendo `organizationId`
- **FR-009**: Sistema DEVE remover validation de organization nos serviços Supabase

#### Código

- **FR-010**: Sistema DEVE remover tipo `OrganizationId` do types.ts
- **FR-011**: Sistema DEVE remover tabela `organizations` do uso ativo (manter para histórico)
- **FR-012**: Sistema DEVE atualizar todos os testes para não mockarem organizationId

### Key Entities

- **User (Profile)**: Representa usuário do sistema - remove organization_id como obrigatório
- **Deal**: Negócio/oportunidade - organization_id torna-se opcional
- **Contact**: Contato do CRM - organization_id torna-se opcional
- **Board**: Quadro kanban - organization_id torna-se opcional

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Build do projeto completa sem erros de TypeScript relacionados a organization
- **SC-002**: Todos os testes existentes passam (exceto os que mockam organization)
- **SC-003**: Redução de ~500 linhas no arquivo de migração SQL
- **SC-004**: Zero ocorrências de "get_user_organization_id" em políticas RLS
- **SC-005**: Zero triggers de "auto_organization_id" no schema final
- **SC-006**: Usuário consegue fazer login e usar sistema normalmente

---

## Scope

### In Scope

- Remoção de políticas RLS baseadas em organization_id
- Remoção de triggers auto_organization_id
- Simplificação de contextos React
- Atualização de serviços Supabase
- Atualização de tipos TypeScript

### Out of Scope

- Migração de dados existentes (organization_id permanece nas rows)
- Remoção da tabela organizations (mantida para histórico)
- Mudanças na autenticação Supabase (continua usando auth.users)

---

## Assumptions

1. Sistema é usado por uma única organização/empresa
2. Não há planos de vender como SaaS multi-tenant
3. Dados existentes com organization_id devem ser preservados
4. Autenticação via Supabase Auth permanece inalterada
