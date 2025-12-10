#!/bin/bash
# ============================================================================
# Script: migrate-api-keys.sh
# Descrição: Migra API keys de texto plano para armazenamento encriptado
# ============================================================================
# Uso:
#   ./scripts/migrate-api-keys.sh
#
# Pré-requisitos:
#   1. Supabase CLI instalado e logado
#   2. security-fixes.sql já executado
#   3. DB_ENCRYPTION_KEY configurado
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Migração de API Keys para Encriptação"
echo "=============================================="
echo ""

# Verificar se a chave de encriptação foi fornecida
if [ -z "$DB_ENCRYPTION_KEY" ]; then
  echo -e "${YELLOW}⚠️  DB_ENCRYPTION_KEY não encontrada no ambiente.${NC}"
  echo ""
  read -p "Digite a DB_ENCRYPTION_KEY: " DB_ENCRYPTION_KEY
  
  if [ -z "$DB_ENCRYPTION_KEY" ]; then
    echo -e "${RED}❌ Chave de encriptação é obrigatória.${NC}"
    exit 1
  fi
fi

echo ""
echo "📊 Verificando status atual..."
echo ""

# Query para verificar status
STATUS_QUERY="
SELECT 
  COUNT(*) as total,
  COUNT(ai_api_key) FILTER (WHERE ai_api_key IS NOT NULL AND ai_api_key != '') as plaintext,
  COUNT(ai_api_key_encrypted) FILTER (WHERE ai_api_key_encrypted IS NOT NULL) as encrypted
FROM public.user_settings;
"

# Executar via Supabase CLI ou psql
if command -v supabase &> /dev/null; then
  echo "Usando Supabase CLI..."
  # Se estiver usando Supabase local
  supabase db query "$STATUS_QUERY" 2>/dev/null || {
    echo -e "${YELLOW}Não foi possível conectar via Supabase CLI local.${NC}"
    echo "Execute manualmente no Supabase SQL Editor."
  }
else
  echo -e "${YELLOW}Supabase CLI não encontrado.${NC}"
  echo "Execute o script SQL manualmente no Supabase Dashboard."
fi

echo ""
echo "=============================================="
echo "  Instruções para Migração Manual"
echo "=============================================="
echo ""
echo "1. Acesse o Supabase Dashboard → SQL Editor"
echo ""
echo "2. Configure a chave de encriptação:"
echo -e "${GREEN}   SET app.encryption_key = '$DB_ENCRYPTION_KEY';${NC}"
echo ""
echo "3. Execute a migração:"
echo -e "${GREEN}   UPDATE public.user_settings"
echo "   SET ai_api_key_encrypted = pgp_sym_encrypt("
echo "     ai_api_key::TEXT,"
echo "     current_setting('app.encryption_key'),"
echo "     'compress-algo=1, cipher-algo=aes256'"
echo "   )"
echo "   WHERE ai_api_key IS NOT NULL"
echo "     AND ai_api_key != ''"
echo "     AND (ai_api_key_encrypted IS NULL OR LENGTH(ai_api_key_encrypted) = 0);${NC}"
echo ""
echo "4. Verifique o resultado:"
echo -e "${GREEN}   SELECT COUNT(*) as migrated FROM public.user_settings"
echo "   WHERE ai_api_key_encrypted IS NOT NULL;${NC}"
echo ""
echo "5. APÓS VALIDAR, limpe os dados em texto plano:"
echo -e "${YELLOW}   UPDATE public.user_settings SET ai_api_key = NULL"
echo "   WHERE ai_api_key_encrypted IS NOT NULL;${NC}"
echo ""
echo "=============================================="
echo ""
echo -e "${GREEN}✅ Script de migração pronto!${NC}"
echo "Consulte: supabase/migrations/migrate-api-keys.sql para mais detalhes."
