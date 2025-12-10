# Feature Specification: Server-Side Pagination

**Feature Branch**: `004-server-pagination`  
**Created**: 2025-12-05  
**Status**: Draft  
**Input**: User description: "Implementar paginação server-side para suportar 10k+ contatos no CRM"

## Contexto

O CRM atualmente carrega todos os contatos de uma vez, mas o Supabase limita retorno padrão a 1000 registros. Com bases de dados de 10.000+ contatos, a aplicação precisa de paginação server-side para garantir performance e usabilidade.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar entre páginas de contatos (Priority: P1)

Como usuário do CRM com milhares de contatos, quero navegar entre páginas de contatos para visualizar todos os registros sem sobrecarga do navegador.

**Why this priority**: Funcionalidade core - sem paginação, usuários com 10k+ contatos não conseguem acessar dados além dos primeiros 1000.

**Independent Test**: Pode ser testado acessando a página de contatos com 10k+ registros e verificando que os controles de paginação aparecem e permitem navegação.

**Acceptance Scenarios**:

1. **Given** existem 10.000 contatos no banco, **When** usuário acessa a página de contatos, **Then** vê apenas 50 contatos por página (padrão) com controles de navegação.
2. **Given** usuário está na página 1 de 200, **When** clica em "Próxima", **Then** vê a página 2 com os próximos 50 contatos.
3. **Given** usuário está na página 50, **When** clica em "Primeira" ou "Última", **Then** navega diretamente para página 1 ou 200.
4. **Given** usuário está na página 1, **When** botão "Anterior" está visível, **Then** está desabilitado.
5. **Given** usuário está na última página, **When** botão "Próxima" está visível, **Then** está desabilitado.

---

### User Story 2 - Alterar quantidade de itens por página (Priority: P1)

Como usuário do CRM, quero escolher quantos contatos ver por página para adequar a visualização ao meu fluxo de trabalho.

**Why this priority**: Complementa a navegação básica - diferentes usuários preferem ver 25, 50, 100 ou mais itens por vez.

**Independent Test**: Pode ser testado selecionando diferentes valores no seletor de "itens por página" e verificando que a tabela exibe a quantidade correta.

**Acceptance Scenarios**:

1. **Given** usuário está vendo 50 contatos por página, **When** seleciona "100" no seletor, **Then** a tabela mostra 100 contatos e número total de páginas é recalculado.
2. **Given** usuário está na página 5 com 50 itens/página, **When** muda para 100 itens/página, **Then** volta para página 1 para evitar índice inválido.
3. **Given** seletor de itens por página, **When** renderizado, **Then** oferece opções: 25, 50, 100.

---

### User Story 3 - Filtrar contatos com paginação server-side (Priority: P2)

Como usuário do CRM, quero que os filtros de contatos funcionem em conjunto com a paginação para encontrar registros específicos em grandes bases de dados.

**Why this priority**: Filtros são essenciais para produtividade, mas precisam funcionar com paginação server-side para manter performance.

**Independent Test**: Pode ser testado aplicando um filtro (ex: estágio = "LEAD") e verificando que a paginação reflete apenas os contatos filtrados.

**Acceptance Scenarios**:

1. **Given** 10.000 contatos no banco sendo 500 LEADs, **When** usuário filtra por estágio "LEAD", **Then** paginação mostra "500 contatos" e 10 páginas (50/página).
2. **Given** filtro aplicado mostrando página 3 de 10, **When** usuário remove o filtro, **Then** paginação recalcula para todos os contatos e volta para página 1.
3. **Given** busca por nome "João" retorna 150 resultados, **When** usuário navega para página 2, **Then** vê contatos 51-100 que contêm "João".

---

### User Story 4 - Feedback visual durante carregamento (Priority: P2)

Como usuário do CRM, quero ver indicação visual quando a próxima página está carregando para saber que o sistema está respondendo.

**Why this priority**: UX importante para evitar cliques repetidos e frustração durante transições de página.

**Independent Test**: Pode ser testado navegando entre páginas e verificando que aparece indicador de carregamento sem piscar/resetar a tabela.

**Acceptance Scenarios**:

1. **Given** usuário está na página 1, **When** clica em "Próxima", **Then** indicador de carregamento aparece enquanto dados são buscados.
2. **Given** próxima página está carregando, **When** dados ainda não chegaram, **Then** dados da página atual permanecem visíveis (não mostra tela vazia).
3. **Given** carregamento completo, **When** novos dados chegam, **Then** tabela atualiza suavemente para nova página.

---

### User Story 5 - Ir para página específica (Priority: P3)

Como usuário do CRM, quero digitar um número de página e ir diretamente para ela, sem navegar sequencialmente.

**Why this priority**: Conveniência para grandes conjuntos de dados - evita cliques repetidos para chegar em páginas distantes.

**Independent Test**: Pode ser testado digitando um número de página no campo de input e verificando que a navegação ocorre corretamente.

**Acceptance Scenarios**:

1. **Given** existem 200 páginas de contatos, **When** usuário digita "150" e confirma, **Then** navega diretamente para página 150.
2. **Given** existem 200 páginas, **When** usuário digita "999", **Then** navega para última página válida (200).
3. **Given** usuário digita "0" ou valor negativo, **When** confirma, **Then** navega para página 1.

---

### Edge Cases

- O que acontece quando não há contatos? → Mensagem "Nenhum contato encontrado" sem controles de paginação.
- O que acontece com conexão lenta? → Indicador de loading visível, dados anteriores permanecem até novos chegarem.
- O que acontece se o total de contatos muda durante navegação (outro usuário deleta)? → Recalcular total de páginas; se página atual > total, ir para última página válida.
- O que acontece ao aplicar filtro que retorna 0 resultados? → Mensagem "Nenhum contato encontrado com esses filtros".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE buscar contatos do banco de forma paginada, nunca carregando todos de uma vez.
- **FR-002**: Sistema DEVE retornar o total de registros junto com cada página para calcular número de páginas.
- **FR-003**: Sistema DEVE aplicar filtros no servidor, não no cliente, para manter performance com grandes datasets.
- **FR-004**: Sistema DEVE permitir configurar tamanho da página (25, 50, 100 itens).
- **FR-005**: Sistema DEVE manter dados da página anterior visíveis durante carregamento da próxima (UX suave).
- **FR-006**: Sistema DEVE resetar para página 1 quando filtros são alterados.
- **FR-007**: Sistema DEVE desabilitar controles de navegação que não fazem sentido (anterior na primeira, próxima na última).
- **FR-008**: Sistema DEVE mostrar informação contextual: "Mostrando X-Y de Z contatos".
- **FR-009**: Sistema DEVE persistir preferência de itens por página na sessão do usuário.
- **FR-010**: Sistema DEVE suportar navegação por teclado nos controles de paginação.

### Key Entities

- **PaginationState**: Representa estado atual da paginação (pageIndex, pageSize).
- **PaginatedResponse**: Resposta do servidor contendo data[], totalCount, hasMore.
- **Contact**: Entidade existente - sem alterações necessárias na estrutura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Página de contatos carrega em menos de 2 segundos com 10.000+ contatos no banco.
- **SC-002**: Navegação entre páginas completa em menos de 1 segundo.
- **SC-003**: Usuários conseguem acessar qualquer página de contatos, não mais limitados a 1000.
- **SC-004**: Uso de memória do navegador permanece estável independente do total de contatos no banco.
- **SC-005**: 100% dos testes de integração existentes para filtros continuam passando após implementação.
- **SC-006**: Filtros e busca funcionam corretamente em conjunto com paginação.

## Assumptions

- O banco de dados Supabase suporta \`range()\` e \`count: 'exact'\` para paginação eficiente.
- A infraestrutura de TanStack Query já está configurada no projeto.
- Os filtros existentes na página de contatos serão migrados para server-side.
- O padrão de 50 itens por página é adequado para a maioria dos usuários.
- Preferências de paginação serão armazenadas na sessão, não persistidas no banco.

## Out of Scope

- Infinite scroll (será paginação tradicional com botões).
- Paginação em outras entidades (deals, activities) - foco apenas em contatos para esta feature.
- Cache de páginas visitadas (implementação futura se necessário).
- Exportação de todos os contatos paginados.
