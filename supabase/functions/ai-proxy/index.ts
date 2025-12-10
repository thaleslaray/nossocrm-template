/**
 * AI Proxy Edge Function - Unified AI SDK Version
 * 
 * ARCHITECTURE: ALL AI calls in the system MUST go through this Edge Function.
 * This ensures:
 * - Single source of truth for AI configuration
 * - API keys never exposed to frontend
 * - Consistent rate limiting and error handling
 * - LGPD compliance (implicit consent via API key config)
 * 
 * Uses: Vercel AI SDK v6 beta with structured outputs via Zod schemas
 */

import { generateObject, generateText } from "npm:ai@6.0.0-beta.138";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@3.0.0-beta.67";
import { createOpenAI } from "npm:@ai-sdk/openai@3.0.0-beta.88";
import { createAnthropic } from "npm:@ai-sdk/anthropic@3.0.0-beta.77";
import { z } from "npm:zod@3.24.2";
import { corsPreflightResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Rate limit configuration
const RATE_LIMIT_PER_MINUTE = 60;
const RATE_LIMIT_PER_DAY = 1000;

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { minute: number; day: number; minuteReset: number; dayReset: number }>();

// Supported AI actions
type AIAction =
  | 'analyzeLead'
  | 'generateEmailDraft'
  | 'generateObjectionResponse'
  | 'processAudioNote'
  | 'generateDailyBriefing'
  | 'generateRescueMessage'
  | 'parseNaturalLanguageAction'
  | 'chatWithCRM'
  | 'generateBirthdayMessage'
  | 'generateBoardStructure'
  | 'generateBoardStrategy'
  | 'refineBoardWithAI'
  | 'chatWithBoardAgent'
  | 'generateSalesScript';

interface AIProxyRequest {
  action: AIAction;
  data: Record<string, unknown>;
}

// ============================================================================
// ZOD SCHEMAS - Define expected response structures
// ============================================================================

const AnalyzeLeadSchema = z.object({
  action: z.string().max(50).describe('Ação curta e direta, máximo 50 caracteres. Ex: Agendar reunião de follow-up'),
  reason: z.string().max(80).describe('Razão breve, máximo 80 caracteres. Ex: Cliente ativo há 3 dias sem contato'),
  actionType: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK', 'WHATSAPP']).describe('Tipo de ação sugerida'),
  urgency: z.enum(['low', 'medium', 'high']).describe('Urgência da ação'),
  probabilityScore: z.number().min(0).max(100).describe('Score de probabilidade de fechamento (0-100)'),
});

const BoardStructureSchema = z.object({
  boardName: z.string().describe('Nome do board em português'),
  description: z.string().describe('Descrição do propósito do board'),
  stages: z.array(z.object({
    name: z.string(),
    description: z.string(),
    color: z.string().describe('Classe Tailwind CSS, ex: bg-blue-500'),
    linkedLifecycleStage: z.string().describe('ID do lifecycle stage: LEAD, MQL, PROSPECT, CUSTOMER ou OTHER'),
    estimatedDuration: z.string().optional(),
  })),
  automationSuggestions: z.array(z.string()),
});

const BoardStrategySchema = z.object({
  goal: z.object({
    description: z.string(),
    kpi: z.string(),
    targetValue: z.string(),
  }),
  agentPersona: z.object({
    name: z.string(),
    role: z.string(),
    behavior: z.string(),
  }),
  entryTrigger: z.string(),
});

const RefineBoardSchema = z.object({
  message: z.string().describe('Resposta conversacional explicando mudanças'),
  board: BoardStructureSchema.nullable().describe('Board modificado ou null se apenas pergunta'),
});

const ObjectionResponseSchema = z.array(z.string()).describe('3 respostas diferentes para contornar objeção');

const ParsedActionSchema = z.object({
  title: z.string(),
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']),
  date: z.string().optional(),
  contactName: z.string().optional(),
  companyName: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const minuteWindow = 60 * 1000;
  const dayWindow = 24 * 60 * 60 * 1000;

  let userLimits = rateLimitStore.get(userId);

  if (!userLimits) {
    userLimits = {
      minute: 0,
      day: 0,
      minuteReset: now + minuteWindow,
      dayReset: now + dayWindow,
    };
    rateLimitStore.set(userId, userLimits);
  }

  if (now > userLimits.minuteReset) {
    userLimits.minute = 0;
    userLimits.minuteReset = now + minuteWindow;
  }

  if (now > userLimits.dayReset) {
    userLimits.day = 0;
    userLimits.dayReset = now + dayWindow;
  }

  if (userLimits.minute >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, retryAfter: Math.ceil((userLimits.minuteReset - now) / 1000) };
  }

  if (userLimits.day >= RATE_LIMIT_PER_DAY) {
    return { allowed: false, retryAfter: Math.ceil((userLimits.dayReset - now) / 1000) };
  }

  userLimits.minute++;
  userLimits.day++;

  return { allowed: true };
}

// ============================================================================
// USER SETTINGS & MODEL MANAGEMENT
// ============================================================================

interface UserAISettings {
  apiKey: string | null;
  provider: 'google' | 'openai' | 'anthropic';
  model: string;
}

async function getUserAISettings(userId: string): Promise<UserAISettings> {
  const { data: settings, error } = await supabaseAdmin
    .from('user_settings')
    .select('ai_provider, ai_model, ai_google_key, ai_openai_key, ai_anthropic_key, ai_api_key')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user settings:', error.message);
    return { apiKey: null, provider: 'google', model: 'gemini-2.5-flash' };
  }

  const provider = settings?.ai_provider || 'google';

  // Get the API key for the specific provider
  let apiKey: string | null = null;
  switch (provider) {
    case 'google':
      apiKey = settings?.ai_google_key || settings?.ai_api_key || null;
      break;
    case 'openai':
      apiKey = settings?.ai_openai_key || null;
      break;
    case 'anthropic':
      apiKey = settings?.ai_anthropic_key || null;
      break;
  }

  return {
    apiKey,
    provider: provider as UserAISettings['provider'],
    model: settings?.ai_model || 'gemini-2.5-flash',
  };
}

