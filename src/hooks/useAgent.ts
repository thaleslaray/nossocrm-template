/**
 * @fileoverview Hook de Agente de IA com Streaming
 * 
 * Hook que gerencia conversação com múltiplos provedores de IA (Google, OpenAI, Anthropic)
 * usando streaming de texto para respostas em tempo real.
 * 
 * @module hooks/useAgent
 * 
 * Funcionalidades:
 * - Streaming de texto em tempo real
 * - Suporte a anexos (imagens, áudios, arquivos)
 * - Persistência de histórico em localStorage
 * - Configurações avançadas (thinking mode, web search)
 * - Cache de contexto para Anthropic
 * 
 * @example
 * ```tsx
 * const {
 *   messages,
 *   input,
 *   setInput,
 *   handleSubmit,
 *   isLoading
 * } = useAgent({
 *   id: 'deal-123',
 *   system: 'Você é um assistente de vendas.',
 *   onFinish: (msg) => console.log('Resposta:', msg.content)
 * });
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { streamText, CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { getModel } from '@/services/ai/config';
import { useCRM } from '@/context/CRMContext';

/**
 * Anexo em mensagem do chat
 * 
 * @interface Attachment
 * @property {string} id - Identificador único do anexo
 * @property {'image' | 'file' | 'audio'} type - Tipo do anexo
 * @property {string} url - URL ou Data URL do arquivo
 * @property {string} [name] - Nome original do arquivo
 * @property {string} [mimeType] - Tipo MIME do arquivo
 */
export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name?: string;
  mimeType?: string;
}

/**
 * Mensagem na conversa com a IA
 * 
 * @interface Message
 * @property {string} id - UUID da mensagem
 * @property {'user' | 'assistant' | 'system'} role - Papel do autor
 * @property {string} content - Conteúdo textual da mensagem
 * @property {Attachment[]} [attachments] - Anexos opcionais
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

/**
 * Opções de configuração do hook useAgent
 * 
 * @interface UseAgentOptions
 * @property {Message[]} [initialMessages] - Mensagens iniciais da conversa
 * @property {string} [system] - System prompt para contexto
 * @property {(message: Message) => void} [onFinish] - Callback ao completar resposta
 * @property {string} [id] - Chave de persistência no localStorage
 */
interface UseAgentOptions {
  initialMessages?: Message[];
  system?: string;
  onFinish?: (message: Message) => void;
  id?: string;
}

