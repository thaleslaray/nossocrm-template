# Feature Specification: Testes de Integração para Cobertura Total

**Feature Branch**: `002-integration-tests`  
**Created**: 3 de dezembro de 2025  
**Status**: Draft  
**Input**: User description: "quero criar testes de integracao que cubram 100% do sistema pra evitar regressao"

## User Scenarios & Testing *(mandatory)*

---

## 📥 PÁGINA: INBOX (/inbox)

### User Story 1 - Resolver Tarefas do Dia no Inbox (Priority: P1)

O vendedor começa o dia abrindo o Inbox para ver sua "mesa de trabalho". Ele visualiza atividades atrasadas (em vermelho), reuniões do dia, tarefas pendentes e sugestões da IA (deals parados, aniversários, upsells). Ele processa cada item: completa, adia para amanhã, ou descarta.

**Why this priority**: É a rotina diária principal do vendedor. Se quebrar, o usuário não sabe o que fazer no dia.

**Independent Test**: Acessar Inbox, verificar categorização correta de atividades, processar uma tarefa.

**Acceptance Scenarios**:

1. **Given** usuário com 3 atividades atrasadas + 2 reuniões hoje, **When** acessa /inbox, **Then** vê seção "Atrasadas" com 3 itens vermelhos e "Hoje - Reuniões" com 2 itens
2. **Given** atividade atrasada visível, **When** clica em "Concluir" (✓), **Then** atividade some da lista e toast confirma "Atividade concluída!"
3. **Given** atividade do dia, **When** clica em "Adiar" (⏰), **Then** atividade some e reaparece amanhã
4. **Given** deal parado há 7+ dias, **When** IA sugere "Negócio Parado: Deal X", **When** usuário clica "Aceitar", **Then** deal é reativado e sugestão some
5. **Given** contato com aniversário no mês, **When** usuário aceita sugestão de aniversário, **Then** tarefa "Enviar parabéns para [Nome]" é criada

---

### User Story 2 - Modo Focus do Inbox (Priority: P2)

O vendedor ativa o modo Focus para processar tarefas uma a uma sem distrações. Navega com setas ou botões entre os itens ordenados por prioridade (atrasados → urgentes → hoje → baixa prioridade).

**Why this priority**: Feature de produtividade avançada, não bloqueia uso básico.

**Independent Test**: Alternar para Focus Mode, navegar entre itens, concluir item.

**Acceptance Scenarios**:

1. **Given** Inbox com 5 itens, **When** usuário clica em "Modo Focus", **Then** visualiza primeiro item em destaque com botões Prev/Next
2. **Given** Focus Mode ativo com item 2/5, **When** clica "Próximo", **Then** mostra item 3/5
3. **Given** item atual no Focus, **When** clica "Feito", **Then** item é concluído e próximo aparece automaticamente
4. **Given** último item do Focus, **When** conclui, **Then** mostra mensagem "Inbox Zero! 🎉"

---

## 📊 PÁGINA: DASHBOARD (/dashboard)

### User Story 3 - Visualizar Métricas de Vendas (Priority: P1)

O gestor acessa o Dashboard para ter visão geral do negócio: valor total do pipeline, negócios ativos, taxa de conversão, receita ganha. Também vê funil de vendas e atividades recentes.

**Why this priority**: Visão executiva essencial para tomada de decisão.

**Independent Test**: Carregar dashboard, verificar KPIs calculados corretamente.

**Acceptance Scenarios**:

1. **Given** 10 deals totalizando $50k no pipeline, **When** acessa /dashboard, **Then** card "Pipeline Total" mostra "$50,000"
2. **Given** 8 deals ativos + 2 ganhos, **When** acessa dashboard, **Then** card "Negócios Ativos" mostra "8"
3. **Given** 5 deals ganhos de 20 fechados, **When** acessa dashboard, **Then** card "Conversão" mostra "25%"
4. **Given** gráfico de funil, **When** dados carregam, **Then** exibe barras proporcionais por estágio

---

### User Story 4 - Análise de Saúde da Carteira (Priority: P2)

O gestor verifica a saúde da carteira de clientes: % ativos/inativos/churn, clientes em risco (sem compra há 30+ dias), e LTV médio.

