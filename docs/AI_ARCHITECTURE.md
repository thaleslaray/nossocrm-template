# 🧠 Arquitetura de IA - REGRAS ABSOLUTAS

## ⚠️ REGRA #1: Ponto Único de Chamada

**TODA** chamada de IA no sistema **DEVE** passar pela Edge Function `ai-proxy`.

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND                             │
│                                                           │
│   import { callAIProxy } from '@/lib/supabase/ai-proxy'; │
│                                                           │
│   const result = await callAIProxy('analyzeLead', {      │
│     deal: { title, value, status },                      │
│     stageLabel: 'Proposta'                                │
│   });                                                     │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: ai-proxy                      │
│      supabase/functions/ai-proxy/index.ts                │
│                                                           │
│   - Valida autenticação (JWT)                            │
│   - Aplica rate limiting                                  │
│   - Busca API key do usuário ou usa fallback do sistema  │
│   - Chama AI SDK Vercel com schemas Zod                  │
│   - Retorna resposta estruturada                         │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 AI SDK da Vercel v6                       │
│                                                           │
│   import { generateObject, generateText } from 'ai';     │
│   import { google } from '@ai-sdk/google';               │
│                                                           │
│   await generateObject({                                  │
│     model: google('gemini-2.0-flash'),                   │
│     schema: z.object({ ... }),                           │
│     prompt: '...'                                         │
│   });                                                     │
└──────────────────────────────────────────────────────────┘
```

## ❌ O Que NUNCA Fazer

```typescript
// ❌ NUNCA importar SDKs de IA diretamente em componentes/hooks
import { GoogleGenerativeAI } from '@google/generative-ai'; // PROIBIDO

// ❌ NUNCA criar instâncias de modelo no frontend
const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // PROIBIDO

// ❌ NUNCA expor API keys no frontend
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_KEY); // PROIBIDO
```

## ✅ O Que SEMPRE Fazer

```typescript
// ✅ SEMPRE usar o proxy de IA
import { callAIProxy } from '@/lib/supabase/ai-proxy';

const analysis = await callAIProxy<{ suggestion: string; probabilityScore: number }>(
  'analyzeLead',
  { deal, stageLabel }
);
```

## 📦 Versões do AI SDK

| Pacote | Versão |
|--------|--------|
| `ai` | `^6.0.0-beta.138` |
| `@ai-sdk/google` | `^3.0.0-beta.67` |
| `@ai-sdk/anthropic` | `^3.0.0-beta.77` |
| `@ai-sdk/openai` | `^3.0.0-beta.88` |

## 📋 Ações Disponíveis

| Action | Descrição | Schema de Retorno |
|--------|-----------|-------------------|
| `analyzeLead` | Analisa deal e sugere próxima ação | `{ suggestion, probabilityScore }` |
| `generateEmailDraft` | Gera rascunho de email | `string` |
| `generateRescueMessage` | Mensagem para reativar deal | `string` |
| `generateBoardStructure` | Cria estrutura de board Kanban | `BoardStructureSchema` |
| `generateBoardStrategy` | Define metas e KPIs do board | `BoardStrategySchema` |
| `refineBoardWithAI` | Ajusta board via chat | `{ message, board }` |
| `generateObjectionResponse` | Respostas para objeções | `string[]` |
| `parseNaturalLanguageAction` | Parse de comando NL | `ParsedActionSchema` |
| `chatWithCRM` | Chat com contexto do CRM | `string` |
| `generateBirthdayMessage` | Mensagem de aniversário | `string` |
| `generateDailyBriefing` | Briefing diário | `string` |
| `chatWithBoardAgent` | Chat com agente do board | `string` |

## 🔐 Segurança

1. **API Keys**: Armazenadas no Supabase, nunca no frontend
2. **Rate Limiting**: 60 req/min, 1000 req/dia por usuário
3. **Autenticação**: Todas as chamadas requerem JWT válido
4. **LGPD**: Consentimento implícito via configuração de API key

## 🚀 Deploy

```bash
# Deploy da Edge Function
supabase functions deploy ai-proxy

# Variáveis de ambiente necessárias no Supabase:
# - GEMINI_API_KEY (fallback quando usuário não configura)
# - DB_ENCRYPTION_KEY (para criptografia de keys - futuro)
```
