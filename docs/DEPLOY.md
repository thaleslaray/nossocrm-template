# 🚀 Guia de Deploy - NossoCRM

Este guia vai te ajudar a fazer deploy do NossoCRM em **~5-7 minutos**.

---

## Pré-requisitos

Você vai precisar de contas (todas gratuitas):
- ✅ [GitHub](https://github.com) - para hospedar o código
- ✅ [Vercel](https://vercel.com) - para hospedar o frontend
- ✅ [Supabase](https://supabase.com) - para banco de dados e autenticação

---

## Passo 1: Deploy no Vercel (1 minuto)

1. Clique no botão abaixo:

   [![Deploy com Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thaleslaray/crmia)

2. **Login no Vercel** com sua conta GitHub

3. **Configure o repositório:**
   - Nome do repositório: `meu-crm` (ou o que preferir)
   - Deixe como **Private** (recomendado)
   - Clique em **Create**

4. **NÃO clique em Deploy ainda!**

   Vercel vai pedir variáveis de ambiente. Vamos configurar isso no próximo passo.

---

## Passo 2: Criar Projeto no Supabase (2 minutos)

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)

2. Clique em **"New Project"**

3. Preencha os dados:
   ```
   Nome: meu-crm
   Senha do Banco: SuaSenhaForte123!
   Região: South America (São Paulo)
   Plano: Free
   ```

   ⚠️ **IMPORTANTE:** Guarde essa senha! Você vai precisar dela depois.

4. Aguarde ~1-2 minutos enquanto o Supabase cria seu projeto

   ☕ Aproveite para tomar um café

5. Quando terminar, vá em **Settings** → **API**

6. Copie as seguintes informações (você vai usar no próximo passo):
   ```
   ✅ Project URL (ex: https://abcdefgh.supabase.co)
   ✅ anon public key (começa com "eyJ...")
   ✅ service_role key (aba "Service role", começa com "eyJ...")
   ```

7. Vá em **Settings** → **General** e copie:
   ```
   ✅ Reference ID (ex: abcdefgh)
   ```

8. Gere um Access Token:
   - Acesse [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
   - Clique em **"Generate new token"**
   - Nome: `GitHub Actions`
   - Copie o token (começa com "sbp_...")

   ⚠️ **IMPORTANTE:** Esse token só aparece uma vez! Copie agora.

---

## Passo 3: Configurar Variáveis no Vercel (30 segundos)

1. Volte para a aba do Vercel

2. Na seção **Environment Variables**, adicione:

   ```
   VITE_SUPABASE_URL
   Valor: https://seu-projeto.supabase.co

   VITE_SUPABASE_ANON_KEY
   Valor: eyJhbGc... (sua anon key)
   ```

3. Clique em **Deploy**

4. Aguarde ~2 minutos enquanto o Vercel faz o build

   📦 O Vercel vai instalar dependências e fazer o build do React

5. Quando terminar, você vai ver uma URL do tipo:
   ```
   https://meu-crm.vercel.app
   ```

   ⚠️ **Não acesse ainda!** O banco ainda está vazio, sem tabelas.

---

## Passo 4: Configurar GitHub Actions (30 segundos)

Agora vamos fazer as migrations rodarem automaticamente.

1. Vá no seu repositório no GitHub:
   ```
   https://github.com/SEU_USUARIO/meu-crm
   ```

2. Clique em **Settings** (do repositório)

3. No menu lateral, clique em **Secrets and variables** → **Actions**

4. Clique em **"New repository secret"** e adicione os 3 secrets:

   **Secret 1:**
   ```
   Name: SUPABASE_PROJECT_REF
   Value: abcdefgh (seu Reference ID do Supabase)
   ```

   **Secret 2:**
   ```
   Name: SUPABASE_ACCESS_TOKEN
   Value: sbp_... (seu Access Token do Supabase)
   ```

   **Secret 3:**
   ```
   Name: SUPABASE_DB_PASSWORD
   Value: SuaSenhaForte123! (senha que você criou no Passo 2)
   ```

5. Verifique se os 3 secrets estão criados

---

## Passo 5: Configurar Secrets de Segurança no Supabase (1 minuto)

Antes de rodar as migrations, configure os secrets de segurança das Edge Functions:

1. No Supabase Dashboard, vá em **Settings** → **Edge Functions**

2. Na seção **Secrets**, adicione o seguinte secret:

   **Chave de Encriptação** (protege API keys no banco)
   ```
   Name: DB_ENCRYPTION_KEY
   Value: (gere no SQL Editor: SELECT encode(gen_random_bytes(16), 'hex'))
   ```

   ⚠️ **IMPORTANTE:** Guarde esse valor em local seguro!

3. Clique em **Save** após adicionar o secret

4. Verifique que a extensão **pgcrypto** está habilitada:
   - Vá em **Database** → **Extensions**
   - Procure por `pgcrypto`
   - Se não estiver habilitada, clique para habilitar

---

## Passo 6: Rodar a GitHub Action (1-2 minutos)

1. No seu repositório, vá em **Actions** (menu superior)

2. Você vai ver o workflow **"Deploy Supabase"**

3. Clique em **"Run workflow"** → **"Run workflow"**

4. Aguarde ~1-2 minutos

5. Acompanhe o progresso:
   ```
   ✓ Checkout código
   ✓ Instala Supabase CLI
   ✓ Link com projeto
   ✓ Aplica migrations (cria 15+ tabelas)
   ✓ Aplica security-fixes.sql (auditoria + encriptação)
   ✓ Deploy Edge Functions (7 functions incluindo ai-proxy)
   ✓ Concluído!
   ```

6. Quando aparecer ✅ verde, significa que deu tudo certo!

---

## Passo 7: Criar Sua Empresa (30 segundos)

1. Acesse a URL do seu deploy:
   ```
   https://meu-crm.vercel.app
   ```

2. Você será redirecionado automaticamente para `/setup`

3. Preencha o formulário:
   ```
   Nome da Empresa: Minha Empresa LTDA
   Email do Admin: admin@minhaempresa.com
   Senha: SenhaForte123!
   Confirmar Senha: SenhaForte123!
   ```

4. Clique em **"Começar Agora"**

5. Aguarde alguns segundos...

6. **Pronto! 🎉** Você será automaticamente logado e verá o dashboard

   ⚠️ **Nota de Segurança:** O setup só pode ser executado uma vez. Após criar a primeira empresa, 
   o endpoint fica permanentemente bloqueado.

---

## 🎯 Tudo Funcionando!

Agora você tem:
- ✅ Seu próprio CRM rodando em produção
- ✅ Banco de dados PostgreSQL (Supabase)
- ✅ Autenticação configurada
- ✅ Edge Functions deployadas com segurança
- ✅ Sistema de auditoria ativo
- ✅ API keys protegidas com encriptação
- ✅ URL pública para acessar de qualquer lugar

**Próximos passos:**
- Crie contatos, deals, atividades
- Explore o sistema de IA
- Configure seu pipeline de vendas
- Convide membros da equipe

---

## ⚙️ Configuração de IA (Opcional)

Para usar as funcionalidades de IA (análise de leads, geração de emails, etc.):

1. **Configure sua API Key do Gemini:**
   - Vá em **Configurações** → **IA** no CRM
   - Cole sua API Key do Google AI Studio
   - A chave será armazenada de forma **encriptada** no banco

2. **Aceite os termos de uso:**
   - Na primeira vez que usar IA, você verá um modal de consentimento LGPD
   - Leia os termos e aceite para habilitar as funcionalidades

3. **Funcionalidades disponíveis:**
   - Análise automática de leads
   - Geração de emails e mensagens
   - Transcrição de áudios
   - Assistente de vendas com IA

⚠️ **Segurança:** Todas as chamadas de IA passam pelo backend (Edge Function `ai-proxy`), garantindo que sua API key nunca é exposta no frontend.

---

## ⚙️ Migração de API Keys (Para deploys existentes)

Se você já tem um deploy e precisa migrar API keys para o novo formato encriptado:

1. **Configure o secret de encriptação** (se ainda não fez):
   - Supabase Dashboard → Settings → Edge Functions → Secrets
   - Adicione `DB_ENCRYPTION_KEY` (gere com `openssl rand -hex 16`)

2. **Execute o script de migração:**
   - Vá em Supabase Dashboard → SQL Editor
   - Cole e execute:
   ```sql
   SET app.encryption_key = 'sua-chave-aqui';
   
   UPDATE public.user_settings
   SET ai_api_key_encrypted = pgp_sym_encrypt(
     ai_api_key::TEXT,
     current_setting('app.encryption_key'),
     'compress-algo=1, cipher-algo=aes256'
   )
   WHERE ai_api_key IS NOT NULL
     AND ai_api_key != ''
     AND (ai_api_key_encrypted IS NULL OR LENGTH(ai_api_key_encrypted) = 0);
   ```

3. **Valide a migração:**
   ```sql
   SELECT COUNT(*) as migrated FROM public.user_settings
   WHERE ai_api_key_encrypted IS NOT NULL;
   ```

4. **Limpe dados em texto plano** (após validar):
   ```sql
   UPDATE public.user_settings SET ai_api_key = NULL
   WHERE ai_api_key_encrypted IS NOT NULL;
   ```

Para mais detalhes, consulte: `supabase/migrations/migrate-api-keys.sql`

---

## ⚙️ Otimização Opcional: Auth Hook

Para melhorar a performance do sistema, você pode ativar o **Custom Access Token Hook**:

1. Acesse o Supabase Dashboard
2. Vá em **Authentication** → **Hooks**
3. Em **"Custom Access Token"**, selecione:
   ```
   Hook: custom_access_token_hook
   ```
4. Clique em **Save**

**O que isso faz?**
- Melhora a performance das queries (menos SELECTs no banco)
- Sistema funciona perfeitamente sem isso, mas fica um pouco mais rápido com

---

## ❓ Problemas Comuns

### "Failed to fetch" ao acessar a URL

**Causa:** Migrations ainda não rodaram

**Solução:**
1. Vá em GitHub → Actions
2. Verifique se o workflow "Deploy Supabase" rodou com sucesso
3. Se não rodou, clique em "Run workflow"

---

### GitHub Action falha com "Invalid credentials"

**Causa:** Secrets configurados incorretamente

**Solução:**
1. Verifique se os 3 secrets estão criados no GitHub
2. Confirme que copiou os valores corretos do Supabase
3. Delete e recrie os secrets se necessário

---

### "Invalid API Key" após fazer login

**Causa:** Env vars configuradas incorretamente no Vercel

**Solução:**
1. Vá em Vercel → Settings → Environment Variables
2. Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos
3. Se corrigiu, faça um novo deploy: Deployments → ... → Redeploy

---

## 📚 Documentação Adicional

- [Setup Local](./SETUP_GUIDE.md) - Para desenvolvimento local
- [Arquitetura](../supabase/migrations/000_schema.sql) - Schema do banco de dados

---

## 🤝 Suporte

Teve algum problema? Abra uma issue no GitHub ou entre em contato com o instrutor.