/**
 * Hook para gerenciar conversação com IA usando streaming
 * 
 * Fornece uma interface completa para chat com IA incluindo:
 * - Gerenciamento de mensagens com otimistic updates
 * - Streaming de respostas em tempo real
 * - Suporte a múltiplos provedores (Google Gemini, OpenAI, Anthropic)
 * - Processamento de anexos (imagens, áudio)
 * - Persistência automática do histórico
 * 
 * @param {UseAgentOptions} options - Configurações do agente
 * @returns {Object} Estado e controles da conversação
 * @returns {Message[]} return.messages - Histórico de mensagens
 * @returns {string} return.input - Valor atual do input
 * @returns {(value: string) => void} return.setInput - Setter do input
 * @returns {(content: string, attachments?: Attachment[]) => Promise<void>} return.append - Envia mensagem
 * @returns {() => Promise<void>} return.handleSubmit - Submete input atual
 * @returns {boolean} return.isLoading - Se está aguardando resposta
 * @returns {Error | null} return.error - Erro se houver
 * @returns {(messages: Message[]) => void} return.setMessages - Reset manual do histórico
 * 
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const agent = useAgent({ id: 'my-chat', system: 'Seja conciso.' });
 *   
 *   return (
 *     <form onSubmit={agent.handleSubmit}>
 *       {agent.messages.map(m => <Message key={m.id} {...m} />)}
 *       <input value={agent.input} onChange={e => agent.setInput(e.target.value)} />
 *       <button disabled={agent.isLoading}>Enviar</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useAgent({ initialMessages = [], system, onFinish, id }: UseAgentOptions = {}) {
  const { aiProvider, aiApiKey, aiModel, aiThinking, aiSearch, aiAnthropicCaching } = useCRM();

  // Load from localStorage if id is provided
  const [messages, setMessages] = useState<Message[]>(() => {
    if (id) {
      const saved = localStorage.getItem(`chat_history_${id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse chat history', e);
        }
      }
    }
    return initialMessages;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (id && messages.length > 0) {
      localStorage.setItem(`chat_history_${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  const append = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      if (!aiApiKey) {
        setError(new Error('API Key não configurada. Vá em Configurações > IA.'));
        return;
      }

      setIsLoading(true);
      setError(null);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        attachments,
      };

      // Optimistically add user message
      setMessages(prev => [...prev, userMsg]);
      setInput('');

      try {
        // Convert internal messages to SDK CoreMessage format
        let history: CoreMessage[] = await Promise.all(
          messages.map(async m => {
            interface TextPart {
              type: 'text';
              text: string;
            }

            interface ImagePart {
              type: 'image';
              image: string;
            }

            interface FilePart {
              type: 'file';
              data: string;
              mimeType: string;
            }

            type ContentPart = TextPart | ImagePart | FilePart;

            const parts: ContentPart[] = [{ type: 'text', text: m.content }];

            if (m.attachments?.length) {
              for (const att of m.attachments) {
                if (att.type === 'image') {
                  // Convert Data URL to base64 if needed, or pass as is if SDK supports it
                  // Vercel AI SDK expects base64 or URL. Data URL works.
                  parts.push({ type: 'image', image: att.url });
                } else if (att.type === 'audio') {
                  // Only send audio if there is NO text content (fallback)
                  // If we have text (transcription), we prefer it for reliability and speed
                  if (!m.content.trim()) {
                    try {
                      let base64 = '';
                      if (att.url.startsWith('data:')) {
                        base64 = att.url.split(',')[1];
                      } else {
                        const response = await fetch(att.url);
                        const blob = await response.blob();
                        const buffer = await blob.arrayBuffer();
                        // More efficient buffer to base64 conversion
                        const bytes = new Uint8Array(buffer);
                        let binary = '';
                        const len = bytes.byteLength;
                        for (let i = 0; i < len; i++) {
                          binary += String.fromCharCode(bytes[i]);
                        }
                        base64 = btoa(binary);
                      }

                      parts.push({
                        type: 'file',
                        data: base64,
                        mimeType: att.mimeType || 'audio/webm',
                      });
                    } catch (e) {
                      console.error('Failed to process audio attachment', e);
                    }
                  }
                }
              }
            }

            return {
              role: m.role as 'user' | 'assistant' | 'system',
              content: parts.length > 1 ? parts : m.content,
            } as CoreMessage;
          })
        );

        interface TextPart {
          type: 'text';
          text: string;
        }

        interface ImagePart {
          type: 'image';
          image: string;
        }

        interface FilePart {
          type: 'file';
          data: string;
          mediaType: string;
        }

        type ContentPart = TextPart | ImagePart | FilePart;

        // Add the new message to history
        const newParts: ContentPart[] = [{ type: 'text', text: content }];
        if (attachments.length) {
          for (const att of attachments) {
            if (att.type === 'image') {
              newParts.push({ type: 'image', image: att.url });
            } else if (att.type === 'audio') {
              // Only send audio if there is NO text content
              if (!content.trim()) {
                try {
                  let base64 = '';
                  if (att.url.startsWith('data:')) {
                    base64 = att.url.split(',')[1];
                  } else {
                    const response = await fetch(att.url);
                    const blob = await response.blob();
                    const buffer = await blob.arrayBuffer();
                    const bytes = new Uint8Array(buffer);
                    let binary = '';
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                      binary += String.fromCharCode(bytes[i]);
                    }
                    base64 = btoa(binary);
                  }

                  newParts.push({
                    type: 'file',
                    data: base64,
                    mediaType: att.mimeType || 'audio/webm',
                  });
                } catch (e) {
                  console.error('Failed to process audio attachment', e);
                }
              }
            }
          }
        }

        const newUserMessage: CoreMessage = {
          role: 'user',
          content: newParts.length > 1 ? newParts : content,
        };

        history.push(newUserMessage);

        // Handle System Prompt Caching for Anthropic
        let systemPrompt = system;
        if (aiProvider === 'anthropic' && aiAnthropicCaching && system) {
          // If caching is enabled, we move system prompt to messages array with cacheControl
          history = [
            {
              role: 'system',
              content: system,
              providerOptions: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            } as CoreMessage,
            ...history,
          ];
          systemPrompt = undefined; // Clear top-level system to avoid duplication
        }

        const model = getModel(aiProvider, aiApiKey, aiModel);

        let providerOptions = {};
        if (aiProvider === 'google' && aiThinking) {
          if (aiModel.includes('gemini-3')) {
            providerOptions = {
              google: {
                thinkingConfig: {
                  thinkingLevel: 'high',
                  includeThoughts: true,
                },
              },
            };
          } else {
            providerOptions = {
              google: {
                thinkingConfig: {
                  thinkingBudget: 8192,
                  includeThoughts: true,
                },
              },
            };
          }
        }

        let tools: Record<string, unknown> | undefined = undefined;
        if (aiSearch) {
          if (aiProvider === 'google') {
            tools = { google_search: google.tools.googleSearch({}) };
          } else if (aiProvider === 'anthropic') {
            tools = { web_search: anthropic.tools.webSearch_20250305({}) };
          }
        }




        const result = await streamText({
          model,
          system: systemPrompt,
          messages: history,
          providerOptions: providerOptions as Parameters<typeof streamText>[0]['providerOptions'],
          tools: tools as Parameters<typeof streamText>[0]['tools'],
        });

        // Create a placeholder for the assistant's response
        const assistantMsgId = crypto.randomUUID();
        let fullResponse = '';

        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

        // Iterate over the stream
        for await (const textPart of result.textStream) {
          fullResponse += textPart;
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: fullResponse } : m))
          );
        }

        if (onFinish) {
          onFinish({ id: assistantMsgId, role: 'assistant', content: fullResponse });
        }
      } catch (err) {
        console.error('AI Agent Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

        // Log full error details
        if (err && typeof err === 'object') {
          console.error('Full error details:', JSON.stringify(err, null, 2));
        }

        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          // If the last message is an empty assistant message (placeholder), update it
          if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
            return prev.map(m =>
              m.id === lastMsg.id
                ? { ...m, content: `Erro: ${errorMessage}. Verifique o console.` }
                : m
            );
          }
          // Otherwise append new error message
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Erro: ${errorMessage}. Verifique o console.`,
            },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      system,
      onFinish,
      aiProvider,
      aiApiKey,
      aiModel,
      aiThinking,
      aiSearch,
      aiAnthropicCaching,
    ]
  );

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;
    await append(input);
  }, [input, append]);

  return {
    messages,
    input,
    setInput,
    append,
    handleSubmit,
    isLoading,
    error,
    setMessages, // Allow manual reset if needed
  };
}
