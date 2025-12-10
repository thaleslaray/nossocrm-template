#!/usr/bin/env node

/**
 * validate-multi-tenant.js
 * 
 * Script para detectar violações das convenções multi-tenant.
 * Execute com: node scripts/validate-multi-tenant.js
 * 
 * Erros comuns que detecta:
 * 1. organization_id sendo passado como input de formulário
 * 2. Confusão entre organization_id e client_company_id
 * 3. company_id (nome antigo) ainda sendo usado
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = './src';
const SUPABASE_DIR = './supabase';

const violations = [];

// Patterns que indicam possíveis problemas
const DANGEROUS_PATTERNS = [
  {
    pattern: /organization_id:\s*(data|formData|input|params|body)\./gi,
    message: 'organization_id não deve vir de input do usuário! Use useAuth().organizationId',
    severity: 'error'
  },
  {
    pattern: /\bcompany_id\b(?!.*deprecated)/gi,
    message: 'Use organization_id (para tenant) ou client_company_id (para empresa cliente)',
    severity: 'warning'
  },
  {
    pattern: /organization_id:\s*selectedCompany/gi,
    message: 'Isso parece client_company_id, não organization_id!',
    severity: 'error'
  },
  {
    pattern: /organizationId:\s*company\./gi,
    message: 'Parece confusão entre organization e company',
    severity: 'warning'
  },
  {
    pattern: /from\(['"`]companies['"`]\)/gi,
    message: 'Tabela companies foi renomeada para organizations (tenants) ou crm_companies (clientes)',
    severity: 'error'
  }
];

// Patterns aceitáveis (falsos positivos a ignorar)
const SAFE_PATTERNS = [
  /useAuth\(\)\.organizationId/,
  /profile\.organization_id/,
  /get_user_organization_id/,
  /requireUUID.*organization/i,
  /@deprecated/,
  /\/\/ OK:/,
  /\/\/ ✅/,
  /\/\/ ❌/,  // Exemplos de código errado em documentação
  /\* const deal/,  // JSDoc examples
  /ERRADO/i,
  /WRONG/i
];

function walkDir(dir, callback) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const filePath = join(dir, file);
      try {
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'coverage', '.git'].includes(file)) {
            walkDir(filePath, callback);
          }
        } else {
          const ext = extname(file);
          if (['.ts', '.tsx', '.sql'].includes(ext)) {
            callback(filePath);
          }
        }
      } catch (e) {
        // Skip files we can't read
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
}

function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Skip if line contains safe pattern
      if (SAFE_PATTERNS.some(p => p.test(line))) {
        return;
      }
      
      DANGEROUS_PATTERNS.forEach(({ pattern, message, severity }) => {
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;
        
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            line: index + 1,
            content: line.trim().substring(0, 80),
            message,
            severity
          });
        }
      });
    });
  } catch (e) {
    // Skip files we can't read
  }
}

console.log('🔍 Validando convenções multi-tenant...\n');

walkDir(SRC_DIR, checkFile);
walkDir(SUPABASE_DIR, checkFile);

if (violations.length === 0) {
  console.log('✅ Nenhuma violação encontrada!\n');
  console.log('Dica: Ver docs/MULTI_TENANT_ARCHITECTURE.md para mais informações.');
  process.exit(0);
} else {
  console.log(`⚠️ Encontradas ${violations.length} possíveis violações:\n`);
  
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  
  if (errors.length > 0) {
    console.log('❌ ERROS:');
    errors.forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`    ${v.content}`);
      console.log(`    → ${v.message}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('⚡ AVISOS:');
    warnings.forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`    ${v.content}`);
      console.log(`    → ${v.message}\n`);
    });
  }
  
  console.log('📚 Ver: docs/MULTI_TENANT_ARCHITECTURE.md');
  console.log('📚 Ver: .github/copilot-instructions.md\n');
  
  // Exit with error only if there are errors (not warnings)
  process.exit(errors.length > 0 ? 1 : 0);
}
