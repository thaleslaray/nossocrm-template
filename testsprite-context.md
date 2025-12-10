# TestSprite Context - nossocrm

> Este arquivo foi gerado automaticamente por `npm run scan:project`
> Última atualização: 2025-12-04T19:05:49.499Z

## 📋 Informações do Projeto

| Aspecto | Valor |
|---------|-------|
| **Nome** | nossocrm |
| **Tipo** | Vite |
| **Framework** | React |
| **UI Library** | Tailwind CSS |
| **Backend** | Supabase |
| **Testing Tools** | Vitest, Stagehand |

## 🌐 URL do App

```
Development: http://localhost:3003
```

## 🔐 Credenciais de Teste

> ⚠️ PREENCHA MANUALMENTE antes de rodar o TestSprite

```
Email: e2e-test@example.com
Password: Test123!@#
```

## 📄 Páginas/Rotas

| Rota | Nome | Descrição |
|------|------|-----------|
| `/#/login` | Login | Página login |
| `/#/join` | Join | Página join |
| `/#/setup` | Setup | Página setup |
| `/#dashboard` | Dashboard | Página dashboard |
| `/#inbox` | Inbox | Página inbox |
| `/#boards` | Boards | Página boards |
| `/#pipeline` | Pipeline | Página pipeline |
| `/#contacts` | Contacts | Página contacts |
| `/#settings/*` | Settings | Página settings |
| `/#activities` | Activities | Página activities |
| `/#reports` | Reports | Página reports |
| `/#profile` | Profile | Página profile |
| `/#ai` | Ai | Página ai |
| `/#decisions` | Decisions | Página decisions |
| `/#*` | * | Página * |

## 🧩 Features (Funcionalidades)


### Activities
- **Pasta**: `src/features/activities`
- **Ações**: Não identificadas
- **Arquivos**: ActivitiesPage.tsx


### Ai-hub
- **Pasta**: `src/features/ai-hub`
- **Ações**: Não identificadas
- **Arquivos**: AIHubPage.tsx


### Boards
- **Pasta**: `src/features/boards`
- **Ações**: Não identificadas
- **Arquivos**: BoardsPage.tsx, utils.ts


### Contacts
- **Pasta**: `src/features/contacts`
- **Ações**: Não identificadas
- **Arquivos**: ContactsPage.tsx


### Dashboard
- **Pasta**: `src/features/dashboard`
- **Ações**: Não identificadas
- **Arquivos**: DashboardPage.tsx


### Decisions
- **Pasta**: `src/features/decisions`
- **Ações**: Não identificadas
- **Arquivos**: DecisionQueuePage.tsx, types.ts


### Inbox
- **Pasta**: `src/features/inbox`
- **Ações**: Não identificadas
- **Arquivos**: InboxPage.tsx


### Proactive-agent
- **Pasta**: `src/features/proactive-agent`
- **Ações**: Não identificadas
- **Arquivos**: 


### Profile
- **Pasta**: `src/features/profile`
- **Ações**: Não identificadas
- **Arquivos**: ProfilePage.tsx


### Reports
- **Pasta**: `src/features/reports`
- **Ações**: Não identificadas
- **Arquivos**: ReportsPage.tsx


### Settings
- **Pasta**: `src/features/settings`
- **Ações**: Não identificadas
- **Arquivos**: SettingsPage.tsx, UsersPage.tsx


## 🗃️ Tabelas do Banco (Supabase)

- `profiles`
- `audit_logs`
- `activities`
- `boards`
- `board_stages`
- `deals`
- `user_consents`
- `contacts`
- `crm_companies`
- `deal_items`
- `user_settings`
- `lifecycle_stages`

## 🎯 Jornadas Críticas para Testar

> ⚠️ REVISE E COMPLETE esta seção com base no seu conhecimento do negócio

### 1. 🔐 Autenticação
- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas (deve mostrar erro)
- [ ] Logout

### 2. 👤 Gestão de Contatos
- [ ] Criar novo contato (nome, email, telefone)
- [ ] Editar contato existente
- [ ] Buscar contato por nome
- [ ] Excluir contato

### 3. 💰 Pipeline de Vendas
- [ ] Criar novo deal/negócio
- [ ] Associar deal a um contato
- [ ] Mover deal entre colunas (drag & drop)
- [ ] Editar valor do deal
- [ ] Marcar deal como ganho/perdido

### 4. 📋 Atividades
- [ ] Criar nova atividade/tarefa
- [ ] Marcar atividade como concluída
- [ ] Filtrar atividades por status

### 5. 🤖 Assistente IA (se aplicável)
- [ ] Abrir chat do assistente
- [ ] Enviar pergunta
- [ ] Verificar resposta

## 🔧 Variáveis de Ambiente Necessárias

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BASE_URL`
- `TEST_EMAIL`
- `TEST_PASSWORD`
- `GOOGLE_GENERATIVE_AI_API_KEY`

## 📝 Notas Adicionais

> Adicione aqui qualquer contexto extra que o TestSprite precisa saber:

- Este é um CRM multi-tenant (cada organização vê apenas seus dados)
- O app usa hash routing (`/#/rota`)
- Autenticação via Supabase Auth
- Dark mode suportado

---

## 🚀 Como Usar com TestSprite

1. Revise e complete as seções marcadas com ⚠️
2. Configure o TestSprite MCP no VS Code/Cursor
3. No chat, digite:

```
@TestSprite Use o arquivo testsprite-context.md como contexto e teste as jornadas críticas deste projeto.
```

Ou para um teste específico:

```
@TestSprite Teste a jornada de "Criar novo contato" seguindo o contexto em testsprite-context.md
```
