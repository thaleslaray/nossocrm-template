# Conformidade LGPD - NossoCRM

**Versão:** 1.0.0  
**Última atualização:** Dezembro de 2024

---

## 1. Visão Geral

Este documento descreve as medidas técnicas e organizacionais implementadas no NossoCRM para conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

## 2. Papéis e Responsabilidades

### 2.1 NossoCRM como Controlador
Para dados de nossos clientes diretos (empresas que contratam o serviço):
- Dados de cadastro e autenticação
- Dados de uso e preferências
- Dados de faturamento

### 2.2 NossoCRM como Operador
Para dados de terceiros inseridos por nossos clientes:
- Dados de leads e contatos
- Dados de empresas clientes
- Histórico de interações

### 2.3 Encarregado (DPO)
- **Nome:** [NOME DO DPO]
- **Email:** dpo@nossocrm.com.br
- **Responsabilidades:** Comunicação com ANPD, orientação interna, atendimento a titulares

## 3. Bases Legais Utilizadas

| Tratamento | Base Legal | Artigo LGPD |
|------------|------------|-------------|
| Autenticação | Execução de contrato | Art. 7º, V |
| Fornecimento do serviço | Execução de contrato | Art. 7º, V |
| Suporte técnico | Execução de contrato | Art. 7º, V |
| Segurança da conta | Legítimo interesse | Art. 7º, IX |
| Melhorias no produto | Legítimo interesse | Art. 7º, IX |
| Marketing | Consentimento | Art. 7º, I |
| Analytics | Consentimento | Art. 7º, I |
| Obrigações fiscais | Obrigação legal | Art. 7º, II |

## 4. Medidas Técnicas de Segurança

### 4.1 Criptografia
- **Em trânsito:** TLS 1.3 para todas as comunicações
- **Em repouso:** AES-256 no banco de dados (Supabase)
- **Senhas:** bcrypt com salt único

### 4.2 Controle de Acesso
- Row Level Security (RLS) no PostgreSQL
- Isolamento multi-tenant por `company_id`
- Autenticação JWT com expiração configurável
- Validação de CORS por origem

### 4.3 Monitoramento
- Logs de auditoria para ações sensíveis
- Detecção de tentativas de acesso cross-tenant
- Rate limiting por endpoint e usuário
- Alertas de segurança automatizados

### 4.4 Backup e Recuperação
- Backups automáticos diários
- Retenção de 30 dias
- Point-in-time recovery disponível
- Testes periódicos de restauração

## 5. Direitos dos Titulares

### 5.1 Implementação Técnica

| Direito | Implementação |
|---------|---------------|
| Confirmação/Acesso | Endpoint `/api/me/data` + Export UI |
| Correção | Edição via interface + endpoint PATCH |
| Eliminação | Soft delete + hard delete após 30 dias |
| Portabilidade | Export JSON/CSV via dashboard |
| Revogação | Toggle de consentimentos na interface |
| Oposição | Flag de opt-out por tratamento |

### 5.2 Fluxo de Atendimento

1. **Recebimento:** Via email/plataforma
2. **Validação:** Confirmação de identidade
3. **Processamento:** Até 15 dias úteis
4. **Resposta:** Por email com comprovante

### 5.3 Canais de Atendimento
- Email: privacidade@nossocrm.com.br
- Plataforma: Configurações > Privacidade
- DPO: dpo@nossocrm.com.br

## 6. Consentimento

### 6.1 Coleta de Consentimento
- Modal de consentimento no primeiro acesso
- Checkboxes separados para cada finalidade
- Registro com timestamp, IP e user-agent
- Versionamento de termos

### 6.2 Gestão de Consentimento
- Dashboard de consentimentos em Configurações
- Histórico de alterações disponível
- Revogação a qualquer momento
- Consentimentos obrigatórios vs opcionais

### 6.3 Registro Técnico
```sql
CREATE TABLE user_consents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    consent_type TEXT NOT NULL,
    version TEXT NOT NULL,
    consented_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    revoked_at TIMESTAMPTZ
);
```