**Why this priority**: Insight avançado de retenção.

**Independent Test**: Ver distribuição de carteira, identificar clientes em risco.

**Acceptance Scenarios**:

1. **Given** 70 contatos ativos, 20 inativos, 10 churn, **When** acessa dashboard, **Then** barra de distribuição mostra 70% verde, 20% amarelo, 10% vermelho
2. **Given** botão "Análise de Carteira", **When** clica, **Then** sistema analisa e mostra toast com quantidade de alertas gerados
3. **Given** cliente ativo sem compra há 35 dias, **When** clica em "Risco de Churn", **Then** navega para lista filtrada desses clientes

---

## 🎯 PÁGINA: BOARDS / PIPELINE (/boards)

### User Story 5 - Criar Board com Wizard IA (Priority: P1)

O usuário quer criar um pipeline de vendas personalizado. Abre o wizard, descreve seu negócio em texto livre ("Vendo cursos online de programação"), a IA gera estrutura com nome, estágios e sugestões de automação. Usuário confirma e board é criado.

**Why this priority**: Diferencial do produto - onboarding inteligente.

**Independent Test**: Gerar board via IA, confirmar criação, verificar no banco.

**Acceptance Scenarios**:

1. **Given** wizard aberto, **When** digita "Vendo cursos online" e clica "Gerar", **Then** IA retorna board com nome sugerido e 4-6 estágios
2. **Given** preview do board gerado, **When** visualiza estágios, **Then** cada estágio tem nome, cor e descrição
3. **Given** preview aprovado, **When** clica "Criar Board", **Then** board aparece na lista lateral e fica selecionado
4. **Given** API key de IA não configurada, **When** tenta usar wizard, **Then** exibe alerta com link para Configurações
5. **Given** IA retorna erro/timeout, **When** ocorre falha, **Then** exibe mensagem amigável e botão "Tentar novamente"

---

### User Story 6 - Gerenciar Deals no Kanban (Priority: P1)

O vendedor trabalha no Kanban arrastando deals entre estágios. Ao mover para "Perdido", sistema pede motivo da perda. Deals parados há 10+ dias ficam com borda vermelha (rotting).

**Why this priority**: Fluxo de trabalho principal diário.

**Independent Test**: Arrastar deal, verificar persistência, testar indicadores visuais.

**Acceptance Scenarios**:

1. **Given** deal em "Novos Leads", **When** arrasta para "Em Negociação", **Then** deal aparece na nova coluna e persiste após refresh
2. **Given** deal sendo movido para "Perdido", **When** solta na coluna, **Then** modal pede "Motivo da perda" antes de confirmar
3. **Given** deal sem atualização há 11 dias, **When** visualiza no kanban, **Then** card tem borda vermelha indicando "rotting"
4. **Given** deal com atividade hoje, **When** visualiza card, **Then** indicador verde aparece no card
5. **Given** deal com atividade atrasada, **When** visualiza card, **Then** indicador vermelho aparece

---

### User Story 7 - Criar Deal Rápido (Priority: P1)

O vendedor adiciona novo deal clicando no "+" do estágio desejado. Preenche título, valor, seleciona contato (opcional), e salva. Deal aparece instantaneamente na coluna.

**Why this priority**: Operação mais frequente do sistema.

**Independent Test**: Criar deal, verificar campos obrigatórios, confirmar na coluna.

**Acceptance Scenarios**:

1. **Given** kanban visível, **When** clica "+" em "Novos Leads", **Then** modal de criação abre
2. **Given** modal aberto, **When** preenche "Projeto ABC" + valor 10000 + salva, **Then** deal aparece em "Novos Leads" com "$10,000"
3. **Given** criação de deal, **When** não preenche título, **Then** botão salvar fica desabilitado
4. **Given** modal de deal, **When** seleciona contato "João Silva", **Then** deal fica vinculado ao contato

---

### User Story 8 - Editar e Excluir Board (Priority: P2)

O usuário gerencia seus boards: renomeia, exclui. Ao excluir board com deals, sistema pergunta para onde mover os deals ou se deve excluí-los.

**Why this priority**: Manutenção de estrutura, usado ocasionalmente.

**Independent Test**: Editar nome do board, excluir board vazio, excluir board com deals.