function createModel(apiKey: string, provider: string, modelId: string) {
  switch (provider) {
    case 'google':
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    case 'openai':
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    case 'anthropic':
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    default:
      // Fallback to Google as default
      const defaultGoogle = createGoogleGenerativeAI({ apiKey });
      return defaultGoogle(modelId);
  }
}

// ============================================================================
// AI ACTION HANDLERS - Using generateObject for structured outputs
// ============================================================================

async function analyzeLead(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { deal, stageLabel } = data as { deal: any; stageLabel?: string };

  const result = await generateObject({
    model,
    schema: AnalyzeLeadSchema,
    prompt: `Você é um coach de vendas analisando um deal de CRM. Seja DIRETO e ACIONÁVEL.

DEAL:
- Título: ${deal.title}
- Valor: R$ ${deal.value?.toLocaleString('pt-BR') || 0}
- Estágio: ${stageLabel || deal.status}
- Probabilidade: ${deal.probability || 50}%

RETORNE:
1. action: Verbo no infinitivo + complemento curto (máx 50 chars). Ex: "Agendar reunião de alinhamento"
2. reason: Por que fazer isso AGORA (máx 80 chars). Ex: "Deal parado há 5 dias no estágio atual"
3. actionType: CALL, MEETING, EMAIL, TASK ou WHATSAPP
4. urgency: low (pode esperar), medium (fazer hoje), high (fazer agora)
5. probabilityScore: 0-100 baseado nos dados

Seja conciso. Português do Brasil.`,
  });

  return result.object;
}

async function generateEmailDraft(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { deal, stageLabel } = data as { deal: any; stageLabel?: string };

  const result = await generateText({
    model,
    prompt: `Gere um rascunho de email profissional para:
- Contato: ${deal.contactName || 'Cliente'}
- Empresa: ${deal.companyName || 'Empresa'}
- Deal: ${deal.title}
- Valor: R$ ${deal.value?.toLocaleString('pt-BR') || 0}
- Estágio: ${stageLabel || deal.status}

Escreva um email conciso e eficaz em português do Brasil.
Adapte o tom ao estágio do deal.`,
  });

  return result.text;
}