## 7. Compartilhamento de Dados

### 7.1 Subprocessadores

| Fornecedor | Serviço | Localização | Certificações |
|------------|---------|-------------|---------------|
| Supabase | Banco de dados | EUA/UE | SOC 2 Type II |
| Vercel | Hospedagem | Global | SOC 2 Type II |
| Google | IA (Gemini) | EUA | ISO 27001 |
| Resend | Email | EUA | SOC 2 |

### 7.2 Cláusulas Contratuais
- DPAs assinados com todos os subprocessadores
- Cláusulas padrão de proteção de dados
- Direito de auditoria quando aplicável

## 8. Transferência Internacional

### 8.1 Mecanismos de Adequação
- Cláusulas contratuais padrão (SCCs)
- Certificações de segurança dos provedores
- Análise de risco documentada

### 8.2 Países de Destino
- Estados Unidos (Supabase, Google, Vercel)
- União Europeia (backup Supabase)

## 9. Retenção e Exclusão

### 9.1 Períodos de Retenção

| Tipo de Dado | Período | Justificativa |
|--------------|---------|---------------|
| Conta ativa | Duração do contrato | Execução do serviço |
| Conta encerrada | 30 dias | Período de recuperação |
| Logs de acesso | 6 meses | Segurança |
| Dados fiscais | 5 anos | Obrigação legal |
| Backups | 90 dias | Recuperação de desastres |

### 9.2 Processo de Exclusão
1. Soft delete imediato (dados não visíveis)
2. Hard delete após 30 dias
3. Exclusão de backups após 90 dias
4. Registro de exclusão mantido para auditoria

## 10. Incidentes de Segurança

### 10.1 Classificação

| Nível | Descrição | Prazo ANPD |
|-------|-----------|------------|
| Crítico | Vazamento de dados sensíveis | 2 dias úteis |
| Alto | Acesso não autorizado a dados | 2 dias úteis |
| Médio | Vulnerabilidade explorada | 5 dias úteis |
| Baixo | Tentativa sem sucesso | Registro interno |

### 10.2 Procedimento
1. Detecção e contenção imediata
2. Avaliação de impacto
3. Notificação interna (DPO)
4. Notificação ANPD (se aplicável)
5. Notificação titulares (se aplicável)
6. Remediação e documentação
7. Análise post-mortem

## 11. Avaliação de Impacto (RIPD)

### 11.1 Quando Realizar
- Novos tratamentos em larga escala
- Tratamento de dados sensíveis
- Monitoramento sistemático
- Uso de novas tecnologias (IA)

### 11.2 Metodologia
1. Descrição do tratamento
2. Avaliação de necessidade
3. Identificação de riscos
4. Medidas mitigadoras
5. Aprovação do DPO

## 12. Treinamento

### 12.1 Programa de Conscientização
- Onboarding com módulo LGPD
- Treinamento anual obrigatório
- Simulações de phishing
- Atualizações sobre mudanças legais

### 12.2 Registro
- Certificados de conclusão
- Registro de presença
- Avaliações de conhecimento

## 13. Auditoria e Melhoria

### 13.1 Auditorias Internas
- Trimestral: Revisão de acessos
- Semestral: Teste de processos
- Anual: Auditoria completa

### 13.2 Auditorias Externas
- SOC 2 Type II (quando aplicável)
- Pentest anual
- Revisão de código de segurança

## 14. Documentação

### 14.1 Registro de Tratamentos
Mantemos registro atualizado de todos os tratamentos conforme Art. 37 da LGPD.

### 14.2 Documentos Disponíveis
- Política de Privacidade (pública)
- Termos de Uso (público)
- Este documento (interno/parceiros)
- Registro de tratamentos (sob demanda)

## 15. Contatos

- **DPO:** dpo@nossocrm.com.br
- **Privacidade:** privacidade@nossocrm.com.br
- **Segurança:** security@nossocrm.com.br
- **Suporte:** suporte@nossocrm.com.br

---

*Este documento é atualizado regularmente para refletir as práticas atuais e mudanças regulatórias.*