**Acceptance Scenarios**:

1. **Given** board "Vendas" selecionado, **When** clica em editar → muda nome para "Pipeline Principal" → salva, **Then** nome atualiza na lista
2. **Given** board sem deals, **When** clica excluir → confirma, **Then** board some e outro é selecionado automaticamente
3. **Given** board com 5 deals, **When** clica excluir, **Then** modal pergunta "Mover deals para:" com seletor de board destino
4. **Given** exclusão com opção "Excluir deals junto", **When** confirma, **Then** board e todos deals são removidos

---

## 👥 PÁGINA: CONTATOS (/contacts)

### User Story 9 - Cadastrar e Editar Contatos (Priority: P1)

O vendedor mantém sua base de contatos: cria novos com nome, email, telefone, empresa. Edita informações existentes. Filtra por lifecycleStage (Lead, MQL, Cliente, etc).

**Why this priority**: Base de dados fundamental do CRM.

**Independent Test**: CRUD completo de contato, filtros funcionando.

**Acceptance Scenarios**:

1. **Given** página de contatos, **When** clica "Novo Contato", **Then** modal abre com campos nome, email, telefone, empresa
2. **Given** form preenchido, **When** salva, **Then** contato aparece na lista com lifecycle "Lead" (padrão)
3. **Given** contato existente, **When** clica para editar → altera telefone → salva, **Then** telefone atualizado na lista
4. **Given** 50 contatos, **When** digita "Silva" no busca, **Then** apenas contatos com "Silva" aparecem
5. **Given** abas de lifecycle, **When** clica em "Clientes", **Then** lista filtra apenas lifecycle = CUSTOMER

---

### User Story 10 - Converter Contato em Deal (Priority: P1)

O vendedor identifica oportunidade com um contato e quer criar um deal. Clica em "Criar Deal" no contato, seleciona o board destino, e deal é criado já vinculado ao contato.

**Why this priority**: Ponte entre prospecção e vendas.

**Independent Test**: Criar deal a partir de contato, verificar vínculo.

**Acceptance Scenarios**:

1. **Given** contato "Maria Santos" na lista, **When** clica "Criar Deal", **Then** modal pergunta qual board usar
2. **Given** board selecionado, **When** confirma, **Then** deal é criado com título "Oportunidade - Maria Santos" vinculado ao contato
3. **Given** deal criado, **When** abre detalhes do deal, **Then** mostra contato "Maria Santos" associado

---

### User Story 11 - Excluir Contatos em Massa (Priority: P2)

O vendedor limpa sua base selecionando múltiplos contatos e excluindo de uma vez. Sistema avisa sobre deals que serão afetados.

**Why this priority**: Manutenção de dados, uso ocasional.

**Independent Test**: Selecionar múltiplos, ver contador, confirmar exclusão em massa.

**Acceptance Scenarios**:

1. **Given** lista de contatos, **When** marca checkbox de 3 contatos, **Then** barra de ações aparece com "3 selecionados"
2. **Given** 3 contatos selecionados, **When** clica "Excluir selecionados", **Then** modal confirma "Excluir 3 contatos?"
3. **Given** contato selecionado tem deal, **When** tenta excluir, **Then** modal avisa "Deals vinculados serão excluídos"

---

## 📅 PÁGINA: ATIVIDADES (/activities)

### User Story 12 - Gerenciar Atividades (Priority: P1)

O vendedor organiza suas tarefas e reuniões: cria novas, visualiza em lista ou calendário, marca como concluídas, filtra por tipo (CALL, MEETING, TASK, EMAIL).

**Why this priority**: Gestão de tempo e follow-ups.

**Independent Test**: CRUD de atividade, alternar visualizações, filtros.

**Acceptance Scenarios**:

1. **Given** página de atividades, **When** clica "Nova Atividade", **Then** modal abre com tipo, título, data, deal opcional
2. **Given** form com tipo MEETING + título "Reunião com Cliente" + data amanhã, **When** salva, **Then** atividade aparece na lista
3. **Given** atividade pendente, **When** clica no checkbox, **Then** marca como concluída com risca no texto
4. **Given** lista de atividades, **When** alterna para "Calendário", **Then** visualização muda para grade mensal
5. **Given** filtro por tipo, **When** seleciona "Reuniões", **Then** apenas tipo MEETING/CALL aparecem

