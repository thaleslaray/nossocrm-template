/**
 * @fileoverview Cliente Supabase para o CRM.
 * 
 * Este módulo inicializa e exporta o cliente Supabase usado em toda a aplicação.
 * As credenciais são carregadas das variáveis de ambiente.
 * 
 * @module lib/supabase/client
 * 
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase/client';
 * 
 * const { data, error } = await supabase
 *   .from('contacts')
 *   .select('*');
 * ```
 */

import { createClient } from '@supabase/supabase-js';

/**
 * URL do projeto Supabase.
 * @constant
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Chave anônima do Supabase para acesso público.
 * @constant
 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

/**
 * Cliente Supabase configurado para uso em toda a aplicação.
 * 
 * Utiliza a chave anônima que é segura para uso no frontend.
 * As políticas RLS garantem isolamento multi-tenant.
 * 
 * @constant
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