async function generateRescueMessage(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { deal, channel, stageLabel } = data as { deal: any; channel: string; stageLabel?: string };

  const result = await generateText({
    model,
    prompt: `Gere uma mensagem de resgate/follow-up para reativar um deal parado.

DEAL:
- Contato: ${deal.contactName || 'Cliente'}
- Empresa: ${deal.companyName || ''}
- Título: ${deal.title}
- Último estágio: ${stageLabel || deal.status}

CANAL: ${channel}

${channel === 'WHATSAPP' ? 'Escreva uma mensagem curta, informal e amigável.' :
        channel === 'EMAIL' ? 'Escreva um email mais formal e estruturado.' :
          'Prepare um roteiro para ligação telefônica.'}

Use emojis com moderação se apropriado ao canal.
Responda em português do Brasil.`,
  });

  return result.text;
}

async function generateBoardStructure(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { description, lifecycleStages } = data as { description: string; lifecycleStages?: any[] };

  const lifecycleList = Array.isArray(lifecycleStages) && lifecycleStages.length > 0
    ? lifecycleStages.map((s: any) => ({ id: s.id || '', name: s.name || s }))
    : [
      { id: 'LEAD', name: 'Lead' },
      { id: 'MQL', name: 'MQL' },
      { id: 'PROSPECT', name: 'Oportunidade' },
      { id: 'CUSTOMER', name: 'Cliente' },
      { id: 'OTHER', name: 'Outros / Perdidos' }
    ];

  const result = await generateObject({
    model,
    schema: BoardStructureSchema,
    prompt: `Você é um especialista em processos. Crie uma estrutura de board Kanban.

DESCRIÇÃO DO PROCESSO: ${description}

LIFECYCLE STAGES DISPONÍVEIS (use o ID no campo linkedLifecycleStage):
${lifecycleList.map(s => `- ID: "${s.id}" = ${s.name}`).join('\n')}

REGRAS DE VINCULAÇÃO:
- LEAD: Estágios iniciais (entrada, triagem, primeiro contato)
- MQL: Estágios de aquecimento/preparação
- PROSPECT: Estágios de trabalho ativo (negociação, execução)
- CUSTOMER: Estágios de conclusão positiva
- OTHER: Estágios de saída negativa

Crie 4-7 estágios com cores Tailwind (bg-blue-500, bg-green-500, etc).
Responda em português do Brasil.`,
  });

  return result.object;
}

async function generateBoardStrategy(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { boardData } = data as { boardData: { boardName: string; description: string; stages: any[] } };

  const result = await generateObject({
    model,
    schema: BoardStrategySchema,
    prompt: `Defina uma estratégia completa para este pipeline:

- Nome: ${boardData.boardName}
- Descrição: ${boardData.description}
- Estágios: ${boardData.stages?.map((s: any) => s.name).join(', ')}

Defina meta, KPI, persona do responsável e critério de entrada.
Seja específico e prático. Responda em português do Brasil.`,
  });

  return result.object;
}

async function refineBoardWithAI(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { currentBoard, userInstruction, chatHistory } = data as {
    currentBoard: any;
    userInstruction: string;
    chatHistory?: { role: string; content: string }[];
  };

  const historyContext = chatHistory && chatHistory.length > 0
    ? `\n\nHistórico:\n${chatHistory.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n')}`
    : '';

  const result = await generateObject({
    model,
    schema: RefineBoardSchema,
    prompt: `Você é um especialista em processos ajustando um board.

Board atual:
- Nome: ${currentBoard.boardName || currentBoard.name}
- Descrição: ${currentBoard.description}
- Estágios: ${currentBoard.stages?.map((s: any) => s.name).join(', ')}${historyContext}

Instrução do usuário: "${userInstruction}"

Se for pergunta/sugestão, responda na message e retorne board: null.
Se for mudança específica, retorne o board modificado completo.
Responda em português do Brasil.`,
  });

  return result.object;
}

