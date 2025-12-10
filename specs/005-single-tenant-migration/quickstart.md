# Quickstart: Migração Single-Tenant

**Feature**: 005-single-tenant-migration  
**Date**: 2025-12-07

---

## Pré-requisitos

- [ ] Backup do banco de dados atual
- [ ] Acesso ao Supabase Dashboard
- [ ] Ambiente de desenvolvimento local funcionando
- [ ] Testes passando antes de começar

---

## Ordem de Execução

### Fase 1: Banco de Dados

```bash
# 1. Aplicar schema atualizado no Supabase
# Copiar conteúdo de supabase/migrations/20231201000000_schema.sql
# e executar no SQL Editor do Supabase

# 2. Verificar que políticas foram atualizadas
# No Supabase Dashboard → Database → Policies
```

### Fase 2: Código Frontend

```bash
# 1. Atualizar tipos
npm run build  # Verificar erros de TypeScript

# 2. Rodar testes
npm run test:run

# 3. Se testes falharem por mock de organizationId, atualizar mocks
```

### Fase 3: Verificação

```bash
# 1. Iniciar servidor local
npm run dev

# 2. Testar funcionalidades principais:
#    - Login
#    - Criar deal
#    - Criar contato
#    - Mover deal no kanban
#    - Editar perfil
```

---

## Checklist de Validação

### Banco de Dados

- [ ] Função `get_user_organization_id()` removida ou não usada em políticas
- [ ] Triggers `auto_organization_id` removidos das tabelas
- [ ] Políticas RLS simplificadas (sem organization_id)
- [ ] Dados existentes preservados

### Frontend

- [ ] Build completa sem erros
- [ ] `organizationId` removido de AuthContext
- [ ] Serviços Supabase não passam organization_id
- [ ] Testes passando (197+)

### Funcional

- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] CRUD de deals funciona
- [ ] CRUD de contatos funciona
- [ ] Kanban drag-and-drop funciona

---

## Rollback

Se algo der errado:

1. **Banco**: Restaurar backup do schema anterior
2. **Código**: `git checkout main` ou branch anterior
3. **Deploy**: Reverter deploy no Vercel

---

## Comandos Úteis

```bash
# Verificar status
npm run test:run

# Build de produção
npm run build

# Verificar tipos
npx tsc --noEmit

# Iniciar dev
npm run dev
```

---

## Suporte

Em caso de problemas:
1. Verificar logs do Supabase Dashboard
2. Verificar console do navegador
3. Rodar testes para identificar regressões