---

### User Story 13 - Ações em Massa de Atividades (Priority: P2)

O vendedor seleciona múltiplas atividades para concluir ou adiar de uma vez.

**Why this priority**: Produtividade, usado quando acumula backlog.

**Independent Test**: Selecionar múltiplas, concluir em massa.

**Acceptance Scenarios**:

1. **Given** 5 atividades listadas, **When** seleciona 3, **Then** toolbar aparece com "Concluir todas" e "Adiar todas"
2. **Given** 3 atividades selecionadas, **When** clica "Concluir todas", **Then** todas marcam como concluídas + toast "3 atividades concluídas!"

---

## 🤖 PÁGINA: AI HUB (/ai)

### User Story 14 - Chat com Assistente IA (Priority: P2)

O usuário conversa com o assistente de IA para consultar dados ("Quantos deals fechei este mês?"), pedir análises ("Quais leads estão frios?"), e executar ações ("Crie uma tarefa para ligar para João amanhã").

**Why this priority**: Feature diferenciada mas não essencial para operação básica.

**Independent Test**: Enviar pergunta, receber resposta contextual, executar ação.

**Acceptance Scenarios**:

1. **Given** chat IA aberto, **When** pergunta "Quantos deals tenho?", **Then** IA responde com número correto do pipeline
2. **Given** chat IA aberto, **When** pede "Crie uma tarefa para ligar para Maria amanhã", **Then** IA cria atividade e confirma
3. **Given** API key não configurada, **When** acessa /ai, **Then** tela de bloqueio aparece com link para Configurações
4. **Given** conversa em andamento, **When** clica "Limpar conversa", **Then** histórico é apagado e welcome message volta

---

## ⚡ PÁGINA: CENTRAL DE DECISÕES (/decisions)

### User Story 15 - Processar Decisões Proativas (Priority: P2)

O sistema analisa o CRM e gera sugestões de ação: deals parados, atividades atrasadas, oportunidades de upsell. Usuário aprova, rejeita ou adia cada decisão.

**Why this priority**: Automação inteligente, diferencial competitivo.

**Independent Test**: Rodar análise, ver decisões geradas, aprovar uma.

**Acceptance Scenarios**:

1. **Given** página de decisões vazia, **When** clica "Analisar Agora", **Then** loading aparece e decisões são geradas
2. **Given** decisão "Deal X parado há 10 dias", **When** clica "Aprovar", **Then** ação é executada e decisão some
3. **Given** decisão com prioridade "Crítico", **When** visualiza, **Then** card tem borda vermelha e fica no topo
4. **Given** 5 decisões pendentes, **When** clica "Aprovar todas", **Then** todas são executadas em sequência

---

## 📈 PÁGINA: RELATÓRIOS (/reports)

### User Story 16 - Analisar Performance de Vendas (Priority: P2)

O gestor analisa tendências: gráfico de receita mensal, ciclo médio de vendas, taxa de vitória real (ganhos vs perdidos), e principais motivos de perda.

**Why this priority**: Insights para otimização, não bloqueia operação.

**Independent Test**: Carregar gráficos, verificar cálculos de métricas.

**Acceptance Scenarios**:

1. **Given** 10 deals ganhos nos últimos 6 meses, **When** acessa /reports, **Then** gráfico de tendência mostra linha de receita
2. **Given** deals com data de criação e fechamento, **When** visualiza "Ciclo de Vendas", **Then** mostra média, mais rápido e mais lento
3. **Given** 8 ganhos + 4 perdidos, **When** visualiza "Win/Loss", **Then** mostra 66.7% de taxa de vitória
4. **Given** 4 deals perdidos com motivos, **When** visualiza "Motivos de Perda", **Then** lista ordenada por frequência

---

## ⚙️ PÁGINA: CONFIGURAÇÕES (/settings)

### User Story 17 - Configurar Inteligência Artificial (Priority: P1)

O usuário configura sua chave de API para habilitar features de IA: escolhe provedor (Gemini/OpenAI/Anthropic), insere API key, seleciona modelo. Salva e features ficam disponíveis.

**Why this priority**: Desbloqueia todas as features de IA.