async function generateObjectionResponse(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { deal, objection } = data as { deal: { title: string; value: number }; objection: string };

  const result = await generateObject({
    model,
    schema: ObjectionResponseSchema,
    prompt: `Um cliente apresentou uma objeção em uma negociação.

Negócio: ${deal.title} (R$ ${deal.value})
Objeção: "${objection}"

Gere 3 respostas diferentes:
1. Resposta empática e consultiva
2. Resposta focada em valor/ROI
3. Resposta com pergunta de descoberta

Respostas práticas e naturais em português do Brasil.`,
  });

  return result.object;
}

async function parseNaturalLanguageAction(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { text } = data as { text: string };

  const result = await generateObject({
    model,
    schema: ParsedActionSchema,
    prompt: `Parse este comando em linguagem natural para uma ação do CRM:
"${text}"

Identifique tipo (CALL, MEETING, EMAIL, TASK), título, data (se mencionada), contato e empresa.
Defina confidence entre 0-1 baseado na clareza do comando.`,
  });

  return result.object;
}

async function chatWithCRM(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { message, context } = data as { message: string; context: any };

  const result = await generateText({
    model,
    prompt: `Você é um assistente de CRM. Ajude o usuário com vendas e gestão de clientes.

Contexto: ${JSON.stringify(context)}

Usuário: ${message}

Responda de forma útil e prática em português do Brasil.`,
  });

  return result.text;
}

async function generateBirthdayMessage(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { contactName, age } = data as { contactName: string; age?: number };

  const result = await generateText({
    model,
    prompt: `Gere uma mensagem de aniversário para ${contactName}${age ? ` que está fazendo ${age} anos` : ''}.

Seja caloroso e profissional. Use emojis com moderação.
Responda em português do Brasil.`,
  });

  return result.text;
}

async function generateDailyBriefing(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { data: briefingData } = data as { data: any };

  const result = await generateText({
    model,
    prompt: `Gere um briefing diário motivacional e prático.

Dados:
- Aniversariantes: ${briefingData.birthdays?.map((b: any) => b.name).join(', ') || 'Nenhum'}
- Deals parados: ${briefingData.stalledDeals || 0}
- Atividades atrasadas: ${briefingData.overdueActivities || 0}
- Oportunidades de upsell: ${briefingData.upsellDeals || 0}

Escreva 2-3 parágrafos: cumprimento, prioridades do dia, frase motivacional.
Responda em português do Brasil.`,
  });

  return result.text;
}

async function chatWithBoardAgent(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { message, boardContext } = data as { message: string; boardContext: any };

  const dealsInfo = boardContext.dealsSummary?.length > 0
    ? `\n\nNegócios ativos:\n${boardContext.dealsSummary.map((d: any) => `- ${d.title}: R$ ${d.value} (${d.status})`).join('\n')}`
    : '\n\nNenhum negócio ativo.';

  const result = await generateText({
    model,
    prompt: `Você é ${boardContext.agentName}, ${boardContext.agentRole}.
Comportamento: ${boardContext.agentBehavior}

Meta: ${boardContext.goalDescription}
KPI: ${boardContext.goalKPI}
Alvo: ${boardContext.goalTarget}
Atual: ${boardContext.goalCurrent}

Critério de entrada: ${boardContext.entryTrigger}${dealsInfo}

Usuário: "${message}"

Responda de forma útil e prática em português do Brasil.`,
  });

  return result.text;
}

