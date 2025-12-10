<div align="center">

<br>

# NossoCRM

### O CRM que sua equipe vai querer usar.

<br>

[Começar agora →](#-guia-completo-de-instalação)

<br>

---

<br>

</div>

## Simples. Poderoso. Inteligente.

**Gerencie seus clientes** com um Kanban visual que sua equipe domina em minutos.

**IA que trabalha por você** — transcreve áudios, sugere próximos passos, escreve mensagens.

**Multi-tenant de verdade** — cada empresa isolada, dados seguros, escala infinita.

<br>

---

<br>

<div align="center">

## 📚 Guia Completo de Instalação

**Tempo estimado: 15-20 minutos** (mesmo se for sua primeira vez)

Este guia foi criado para **iniciantes absolutos**. Siga cada passo na ordem.

</div>

<br>

---

<br>

## Passo 1 · Criar conta no Supabase

> **O que é Supabase?** É onde seu banco de dados e autenticação vão ficar. Pense nele como o "backend" do seu CRM — ele guarda todos os dados dos seus clientes, usuários e negócios.

<br>

1. Abra uma nova aba e acesse **[supabase.com](https://supabase.com)**

2. Clique no botão verde **"Start your project"** (canto superior direito)

3. Clique em **"Continue with GitHub"** (recomendado) ou crie uma conta com email
   > 💡 Usar GitHub é mais rápido porque você vai precisar dele para a Vercel depois.

4. Se pediu para autorizar, clique em **"Authorize Supabase"**

<br>

✅ **Checkpoint:** Você deve estar vendo o Dashboard do Supabase com a opção de criar um projeto.

<br>

---

<br>

## Passo 2 · Criar um novo projeto no Supabase

<br>

1. Clique no botão **"New Project"** (verde)

2. Preencha os campos:

   | Campo | O que colocar |
   |-------|---------------|
   | **Organization** | Selecione sua organização (já vem uma padrão) |
   | **Project name** | Digite um nome, ex: `meu-crm` |
   | **Database Password** | Crie uma senha forte e **anote em algum lugar seguro** |
   | **Region** | Selecione **South America (São Paulo)** para menor latência |

3. Clique em **"Create new project"**

   <img src="docs/images/01-supabase-create-project.png" alt="Criando projeto no Supabase" width="600">

4. ⏳ **Aguarde 1-2 minutos** — o Supabase está criando seu banco de dados
   > A tela vai mostrar "Setting up project..." — é normal, não feche a aba!

<br>

✅ **Checkpoint:** Quando terminar, você verá o Dashboard do projeto com várias opções no menu lateral.

<br>

---

<br>

## Passo 3 · Executar o SQL para criar as tabelas

> **O que é SQL?** É a linguagem que cria as tabelas no banco de dados. Você vai copiar e colar um código pronto — não precisa entender ele.

<br>

1. No menu lateral esquerdo, clique em **"SQL Editor"** (ícone de código `<>`)

2. Clique no botão **"+ New query"** (canto superior direito)

3. Abra este link em uma **nova aba**: 
   
   👉 **[Clique aqui para ver o SQL](https://raw.githubusercontent.com/thaleslaray/nossocrm-template/main/supabase/migrations/schema.sql)**

4. Selecione **TODO** o texto da página (`Ctrl+A` ou `Cmd+A`) e copie (`Ctrl+C` ou `Cmd+C`)

5. Volte para o Supabase e cole no editor de SQL (onde está escrito "Write SQL here...")

6. Clique no botão **"Run"** (verde, canto inferior direito) ou pressione `Ctrl+Enter`

7. Aguarde alguns segundos...
   > ⚠️ A mensagem **"Success. No rows returned"** vai aparecer — **isso é NORMAL e significa que funcionou!**

<br>

✅ **Checkpoint:** Você deve ver a mensagem verde de sucesso. Se aparecer erro vermelho, verifique se copiou o SQL completo.

<br>

---

<br>

## Passo 4 · Criar as Edge Functions

> **O que são Edge Functions?** São pequenos programas que rodam no servidor do Supabase. Eles fazem coisas que não podem ser feitas pelo navegador, como criar usuários com poderes de administrador.

<br>

Você vai criar **6 funções**. Cada uma leva menos de 1 minuto.

<br>

#### Como criar cada função:

1. No menu lateral esquerdo, clique em **"Edge Functions"** (ícone de raio ⚡)

2. Clique no botão **"Deploy a new function"**

3. Selecione **"Via Editor"** (vamos escrever o código direto no navegador)

4. No campo **"Function name"**, digite o nome da função (veja tabela abaixo)

5. Apague todo o código de exemplo que apareceu no editor

6. Copie o código da função correspondente (seção [Edge Functions](#edge-functions) mais abaixo)

7. Cole no editor do Supabase

8. Clique em **"Deploy function"** (azul, parte inferior)

9. Aguarde 10-30 segundos até aparecer a mensagem de sucesso

<br>

#### 🔁 Repita para cada uma das 7 funções:

| # | Nome exato | O que ela faz |
|:-:|------------|---------------|
| 1 | `setup-instance` | Cria a primeira empresa e usuário admin |
| 2 | `create-user` | Permite criar novos usuários |
| 3 | `list-users` | Lista os usuários da empresa |
| 4 | `delete-user` | Remove usuários |
| 5 | `invite-users` | Envia convites por email |
| 6 | `accept-invite` | Processa aceitação de convites |
| 7 | `ai-proxy` | Proxy seguro para chamadas à API do Gemini |

> ⚠️ **IMPORTANTE:** O nome de cada função deve ser **EXATAMENTE** como está na tabela (tudo minúsculo, com hífen).

<br>

✅ **Checkpoint:** No menu Edge Functions, você deve ver 7 funções listadas com status "Active".

<br>

---

<br>

## Passo 5 · Copiar as credenciais do Supabase

> **O que são credenciais?** São as "senhas" que permitem seu aplicativo se conectar ao banco de dados. Você vai precisar de duas: a URL e a chave anônima.

<br>

1. No Supabase, clique no botão **"Connect"** (canto superior direito, ao lado do nome do projeto)

2. Uma janela vai abrir. Clique na aba **"App Frameworks"**

3. Na parte esquerda, selecione:
   - **Framework:** React
   - **Using:** Vite  
   - **Package:** supabase-js

   <img src="docs/images/02-supabase-connection.png" alt="Copiando credenciais do Supabase" width="700">

4. Na parte direita, você vai ver a aba **".env"** — clique nela se não estiver selecionada

5. Você vai ver algo assim:
   ```
   VITE_SUPABASE_URL=https://xyzabc123.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

6. **Copie essas duas linhas** e cole em um bloco de notas (Notepad, TextEdit, etc.)
   > 💡 Você vai precisar desses valores no próximo passo. Mantenha o bloco de notas aberto.

<br>

✅ **Checkpoint:** Você tem anotados a URL (começa com `https://`) e a chave (começa com `eyJ...`).

<br>

---

<br>

## Passo 6 · Deploy na Vercel

> **O que é Vercel?** É onde seu aplicativo (frontend) vai ficar hospedado na internet. Quando você acessar o CRM pelo navegador, é a Vercel que vai servir as páginas.

<br>

1. Clique no botão abaixo para iniciar o deploy:

   <a href="https://vercel.com/new/clone?repository-url=https://github.com/thaleslaray/nossocrm-template&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY">
      <img src="https://vercel.com/button" alt="Deploy na Vercel" height="40">
   </a>

2. A Vercel vai pedir para fazer login — use **"Continue with GitHub"** (o mesmo do Supabase)

3. Se pedir autorização, clique em **"Authorize Vercel"**

4. Escolha um nome para seu projeto e clique em **"Create"**

   <img src="docs/images/03-vercel-create-project.png" alt="Criando projeto na Vercel" width="600">

5. Na próxima tela, preencha as variáveis de ambiente:

   | Campo | O que colar |
   |-------|-------------|
   | **VITE_SUPABASE_URL** | A URL que você copiou (começa com `https://`) |
   | **VITE_SUPABASE_ANON_KEY** | A chave que você copiou (começa com `eyJ`) |

   > ⚠️ Cole APENAS o valor, sem espaços antes ou depois. Não inclua as aspas ou o `=`.

   <img src="docs/images/04-vercel-env-variables.png" alt="Configurando variáveis na Vercel" width="600">

6. Clique em **"Deploy"**

7. ⏳ **Aguarde 1-2 minutos** — a Vercel está construindo seu aplicativo
   > Você vai ver uma barra de progresso e logs de build. É normal aparecer muito texto.

8. Quando terminar, vai aparecer 🎉 **"Congratulations!"** com confetes na tela

9. Clique no botão **"Continue to Dashboard"** ou na prévia do site

   <img src="docs/images/05-vercel-deployed.png" alt="Deploy concluído na Vercel" width="700">

<br>

✅ **Checkpoint:** Você deve ver seu CRM rodando com a tela de Setup inicial.

<br>

---

<br>

## Passo 7 · Configurar sua empresa

<br>

1. Na tela do CRM, você verá o **Setup Wizard** (assistente de configuração)

   <img src="docs/images/06-setup-wizard.png" alt="Setup Wizard do NossoCRM" width="600">

2. Preencha:
   - **Nome da empresa:** O nome que vai aparecer no sistema
   - **Seu email:** Seu email de administrador
   - **Senha:** Uma senha forte para sua conta

3. Clique em **"Criar empresa"**

4. Você será redirecionado para o login — use o email e senha que acabou de criar

<br>

<div align="center">

### 🎉 Parabéns! Seu CRM está pronto!

Agora você pode começar a cadastrar contatos, criar negócios e convidar sua equipe.

</div>

<br>

---

<br>

## ❓ Algo deu errado?

<details>
<summary><strong>A tela do CRM está em branco</strong></summary>

<br>

**Causa mais provável:** Variáveis de ambiente incorretas na Vercel.

**Como resolver:**
1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique no seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos
5. Se precisar corrigir, corrija e clique em **Redeploy** (menu ... → Redeploy)

</details>

<details>
<summary><strong>Erro ao criar empresa / "Function not found"</strong></summary>

<br>

**Causa:** As Edge Functions não foram criadas ou têm nome errado.

**Como resolver:**
1. Volte ao Supabase → Edge Functions
2. Verifique se existem **exatamente 6 funções**
3. Verifique se os nomes estão **exatamente** como na tabela (minúsculas, com hífen)
4. Se alguma estiver errada, delete e crie novamente

</details>

<details>
<summary><strong>Erro de SQL / "Success. No rows returned"</strong></summary>

<br>

**"Success. No rows returned"** é **SUCESSO**, não erro! O SQL executou corretamente.

Se aparecer erro em **vermelho**, significa que algo deu errado. Verifique:
1. Se você copiou **TODO** o SQL (Ctrl+A antes de copiar)
2. Se não copiou nada a mais (espaços, texto da página)
3. Tente executar novamente

</details>

<details>
<summary><strong>Não consigo fazer login depois de criar a empresa</strong></summary>

<br>

**Possíveis causas:**
1. **Email/senha errados** — use exatamente o que digitou no setup
2. **Edge Functions não funcionando** — verifique se estão "Active" no Supabase
3. **Aguarde alguns segundos** — às vezes o primeiro login demora

</details>

<br>

---

<br>

## 🛠️ Quer customizar o CRM?

Se você quer apenas **usar** o CRM, não precisa fazer nada além do deploy. Mas se quiser **modificar** o código (mudar cores, adicionar funcionalidades, etc.), siga estes passos:

<br>

#### Entendendo o que aconteceu no deploy

Quando você clicou em "Deploy na Vercel", aconteceu o seguinte:

1. A Vercel criou um **fork** (cópia) do repositório na sua conta GitHub
2. Essa cópia é **sua** — você pode modificar como quiser
3. Qualquer alteração que você fizer no seu fork, a Vercel faz redeploy automático

<br>

#### Como editar o código

**Opção 1: Editar direto no GitHub (mais fácil)**

Para mudanças simples (textos, cores), você pode editar direto no navegador:

1. Acesse seu fork em `github.com/SEU_USUARIO/nossocrm-template`
2. Navegue até o arquivo que quer editar
3. Clique no ícone de lápis (Edit)
4. Faça suas alterações
5. Clique em **"Commit changes"**
6. A Vercel faz redeploy automaticamente em ~1 minuto

<br>

**Opção 2: Clonar e editar localmente (mais poder)**

Para mudanças maiores, é melhor ter o código na sua máquina:

```bash
# Clone SEU fork (não o repositório original)
git clone https://github.com/SEU_USUARIO/meucrm.git
cd meucrm

# Instale as dependências
npm install

# Crie o arquivo .env.local com suas credenciais
echo "VITE_SUPABASE_URL=sua_url_aqui" > .env.local
echo "VITE_SUPABASE_ANON_KEY=sua_chave_aqui" >> .env.local

# Rode o servidor de desenvolvimento
npm run dev
```

Agora você pode editar à vontade. Quando quiser publicar:

```bash
git add .
git commit -m "Minha alteração"
git push
```

A Vercel detecta o push e faz o redeploy automaticamente.

<br>

---

<br>

## Edge Functions

Aqui estão os códigos das Edge Functions. Copie cada um na hora de criar a função correspondente no Supabase.

<details>
<summary><strong>setup-instance</strong></summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    try {
        const { companyName, email, password } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: isInitialized, error: initError } = await supabaseAdmin
            .rpc('is_instance_initialized')

        if (initError) throw initError
        if (isInitialized) return new Response(JSON.stringify({ error: 'Instance already initialized' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert({ name: companyName })
            .select()
            .single()

        if (companyError) throw companyError

        const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                role: 'admin',
                company_id: company.id
            }
        })

        if (userError) {
            await supabaseAdmin.from('companies').delete().eq('id', company.id)
            throw userError
        }

        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                company_id: company.id,
                role: 'admin'
            })
            .eq('id', user.user.id)

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(user.user.id)
            await supabaseAdmin.from('companies').delete().eq('id', company.id)
            throw profileError
        }

        return new Response(
            JSON.stringify({ message: 'Instance setup successfully', company, user }),
            { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } })
    }
})
```

</details>

<details>
<summary><strong>create-user</strong></summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) return new Response("Unauthorized", { status: 401 })

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, company_id')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response("Forbidden: Only admins can create users", { status: 403 })
        }

        const { email, password, role } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })

        if (createError) throw createError

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: newUser.user.id,
                company_id: profile.company_id,
                email: email,
                role: role || 'vendedor'
            })

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw profileError
        }

        return new Response(
            JSON.stringify({ message: 'User created successfully', user: newUser }),
            { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } })
    }
})
```

