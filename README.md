<div align="center">

# 🚀 NossoCRM

**CRM moderno com IA integrada para times de vendas**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thaleslaray/nossocrm-template&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Cole%20as%20credenciais%20do%20Supabase%20(Connect%20%3E%20App%20Frameworks)&envLink=https://supabase.com/dashboard/project/_/settings/api)

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite)

[Demonstração](#) • [Documentação](#-deploy-em-10-minutos) • [Troubleshooting](#-problemas-comuns)

</div>

---

## 📋 Índice

- [Deploy em 10 Minutos](#-deploy-em-10-minutos)
  - [Parte 1: Supabase](#-parte-1-supabase-8-min)
  - [Parte 2: Vercel](#-parte-2-vercel-2-min)
- [Problemas Comuns](#-problemas-comuns)
- [Tech Stack](#️-tech-stack)
- [Licença](#-licença)

---

## 🚀 Deploy em 10 Minutos

> [!IMPORTANT]
> Siga **TODOS** os passos na ordem. Configure o Supabase **completamente** antes de fazer deploy na Vercel!

---

## 📦 Parte 1: Supabase (8 min)

### Passo 1️⃣ Criar Projeto no Supabase

<details>
<summary>📖 <strong>Instruções detalhadas</strong> (2 min)</summary>

<br>

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **"New Project"**
3. Preencha:
   | Campo | Valor |
   |-------|-------|
   | **Name** | `meu-crm` (ou outro nome) |
   | **Database Password** | Senha forte (guarde!) |
   | **Region** | `South America (São Paulo)` |
4. Clique em **"Create new project"**
5. ⏳ Aguarde ~2 minutos

</details>

---

### Passo 2️⃣ Executar o SQL

<details>
<summary>📖 <strong>Instruções detalhadas</strong> (2 min)</summary>

<br>

1. No menu lateral, clique em **SQL Editor**
2. Clique em **"New query"**
3. Acesse e copie TODO o conteúdo:
   
   > 📄 **[Clique aqui para ver o SQL](https://raw.githubusercontent.com/thaleslaray/nossocrm-template/main/supabase/migrations/000_schema.sql)**
   
4. Cole no SQL Editor do Supabase
5. Clique no botão **"Run"** (ou `Ctrl+Enter`)

> [!NOTE]
> A mensagem `"Success. No rows returned"` é **normal** - significa que funcionou!

</details>

---

### Passo 3️⃣ Configurar Auth Hook

> [!CAUTION]
> **Este passo é OBRIGATÓRIO!** Sem ele, o login não funciona corretamente.

<details>
<summary>📖 <strong>Instruções detalhadas</strong> (1 min)</summary>

<br>

O Auth Hook injeta o `company_id` no token JWT. É necessário para as permissões funcionarem.

1. No menu lateral, vá em **Authentication**
2. Clique na aba **Hooks**
3. Encontre **"Customize Access Token (JWT)"**
4. Clique no toggle para **habilitar**
5. Configure:
   | Campo | Valor |
   |-------|-------|
   | **Schema** | `public` |
   | **Function** | `custom_access_token_hook` |
6. Clique em **Save**

</details>

---

### Passo 4️⃣ Criar Edge Functions

Você precisa criar **5 funções**. Para cada uma:

1. No menu lateral → **Edge Functions**
2. Clique **"Create a new function"**
3. Digite o nome **exatamente** como mostrado
4. Cole o código
5. Clique **"Deploy"**

<details>
<summary>📄 <strong>Função 1:</strong> <code>setup-instance</code></summary>

<br>

> Cria a primeira empresa e usuário admin.

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

        // Aguardar trigger criar o profile
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
<summary>📄 <strong>Função 2:</strong> <code>create-user</code></summary>

<br>

> Permite que admins criem novos usuários.

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
<summary>📄 <strong>Função 3:</strong> <code>list-users</code></summary>

<br>

> Lista os usuários da empresa.

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
        id: p.id,
        email: p.email,
        role: p.role,
        company_id: p.company_id,
        created_at: p.created_at,
        status: 'active',
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
            id: authUser.id,
            email: authUser.email || '',
            role: metadata.role || 'vendedor',
            company_id: metadata.company_id,
            created_at: authUser.created_at,
            status: 'pending',
            invited_at: authUser.invited_at || authUser.created_at,
          });
        }
      }
    }

    usersWithStatus.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(
      JSON.stringify({ success: true, users: usersWithStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
```

</details>

<details>
<summary>📄 <strong>Função 4:</strong> <code>delete-user</code></summary>

<br>

> Permite que admins removam usuários.

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

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
```

</details>

<details>
<summary>📄 <strong>Função 5:</strong> <code>accept-invite</code></summary>

<br>

> Permite que usuários convidados aceitem o convite.

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

        if (!email || !password || !token) {
            throw new Error("Email, password and token are required");
        }

        const { data: invite, error: inviteError } = await adminClient
            .from("company_invites")
            .select("*")
            .eq("token", token)
            .single();

        if (inviteError || !invite) {
            return new Response(
                JSON.stringify({ error: "Convite inválido ou não encontrado" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return new Response(
                JSON.stringify({ error: "Convite expirado" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
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

        return new Response(
            JSON.stringify({
                user: authData.user,
                message: "Convite aceito com sucesso!"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
```

</details>

---

### ✅ Checklist do Supabase

Antes de continuar, verifique:

- [ ] ✔️ SQL executado com sucesso
- [ ] ✔️ Auth Hook configurado
- [ ] ✔️ 5 Edge Functions criadas e deployadas

---

## 🌐 Parte 2: Vercel (2 min)

### Passo 5️⃣ Copiar Credenciais do Supabase

<details>
<summary>📖 <strong>Instruções detalhadas</strong> (30 seg)</summary>

<br>

1. No Supabase, clique em **"Connect"** (canto superior direito)
2. Vá em **"App Frameworks"**
3. Selecione: **React** → **Vite** → **Supabase-js**
4. Na aba `.env`, copie:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> 💡 Cole num bloco de notas temporariamente.

</details>

---

### Passo 6️⃣ Deploy na Vercel

<details>
<summary>📖 <strong>Instruções detalhadas</strong> (1 min)</summary>

<br>

1. Clique no botão:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thaleslaray/nossocrm-template&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Cole%20as%20credenciais%20do%20Supabase%20(Connect%20%3E%20App%20Frameworks)&envLink=https://supabase.com/dashboard/project/_/settings/api)

2. Faça login na Vercel (pode usar GitHub)
3. Preencha as variáveis:
   | Variável | Valor |
   |----------|-------|
   | `VITE_SUPABASE_URL` | URL do Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Chave anon |
4. Clique em **Deploy**
5. ⏳ Aguarde ~1 minuto

</details>

---

### Passo 7️⃣ Acessar seu CRM

1. Clique na URL do projeto (`https://seu-projeto.vercel.app`)
2. Complete o **Setup Wizard**:
   - Nome da empresa
   - Seu email e senha de admin

<div align="center">

### 🎉 Pronto! Seu CRM está no ar!

</div>

---

## ❓ Problemas Comuns

<details>
<summary><strong>❌ "Apareceu tela de login mas não consigo criar conta"</strong></summary>

<br>

**Causa:** Você pulou os passos do Supabase.

**Solução:** Volte e execute o SQL e crie as Edge Functions.

</details>

<details>
<summary><strong>❌ "Erro ao fazer login / Página em branco"</strong></summary>

<br>

**Causa:** Variáveis de ambiente incorretas.

**Solução:** Verifique na Vercel se as variáveis estão corretas (sem espaços extras).

</details>

<details>
<summary><strong>❌ "Success. No rows returned" no SQL</strong></summary>

<br>

**Isso é NORMAL!** ✅ Significa que o SQL executou corretamente.

</details>

<details>
<summary><strong>❌ "Login funciona mas mostra 'Usuário' em vez de 'Admin'"</strong></summary>

<br>

**Causa:** Auth Hook não configurado.

**Solução:** Volte ao **Passo 3** e configure em Authentication → Hooks.

</details>

<details>
<summary><strong>❌ "Function not found" ou erro ao criar conta</strong></summary>

<br>

**Causa:** Edge Functions não criadas.

**Solução:** Volte ao **Passo 4** e crie todas as 5 funções.

</details>

<details>
<summary><strong>❌ "Error deploying function"</strong></summary>

<br>

**Causa:** Código incompleto.

**Solução:** Verifique se copiou o código completo, incluindo os imports.

</details>

---

## 🛠️ Tech Stack

<div align="center">

| Camada | Tecnologia |
|:------:|:----------:|
| **Frontend** | React 19 • TypeScript • Vite • Tailwind CSS |
| **Backend** | Supabase (PostgreSQL • Auth • Edge Functions) |
| **State** | TanStack Query • Zustand |
| **AI** | Google Gemini *(opcional)* |

</div>

---

## 📝 Licença

<div align="center">

MIT License - Use como quiser! 🚀

---

Feito com ❤️ por Thales Laray | Escola de Automação

</div>