**Independent Test**: Inserir API key, verificar que features IA funcionam.

**Acceptance Scenarios**:

1. **Given** Configurações → IA, **When** seleciona "Google Gemini" + cola API key + salva, **Then** toast confirma "Configurações salvas!"
2. **Given** API key configurada, **When** acessa /ai (chat), **Then** chat funciona (não mostra bloqueio)
3. **Given** API key inválida, **When** tenta usar IA, **Then** erro indica problema com a key

---

### User Story 18 - Gerenciar Tags e Campos Customizados (Priority: P2)

O usuário personaliza o CRM: cria tags para categorizar deals/contatos, adiciona campos customizados (texto, número, select, data).

**Why this priority**: Customização avançada.

**Independent Test**: Criar tag, criar campo customizado, usar em deal.

**Acceptance Scenarios**:

1. **Given** seção de Tags, **When** digita "VIP" + clica adicionar, **Then** tag "VIP" aparece na lista
2. **Given** seção de Campos Customizados, **When** cria campo "Setor" tipo "select" com opções "Tech,Saúde,Varejo", **Then** campo aparece na lista
3. **Given** campo customizado criado, **When** edita um deal, **Then** campo aparece no formulário

---

### User Story 19 - Gerenciar Equipe (Admin) (Priority: P2)

O admin adiciona e remove usuários da empresa: convida por email, define role (admin/vendedor), visualiza quem está ativo.

**Why this priority**: Gestão de acesso, só admin usa.

**Independent Test**: Convidar usuário, ver na lista, remover.

**Acceptance Scenarios**:

1. **Given** admin em Configurações → Equipe, **When** clica "Convidar", **Then** modal pede email + role
2. **Given** convite enviado, **When** usuário aceita, **Then** aparece na lista de usuários
3. **Given** usuário na lista, **When** admin clica "Remover", **Then** usuário é desativado e some da lista

---

## 👤 PÁGINA: PERFIL (/profile)

### User Story 20 - Editar Perfil Pessoal (Priority: P2)

O usuário atualiza suas informações: nome, sobrenome, apelido, telefone, foto de perfil. Também pode alterar sua senha.

**Why this priority**: Self-service básico.

**Independent Test**: Editar nome, upload de foto, alterar senha.

**Acceptance Scenarios**:

1. **Given** página de perfil, **When** clica "Editar" → muda nome para "João Silva" → salva, **Then** nome atualiza e toast confirma
2. **Given** modo de edição, **When** faz upload de foto, **Then** avatar atualiza em tempo real
3. **Given** seção de Segurança, **When** clica "Alterar Senha" → preenche nova senha → confirma, **Then** senha é atualizada

---

## 🔐 AUTENTICAÇÃO (/login, /setup, /join)

### User Story 21 - Fluxo de Login (Priority: P1)

Usuário acessa o sistema com email/senha. Sessão persiste entre abas. Rotas protegidas redirecionam para login se não autenticado.

**Why this priority**: Porta de entrada do sistema.

**Independent Test**: Login válido, sessão persistente, logout.

**Acceptance Scenarios**:

1. **Given** usuário não logado, **When** acessa /dashboard, **Then** redireciona para /login
2. **Given** tela de login, **When** preenche credenciais válidas + submete, **Then** redireciona para página inicial configurada
3. **Given** usuário logado, **When** clica "Sair" no menu, **Then** sessão encerra e volta para /login
4. **Given** usuário logado em aba 1, **When** abre aba 2, **Then** já está autenticado (sessão compartilhada)

---

### User Story 22 - Onboarding de Nova Empresa (/setup) (Priority: P1)

Novo usuário cria sua empresa: preenche nome da empresa, seus dados, senha. Sistema cria tenant (company) + primeiro usuário admin.

**Why this priority**: Aquisição de novos clientes.

**Independent Test**: Preencher setup, verificar empresa e usuário criados.

**Acceptance Scenarios**:

1. **Given** acesso a /setup, **When** preenche "Minha Empresa" + email + senha + submete, **Then** empresa é criada e usuário logado automaticamente
2. **Given** setup completo, **When** sistema carrega, **Then** redireciona para /boards com modal de onboarding

---

## Edge Cases Críticos