</details>

<details>
<summary><strong>list-users</strong></summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    const usersWithStatus: any[] = [];

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    for (const p of profiles || []) {
      usersWithStatus.push({
        id: p.id, email: p.email, role: p.role,
        company_id: p.company_id, created_at: p.created_at, status: 'active',
      });
    }

    const { data: authData } = await adminClient.auth.admin.listUsers();
    
    if (authData?.users) {
      const profileIds = new Set((profiles || []).map(p => p.id));
      
      for (const authUser of authData.users) {
        if (profileIds.has(authUser.id)) continue;
        const metadata = authUser.user_metadata || {};
        if (metadata.company_id === profile.company_id) {
          usersWithStatus.push({
            id: authUser.id, email: authUser.email || '', role: metadata.role || 'vendedor',
            company_id: metadata.company_id, created_at: authUser.created_at,
            status: 'pending', invited_at: authUser.invited_at || authUser.created_at,
          });
        }
      }
    }

    usersWithStatus.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ success: true, users: usersWithStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
```

</details>

<details>
<summary><strong>delete-user</strong></summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");
    if (profile.role !== "admin") throw new Error("Only admins can delete users");

    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");
    if (userId === user.id) throw new Error("Você não pode remover a si mesmo");

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (targetProfile) {
      await adminClient.from("profiles").delete().eq("id", userId);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`Failed to delete user: ${deleteError.message}`);

    return new Response(JSON.stringify({ success: true, message: "User deleted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});
```

