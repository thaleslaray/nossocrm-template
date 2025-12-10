# Contract: Journey Test Structure

**Version**: 1.0.0  
**Status**: Draft

## Overview

Define a estrutura padrão para arquivos de teste de jornada. Cada jornada é um fluxo completo do usuário.

## Convenção de Arquivos

```
src/features/<domain>/journeys/
├── <journey-name>.integration.test.tsx
└── __fixtures__/           # Fixtures específicas da feature (opcional)
```

### Nomenclatura

- Pattern: `<verbo>-<objeto>.integration.test.tsx`
- Exemplos:
  - `criar-board-ia.integration.test.tsx`
  - `gerenciar-contatos.integration.test.tsx`
  - `executar-inbox.integration.test.tsx`

## Estrutura de Arquivo

```typescript
/**
 * @file src/features/contacts/journeys/gerenciar-contatos.integration.test.tsx
 * @description Testes de integração para jornadas de gerenciamento de contatos
 * @coverage Controllers: useContactsController
 */

import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fixtures
import { 
  createContact, 
  createContacts,
  createLeadContact,
} from '@/test/fixtures/contacts';

// Mocks
import { contactsService } from '@/test/__mocks__/supabase';

// Component under test
import { ContactsPage } from '../ContactsPage';

describe('Jornada: Gerenciar Contatos', () => {
  // =========================================
  // Setup
  // =========================================
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: lista vazia
    contactsService.getAll.mockResolvedValue({ data: [], error: null });
  });

  // =========================================
  // US-XX: Visualizar Lista de Contatos
  // =========================================
  describe('visualizar lista de contatos', () => {
    it('exibe lista vazia quando não há contatos', async () => {
      render(<ContactsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/nenhum contato/i)).toBeInTheDocument();
      });
    });

    it('exibe contatos ordenados por nome', async () => {
      const contacts = [
        createContact({ name: 'Zélia' }),
        createContact({ name: 'Ana' }),
        createContact({ name: 'Maria' }),
      ];
      contactsService.getAll.mockResolvedValue({ data: contacts, error: null });
      
      render(<ContactsPage />);
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row').slice(1); // skip header
        expect(rows[0]).toHaveTextContent('Ana');
        expect(rows[1]).toHaveTextContent('Maria');
        expect(rows[2]).toHaveTextContent('Zélia');
      });
    });
  });

  // =========================================
  // US-XX: Criar Novo Contato
  // =========================================
  describe('criar novo contato', () => {
    it('abre modal ao clicar em "Novo Contato"', async () => {
      const user = userEvent.setup();
      render(<ContactsPage />);
      
      await user.click(screen.getByRole('button', { name: /novo contato/i }));
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    });

    it('cria contato com dados mínimos (nome + email)', async () => {
      const user = userEvent.setup();
      const newContact = createContact({ name: 'João', email: 'joao@test.com' });
      
      contactsService.create.mockResolvedValue({ data: newContact, error: null });
      
      render(<ContactsPage />);
      
      // Abrir modal
      await user.click(screen.getByRole('button', { name: /novo contato/i }));
      
      // Preencher form
      await user.type(screen.getByLabelText(/nome/i), 'João');
      await user.type(screen.getByLabelText(/email/i), 'joao@test.com');
      
      // Submeter
      await user.click(screen.getByRole('button', { name: /salvar/i }));
      
      // Verificar chamada
      expect(contactsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'João',
          email: 'joao@test.com',
        })
      );
      
      // Verificar UI atualizada
      await waitFor(() => {
        expect(screen.getByText('João')).toBeInTheDocument();
      });
    });

    it('exibe erro de validação para nome vazio', async () => {
      const user = userEvent.setup();
      render(<ContactsPage />);
      
      await user.click(screen.getByRole('button', { name: /novo contato/i }));
      await user.click(screen.getByRole('button', { name: /salvar/i }));
      
      expect(screen.getByText(/nome.*obrigatório/i)).toBeInTheDocument();
      expect(contactsService.create).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // US-XX: Editar Contato
  // =========================================
  describe('editar contato existente', () => {
    it('pré-popula form com dados do contato', async () => {
      const user = userEvent.setup();
      const contact = createContact({ name: 'Maria', email: 'maria@test.com' });
      contactsService.getAll.mockResolvedValue({ data: [contact], error: null });
      
      render(<ContactsPage />);
      
      // Aguardar render
      await waitFor(() => {
        expect(screen.getByText('Maria')).toBeInTheDocument();
      });
      
      // Clicar para editar
      await user.click(screen.getByText('Maria'));
      await user.click(screen.getByRole('button', { name: /editar/i }));
      
      // Verificar campos preenchidos
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Maria');
      expect(screen.getByLabelText(/email/i)).toHaveValue('maria@test.com');
    });
  });

  // =========================================
  // Error Handling
  // =========================================
  describe('tratamento de erros', () => {
    it('exibe mensagem de erro ao falhar carregamento', async () => {
      contactsService.getAll.mockResolvedValue({
        data: null,
        error: { message: 'Erro de conexão' },
      });
      
      render(<ContactsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/erro/i)).toBeInTheDocument();
      });
    });

    it('permite retry após erro', async () => {
      contactsService.getAll
        .mockResolvedValueOnce({ data: null, error: { message: 'Erro' } })
        .mockResolvedValueOnce({ data: [createContact()], error: null });
      
      const user = userEvent.setup();
      render(<ContactsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/erro/i)).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
      
      await waitFor(() => {
        expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
      });
    });
  });
});
```

## Padrões Obrigatórios

### 1. Estrutura do describe

```typescript
describe('Jornada: [Nome da Jornada]', () => {
  describe('[ação específica]', () => {
    it('[resultado esperado]', async () => {
      // Arrange
      // Act  
      // Assert
    });
  });
});
```

### 2. Nomes de Testes

- Começar com verbo no presente: "exibe", "cria", "navega", "filtra"
- Descrever comportamento, não implementação
- Incluir condição se relevante: "exibe erro quando falha conexão"

### 3. Assertions

```typescript
// ✅ Correto - testa comportamento
expect(screen.getByText('João')).toBeInTheDocument();

// ❌ Incorreto - testa implementação
expect(contactsService.getAll).toHaveBeenCalled();
```

### 4. Async/Await

```typescript
// ✅ Correto - sempre await userEvent e waitFor
const user = userEvent.setup();
await user.click(button);
await waitFor(() => expect(...));

// ❌ Incorreto - não usar .then()
user.click(button).then(() => { ... });
```

## Cobertura Esperada

Cada arquivo de jornada deve cobrir:

| Aspecto | Cobertura |
|---------|-----------|
| Happy path | 100% dos fluxos principais |
| Validações | Campos obrigatórios, formatos |
| Erros de rede | Timeout, 500, 403 |
| Estados vazios | Lista vazia, sem dados |
| Loading states | Skeleton, spinner |
| Navegação | Se houver transição de página |

## Métricas de Qualidade

- **Tempo por teste**: < 500ms
- **Flaky rate**: 0%
- **Branch coverage no controller**: > 85%
- **Isolamento**: Zero dependência entre testes