- **Conflito de edição**: Dois usuários editam mesmo deal simultaneamente → **último ganha** (optimistic concurrency, padrão Supabase)
- **Timeout de IA**: API Gemini demora > 30s - timeout e retry ou mensagem de erro?
- **Supabase offline**: Backend indisponível - cache local ou tela de erro?
- **Dados órfãos**: Contato excluído após abrir modal de deal - validação no save?
- **Performance**: 500+ deals em um board → **fora de escopo** (testar em E2E/benchmark, não journey test)
- **UUIDs inválidos**: URL manipulation com ID falso - 404 ou redirect?
- **Rate limiting**: Muitas requests de IA em sequência - queue ou block?
- **Upload de foto**: Arquivo > 2MB ou não-imagem - validação client-side?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE testar fluxo completo do Inbox (categorização, complete, snooze, dismiss)
- **FR-002**: Sistema DEVE testar Dashboard com cálculos corretos de KPIs (pipeline, conversão, receita)
- **FR-003**: Sistema DEVE testar wizard de criação de board com IA (input → preview → create)
- **FR-004**: Sistema DEVE testar drag-and-drop de deals com persistência e prompt de loss reason
- **FR-005**: Sistema DEVE testar CRUD completo de contatos incluindo filtros por lifecycle
- **FR-006**: Sistema DEVE testar conversão de contato em deal com vínculo correto
- **FR-007**: Sistema DEVE testar CRUD de atividades com visualização lista/calendário
- **FR-008**: Sistema DEVE testar chat IA com perguntas de consulta e ações de criação
- **FR-009**: Sistema DEVE testar central de decisões (análise, approve, reject, snooze)
- **FR-010**: Sistema DEVE testar relatórios com gráficos e métricas calculadas
- **FR-011**: Sistema DEVE testar configurações de IA (provider, key, model)
- **FR-012**: Sistema DEVE testar gerenciamento de equipe (convidar, remover usuários)
- **FR-013**: Sistema DEVE testar edição de perfil com upload de avatar
- **FR-014**: Sistema DEVE testar fluxo de autenticação (login, logout, proteção de rotas)
- **FR-015**: Sistema DEVE testar onboarding de nova empresa (/setup)
- **FR-016**: Testes DEVEM mockar Supabase e APIs de IA para determinismo
- **FR-017**: Testes DEVEM cobrir edge cases de erro (offline, timeout, dados inválidos)

### Key Entities

- **Activity**: Tarefa ou evento com tipo (CALL/MEETING/TASK/EMAIL), data, status
- **AISuggestion**: Recomendação da IA com tipo (UPSELL/RESCUE/BIRTHDAY/STALLED), prioridade
- **Board**: Pipeline kanban com estágios e configurações de automação
- **BoardStage**: Coluna do kanban com ordem, cor, lifecycle linkado
- **Contact**: Pessoa com dados de contato e lifecycle stage
- **Deal**: Oportunidade com valor, estágio, contato, indicadores (rotting, activity status)
- **Decision**: Ação sugerida pelo sistema com prioridade e status (pending/approved/rejected)
- **Profile**: Dados do usuário (nome, avatar, role) vinculado ao tenant

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das 22 jornadas de usuário têm pelo menos 3 cenários testados
- **SC-002**: Tempo total de execução dos testes de integração < 3 minutos
- **SC-003**: Zero testes flaky (rodam 100x sem falha intermitente)
- **SC-004**: Cobertura de branches nos controllers de feature > 85%
- **SC-005**: Todos os edge cases listados têm pelo menos 1 teste
- **SC-006**: Pipeline CI executa testes em cada PR antes do merge
- **SC-007**: Cada página do sistema (/inbox, /boards, /contacts, etc) tem arquivo de teste dedicado
- **SC-008**: Nenhuma regressão de funcionalidade P1 após merge de nova feature

---

## Assumptions

- Vitest + React Testing Library já configurados
- Mocks de Supabase services em `src/test/__mocks__/supabase.ts` (mockando no nível de service, não HTTP)
- Mocks de IA em `src/test/integration/mock-ai.ts` com respostas determinísticas
- Testes não dependem de API real de IA (Gemini/OpenAI)
- Cada teste roda isolado sem estado compartilhado
- Testes de realtime usam eventos simulados