</details>

<details>
<summary><strong>invite-users</strong></summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");
    if (profile.role !== "admin") throw new Error("Only admins can invite users");

    const { emails, role } = await req.json();
    if (!emails || !Array.isArray(emails) || emails.length === 0) throw new Error("At least one email is required");
    if (!role || !["admin", "vendedor"].includes(role)) throw new Error("Invalid role");

    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";
    const results: any[] = [];

    for (const email of emails) {
      try {
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .eq("company_id", profile.company_id)
          .single();

        if (existingProfile) {
          results.push({ email, success: false, error: "Usuário já existe nesta empresa" });
          continue;
        }

        const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${siteUrl}/auth/callback?role=${role}&company_id=${profile.company_id}`,
          data: { role, company_id: profile.company_id, invited_by: user.id },
        });

        results.push(error ? { email, success: false, error: error.message } : { email, success: true });
      } catch (err: any) {
        results.push({ email, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `${successCount} convite(s) enviado(s)${failCount > 0 ? `, ${failCount} falha(s)` : ''}`,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
```

</details>

<details>
<summary><strong>accept-invite</strong></summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        const { email, password, token, name } = await req.json();
        if (!email || !password || !token) throw new Error("Email, password and token are required");

        const { data: invite, error: inviteError } = await adminClient
            .from("company_invites")
            .select("*")
            .eq("token", token)
            .single();

        if (inviteError || !invite) {
            return new Response(JSON.stringify({ error: "Convite inválido ou não encontrado" }), 
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: "Convite expirado" }), 
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }

        if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
            throw new Error("Este convite não é válido para este email");
        }

        const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name: name || email.split("@")[0],
                company_id: invite.company_id,
                role: invite.role,
            },
        });

        if (createError) throw createError;

        const { error: profileError } = await adminClient
            .from("profiles")
            .insert({
                id: authData.user.id,
                email: email,
                role: invite.role,
                company_id: invite.company_id,
                status: "active",
                created_at: new Date().toISOString(),
            });

        if (profileError) {
            await adminClient.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return new Response(JSON.stringify({ user: authData.user, message: "Convite aceito com sucesso!" }), 
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), 
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
});
```

</details>

<br>

---

<br>

## 🛠️ Guia de Desenvolvimento

Esta seção é para desenvolvedores que desejam contribuir ou customizar o NossoCRM.

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS (Dark Mode) |
| **Estado Servidor** | TanStack Query |
| **Estado Cliente** | Zustand |
| **Backend** | Supabase (Auth, PostgreSQL, Edge Functions, Realtime) |
| **IA** | Google Gemini / OpenAI / Anthropic |
| **Testes** | Vitest + React Testing Library + Playwright |

### Estrutura do Projeto

```
src/
├── components/        # Componentes React reutilizáveis
│   ├── ui/           # Componentes base (Button, Modal, Input)
│   └── charts/       # Componentes de gráficos
├── context/          # Providers React (Auth, CRM, Theme, Toast)
│   ├── activities/   # Contexto de atividades
│   ├── boards/       # Contexto de boards/pipelines
│   ├── contacts/     # Contexto de contatos e empresas
│   ├── deals/        # Contexto de deals
│   └── settings/     # Contexto de configurações
├── features/         # Páginas organizadas por domínio
├── hooks/            # Custom hooks
├── lib/              # Bibliotecas utilitárias
│   ├── a11y/         # Acessibilidade (FocusTrap, LiveRegion)
│   ├── query/        # TanStack Query hooks e config
│   └── supabase/     # Serviços Supabase
├── services/         # Serviços de integração (Gemini, etc)
├── stores/           # Zustand stores
├── types.ts          # Tipos TypeScript centralizados
└── utils/            # Funções utilitárias
```

### Padrão de Arquitetura

O projeto segue o padrão **Controller Hook**:

```tsx
// 1. Página (thin) - src/features/contacts/ContactsPage.tsx
export const ContactsPage: React.FC = () => {
  const controller = useContactsController();
  return <ContactsView {...controller} />;
};

