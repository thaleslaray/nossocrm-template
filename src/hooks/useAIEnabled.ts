/**
 * useAIEnabled Hook - Verifica se IA está habilitada
 * 
 * SIMPLIFICADO: IA está habilitada se o usuário configurou uma API Key.
 * A ação de adicionar a key = consentimento implícito (LGPD compliant).
 * 
 * @example
 * const { isAIEnabled, goToSettings } = useAIEnabled();
 * 
 * if (!isAIEnabled) {
 *   return <NoAIMessage onConfigure={goToSettings} />;
 * }
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';

export interface UseAIEnabledResult {
  /** Se a IA está habilitada (tem API Key configurada) */
  isAIEnabled: boolean;
  /** A API Key configurada */
  apiKey: string | null;
  /** Provider configurado (google, openai, anthropic) */
  provider: 'google' | 'openai' | 'anthropic';
  /** Navega para as configurações de IA */
  goToSettings: () => void;
}

export function useAIEnabled(): UseAIEnabledResult {
  const navigate = useNavigate();
  const { aiApiKey, aiProvider } = useCRM();

  const isAIEnabled = Boolean(aiApiKey && aiApiKey.trim());

  const goToSettings = useCallback(() => {
    navigate('/settings#ai');
  }, [navigate]);

  return {
    isAIEnabled,
    apiKey: aiApiKey || null,
    provider: aiProvider || 'google',
    goToSettings,
  };
}