async function generateSalesScript(model: ReturnType<typeof createModel>, data: Record<string, unknown>) {
  const { deal, stageLabel, scriptType, context } = data as {
    deal: any;
    stageLabel?: string;
    scriptType: 'followup' | 'objection' | 'closing' | 'intro' | 'rescue' | 'other';
    context?: string;
  };

  const scriptTypePrompts: Record<string, string> = {
    followup: 'uma mensagem de follow-up para manter o lead engajado',
    objection: 'uma resposta para objeções comuns do cliente',
    closing: 'uma mensagem de fechamento para conduzir à decisão',
    intro: 'uma primeira abordagem para apresentar a solução',
    rescue: 'uma mensagem de resgate para reativar um lead parado',
    other: 'uma mensagem apropriada para o contexto atual',
  };

  const result = await generateText({
    model,
    prompt: `Você é um especialista em vendas consultivas. Gere ${scriptTypePrompts[scriptType] || scriptTypePrompts.other}.

CONTEXTO DO DEAL:
- Contato: ${deal.contactName || 'Cliente'}
- Empresa: ${deal.companyName || 'Empresa'}
- Título: ${deal.title || 'Negócio'}
- Valor: R$ ${deal.value?.toLocaleString('pt-BR') || 0}
- Estágio atual: ${stageLabel || deal.status || 'Em andamento'}
${context ? `\nCONTEXTO ADICIONAL: ${context}` : ''}

REGRAS:
- Use o primeiro nome do contato (${(deal.contactName || 'Cliente').split(' ')[0]})
- Seja natural e conversacional
- Máximo 4 parágrafos
- Use emojis com moderação (máximo 2)
- Adapte o tom ao estágio do funil
- Foco em gerar valor, não em ser insistente

Responda APENAS com o texto da mensagem, sem explicações ou formatação extra.`,
  });

  return {
    script: result.text,
    scriptType,
    generatedFor: deal.title,
  };
}

// ============================================================================
// REQUEST ROUTER
// ============================================================================

async function processAIRequest(
  apiKey: string,
  provider: string,
  modelId: string,
  action: AIAction,
  data: Record<string, unknown>
): Promise<unknown> {
  const model = createModel(apiKey, provider, modelId);

  switch (action) {
    case 'analyzeLead':
      return await analyzeLead(model, data);
    case 'generateEmailDraft':
      return await generateEmailDraft(model, data);
    case 'generateRescueMessage':
      return await generateRescueMessage(model, data);
    case 'generateBoardStructure':
      return await generateBoardStructure(model, data);
    case 'generateBoardStrategy':
      return await generateBoardStrategy(model, data);
    case 'refineBoardWithAI':
      return await refineBoardWithAI(model, data);
    case 'generateObjectionResponse':
      return await generateObjectionResponse(model, data);
    case 'parseNaturalLanguageAction':
      return await parseNaturalLanguageAction(model, data);
    case 'chatWithCRM':
      return await chatWithCRM(model, data);
    case 'generateBirthdayMessage':
      return await generateBirthdayMessage(model, data);
    case 'generateDailyBriefing':
      return await generateDailyBriefing(model, data);
    case 'chatWithBoardAgent':
      return await chatWithBoardAgent(model, data);
    case 'generateSalesScript':
      return await generateSalesScript(model, data);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req);
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", req, 401);
    }

    const { user } = await requireAuth(req);

    // Parse request
    const body: AIProxyRequest = await req.json();
    const { action, data } = body;

    if (!action || !data) {
      return errorResponse("Invalid request: action and data are required", req, 400);
    }

    // Check rate limits
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded", retryAfter: rateCheck.retryAfter },
        req,
        429
      );
    }

    // Get user AI settings
    const userSettings = await getUserAISettings(user.id);
    let apiKey = userSettings.apiKey;
    const provider = userSettings.provider;
    const modelId = userSettings.model;

    if (!apiKey) {
      apiKey = Deno.env.get("GEMINI_API_KEY") || null;
      if (!apiKey) {
        return errorResponse("No API key configured. Please add your API key in settings.", req, 400);
      }
    }

    // Process request with user's configured model
    const result = await processAIRequest(apiKey, provider, modelId, action, data);
    return jsonResponse({ result }, req, 200);

  } catch (error: unknown) {
    const err = error as Error;
    console.error("AI Proxy error:", err);
    return jsonResponse(
      { error: err.message || "AI processing failed", provider: "gemini" },
      req,
      500
    );
  }
});