// 2. Controller Hook - src/features/contacts/hooks/useContactsController.ts
export function useContactsController() {
  const { data: contacts } = useContacts();
  const createContact = useCreateContact();
  // ... lógica de negócio
  return { contacts, createContact, ... };
}

// 3. Query Hooks - src/lib/query/hooks/useContactsQuery.ts
export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts.all,
    queryFn: () => contactsService.getAll(),
  });
}
```

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# Iniciar servidor de desenvolvimento
npm run dev   # Porta 3003

# Executar testes
npm test              # Watch mode
npm run test:run      # Single run
npm run test:ui       # Interface gráfica

# Type checking
npx tsc --noEmit

# Build de produção
npm run build
```

### Supabase CLI (Projeto Linkado)

```bash
# Reset total do banco remoto
supabase db reset --linked

# Aplicar migrations pendentes
supabase db push

# Deploy de Edge Function
supabase functions deploy <nome>

# Deploy sem verificação JWT (funções públicas)
supabase functions deploy <nome> --no-verify-jwt
```

### ⚠️ Multi-Tenant: Conceitos Importantes

O sistema tem **DOIS tipos de "empresa"**:

| Conceito | Tabela | Uso |
|----------|--------|-----|
| **Organization** (Tenant) | `organizations` | Quem PAGA pelo SaaS - usado para RLS |
| **CRMCompany** (Cliente) | `crm_companies` | Empresa cadastrada no CRM - relacionamento comercial |

```typescript
// ✅ CORRETO
const deal = {
  organization_id: organizationId,      // Do useAuth() - SEGURANÇA
  client_company_id: selectedCompany,   // Do formulário - OPCIONAL
};

// ❌ ERRADO - Vai quebrar isolamento!
const deal = {
  organization_id: selectedCompany.id,  // Confundiu os dois conceitos!
};
```

### Padrões de Código

**Imports com alias:**
```typescript
import { useContacts } from '@/lib/query/hooks';
import { useAuth } from '@/context/AuthContext';
import { Contact } from '@/types';
```

**Validação de dados:**
```typescript
import { sanitizeUUID, requireUUID } from '@/lib/supabase/utils';

// Campos opcionais: sanitizeUUID (retorna null se inválido)
contact_id: sanitizeUUID(deal.contactId),

// Campos obrigatórios: requireUUID (lança erro se inválido)
board_id: requireUUID(deal.boardId, 'Board ID'),
```

**Modais acessíveis (obrigatório):**
```tsx
import { FocusTrap, useFocusReturn } from '@/lib/a11y';

function Modal({ isOpen, onClose }) {
  useFocusReturn({ enabled: isOpen });
  
  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="title">
        <h2 id="title">Título</h2>
      </div>
    </FocusTrap>
  );
}
```

### Adicionando uma Nova Feature

1. Criar estrutura em `src/features/<nome>/`
2. Criar Query hooks em `lib/query/hooks/`
3. Criar service Supabase em `lib/supabase/`
4. Criar Controller hook usando os Query hooks
5. Adicionar rota em `App.tsx`
6. Adicionar item de navegação em `components/Layout.tsx`

### Recursos Adicionais

- **Arquitetura Multi-tenant:** `docs/MULTI_TENANT_ARCHITECTURE.md`
- **Acessibilidade:** `docs/ACCESSIBILITY.md`
- **LGPD:** `docs/LGPD_COMPLIANCE.md`
- **Instruções para IA:** `.github/copilot-instructions.md`

<br>

---

<br>

<div align="center">

Feito com ❤️ para simplificar seu negócio

</div>
