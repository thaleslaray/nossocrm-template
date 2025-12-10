#!/usr/bin/env node
/**
 * 🔍 SCAN PROJECT - Gera contexto para TestSprite
 * 
 * Este script analisa o projeto e cria um arquivo de contexto
 * que o TestSprite vai usar para saber O QUE testar.
 * 
 * Uso: npm run scan:project
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURAÇÃO
// ============================================
const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = 'testsprite-context.md';

// ============================================
// TIPOS
// ============================================
interface ProjectInfo {
  name: string;
  type: string;
  framework: string;
  uiLibrary: string;
  backend: string;
  testingTools: string[];
}

interface PageInfo {
  path: string;
  name: string;
  description: string;
  components: string[];
}

interface FeatureInfo {
  name: string;
  folder: string;
  files: string[];
  actions: string[];
}

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

// ============================================
// FUNÇÕES DE ANÁLISE
// ============================================

function readJsonFile(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function findFiles(dir: string, pattern: RegExp, maxDepth = 4, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];
  
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Ignorar pastas não relevantes
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(entry.name)) {
          continue;
        }
        files.push(...findFiles(fullPath, pattern, maxDepth, currentDepth + 1));
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignora erros de permissão
  }
  
  return files;
}

function analyzePackageJson(): ProjectInfo {
  const pkg = readJsonFile(path.join(PROJECT_ROOT, 'package.json'));
  
  if (!pkg) {
    return {
      name: 'Unknown',
      type: 'Unknown',
      framework: 'Unknown',
      uiLibrary: 'Unknown',
      backend: 'Unknown',
      testingTools: [],
    };
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  // Detectar framework
  let framework = 'Vanilla JS';
  if (deps['next']) framework = 'Next.js';
  else if (deps['react']) framework = 'React';
  else if (deps['vue']) framework = 'Vue';
  else if (deps['svelte']) framework = 'Svelte';
  else if (deps['@angular/core']) framework = 'Angular';

  // Detectar UI Library
  let uiLibrary = 'Custom CSS';
  if (deps['tailwindcss']) uiLibrary = 'Tailwind CSS';
  else if (deps['@chakra-ui/react']) uiLibrary = 'Chakra UI';
  else if (deps['@mui/material']) uiLibrary = 'Material UI';
  else if (deps['antd']) uiLibrary = 'Ant Design';

  // Detectar backend
  let backend = 'Unknown';
  if (deps['@supabase/supabase-js']) backend = 'Supabase';
  else if (deps['firebase']) backend = 'Firebase';
  else if (deps['@prisma/client']) backend = 'Prisma';
  else if (deps['express']) backend = 'Express';

  // Detectar testing tools
  const testingTools: string[] = [];
  if (deps['vitest']) testingTools.push('Vitest');
  if (deps['jest']) testingTools.push('Jest');
  if (deps['playwright'] || deps['@playwright/test']) testingTools.push('Playwright');
  if (deps['cypress']) testingTools.push('Cypress');
  if (deps['@browserbasehq/stagehand']) testingTools.push('Stagehand');

  return {
    name: pkg.name || 'Unknown',
    type: deps['vite'] ? 'Vite' : (deps['next'] ? 'Next.js' : 'Node.js'),
    framework,
    uiLibrary,
    backend,
    testingTools,
  };
}

function findRoutes(): PageInfo[] {
  const pages: PageInfo[] = [];
  
  // Procurar em App.tsx, routes.tsx, etc.
  const routeFiles = findFiles(path.join(PROJECT_ROOT, 'src'), /App\.tsx$|routes?\.(tsx|ts)$/i);
  
  for (const file of routeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Regex para encontrar rotas React Router
      const routePattern = /path=["']([^"']+)["']/g;
      let match;
      
      while ((match = routePattern.exec(content)) !== null) {
        const routePath = match[1];
        
        // Tentar inferir nome da página
        const name = routePath === '/' 
          ? 'Home' 
          : routePath.split('/').filter(Boolean)[0]?.replace(/-/g, ' ') || 'Unknown';
        
        pages.push({
          path: routePath.startsWith('#') ? routePath : `/#${routePath}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          description: `Página ${name}`,
          components: [],
        });
      }
    } catch {
      // Ignora erros de leitura
    }
  }
  
  return pages;
}

function findFeatures(): FeatureInfo[] {
  const features: FeatureInfo[] = [];
  const featuresDir = path.join(PROJECT_ROOT, 'src', 'features');
  
  if (!fs.existsSync(featuresDir)) {
    return features;
  }

  try {
    const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const featurePath = path.join(featuresDir, entry.name);
        const files = fs.readdirSync(featurePath).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
        
        // Inferir ações baseado nos nomes dos arquivos e hooks
        const actions: string[] = [];
        
        for (const file of files) {
          const content = fs.readFileSync(path.join(featurePath, file), 'utf-8');
          
          // Procurar por hooks de mutação
          if (content.includes('useCreate')) actions.push('Criar');
          if (content.includes('useUpdate') || content.includes('useEdit')) actions.push('Editar');
          if (content.includes('useDelete') || content.includes('useRemove')) actions.push('Excluir');
          if (content.includes('useFetch') || content.includes('useGet') || content.includes('useList')) actions.push('Listar');
          if (content.includes('useSearch')) actions.push('Buscar');
        }
        
        features.push({
          name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1),
          folder: `src/features/${entry.name}`,
          files,
          actions: [...new Set(actions)],
        });
      }
    }
  } catch {
    // Ignora erros
  }
  
  return features;
}

function findSupabaseTables(): string[] {
  const tables: string[] = [];
  
  // Procurar em TODOS os arquivos .ts da pasta lib/supabase e services
  const supabaseDir = path.join(PROJECT_ROOT, 'src', 'lib', 'supabase');
  const servicesDir = path.join(PROJECT_ROOT, 'src', 'services');
  
  const dirsToSearch = [supabaseDir, servicesDir].filter(d => fs.existsSync(d));
  
  for (const dir of dirsToSearch) {
    const files = findFiles(dir, /\.ts$/);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Regex para encontrar .from('table_name') ou .from("table_name")
        const tablePattern = /\.from\(['"]([^'"]+)['"]\)/g;
        let match;
        
        while ((match = tablePattern.exec(content)) !== null) {
          if (!tables.includes(match[1])) {
            tables.push(match[1]);
          }
        }
      } catch {
        // Ignora erros
      }
    }
  }
  
  return tables;
}

function findEnvVariables(): string[] {
  const envVars: string[] = [];
  const envFiles = ['.env', '.env.local', '.env.example', '.env.test.example'];
  
  for (const envFile of envFiles) {
    const filePath = path.join(PROJECT_ROOT, envFile);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^([A-Z_]+)=/);
          if (match && !envVars.includes(match[1])) {
            envVars.push(match[1]);
          }
        }
      } catch {
        // Ignora erros
      }
    }
  }
  
  return envVars;
}

// ============================================
// GERAÇÃO DO CONTEXTO
// ============================================

function generateContext(): string {
  console.log('🔍 Analisando projeto...\n');
  
  const projectInfo = analyzePackageJson();
  console.log(`📦 Projeto: ${projectInfo.name}`);
  console.log(`⚛️  Framework: ${projectInfo.framework}`);
  console.log(`🎨 UI: ${projectInfo.uiLibrary}`);
  console.log(`🗄️  Backend: ${projectInfo.backend}`);
  
  const pages = findRoutes();
  console.log(`📄 Páginas encontradas: ${pages.length}`);
  
  const features = findFeatures();
  console.log(`🧩 Features encontradas: ${features.length}`);
  
  const tables = findSupabaseTables();
  console.log(`🗃️  Tabelas Supabase: ${tables.length}`);
  
  const envVars = findEnvVariables();
  console.log(`🔐 Variáveis de ambiente: ${envVars.length}`);
  
  // Gerar Markdown
  let md = `# TestSprite Context - ${projectInfo.name}

> Este arquivo foi gerado automaticamente por \`npm run scan:project\`
> Última atualização: ${new Date().toISOString()}

## 📋 Informações do Projeto

| Aspecto | Valor |
|---------|-------|
| **Nome** | ${projectInfo.name} |
| **Tipo** | ${projectInfo.type} |
| **Framework** | ${projectInfo.framework} |
| **UI Library** | ${projectInfo.uiLibrary} |
| **Backend** | ${projectInfo.backend} |
| **Testing Tools** | ${projectInfo.testingTools.join(', ') || 'Nenhum'} |

## 🌐 URL do App

\`\`\`
Development: http://localhost:3003
\`\`\`

## 🔐 Credenciais de Teste

> ⚠️ PREENCHA MANUALMENTE antes de rodar o TestSprite

\`\`\`
Email: e2e-test@example.com
Password: Test123!@#
\`\`\`

## 📄 Páginas/Rotas

| Rota | Nome | Descrição |
|------|------|-----------|
${pages.map(p => `| \`${p.path}\` | ${p.name} | ${p.description} |`).join('\n') || '| - | - | Nenhuma rota encontrada |'}

## 🧩 Features (Funcionalidades)

${features.map(f => `
### ${f.name}
- **Pasta**: \`${f.folder}\`
- **Ações**: ${f.actions.join(', ') || 'Não identificadas'}
- **Arquivos**: ${f.files.slice(0, 5).join(', ')}${f.files.length > 5 ? ` (+${f.files.length - 5} mais)` : ''}
`).join('\n') || 'Nenhuma feature encontrada em `src/features/`'}

## 🗃️ Tabelas do Banco (Supabase)

${tables.length > 0 ? tables.map(t => `- \`${t}\``).join('\n') : 'Nenhuma tabela identificada'}

## 🎯 Jornadas Críticas para Testar

> ⚠️ REVISE E COMPLETE esta seção com base no seu conhecimento do negócio

### 1. 🔐 Autenticação
- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas (deve mostrar erro)
- [ ] Logout

### 2. 👤 Gestão de Contatos
- [ ] Criar novo contato (nome, email, telefone)
- [ ] Editar contato existente
- [ ] Buscar contato por nome
- [ ] Excluir contato

### 3. 💰 Pipeline de Vendas
- [ ] Criar novo deal/negócio
- [ ] Associar deal a um contato
- [ ] Mover deal entre colunas (drag & drop)
- [ ] Editar valor do deal
- [ ] Marcar deal como ganho/perdido

### 4. 📋 Atividades
- [ ] Criar nova atividade/tarefa
- [ ] Marcar atividade como concluída
- [ ] Filtrar atividades por status

### 5. 🤖 Assistente IA (se aplicável)
- [ ] Abrir chat do assistente
- [ ] Enviar pergunta
- [ ] Verificar resposta

## 🔧 Variáveis de Ambiente Necessárias

${envVars.length > 0 ? envVars.map(v => `- \`${v}\``).join('\n') : 'Nenhuma variável identificada'}

## 📝 Notas Adicionais

> Adicione aqui qualquer contexto extra que o TestSprite precisa saber:

- Este é um CRM multi-tenant (cada organização vê apenas seus dados)
- O app usa hash routing (\`/#/rota\`)
- Autenticação via Supabase Auth
- Dark mode suportado

---

## 🚀 Como Usar com TestSprite

1. Revise e complete as seções marcadas com ⚠️
2. Configure o TestSprite MCP no VS Code/Cursor
3. No chat, digite:

\`\`\`
@TestSprite Use o arquivo testsprite-context.md como contexto e teste as jornadas críticas deste projeto.
\`\`\`

Ou para um teste específico:

\`\`\`
@TestSprite Teste a jornada de "Criar novo contato" seguindo o contexto em testsprite-context.md
\`\`\`
`;

  return md;
}

// ============================================
// EXECUÇÃO PRINCIPAL
// ============================================

function main() {
  console.log('═'.repeat(50));
  console.log('  🔍 SCAN PROJECT - Gerador de Contexto TestSprite');
  console.log('═'.repeat(50));
  console.log('');
  
  const context = generateContext();
  
  const outputPath = path.join(PROJECT_ROOT, OUTPUT_FILE);
  fs.writeFileSync(outputPath, context, 'utf-8');
  
  console.log('');
  console.log('═'.repeat(50));
  console.log(`✅ Arquivo gerado: ${OUTPUT_FILE}`);
  console.log('═'.repeat(50));
  console.log('');
  console.log('📋 Próximos passos:');
  console.log('   1. Abra o arquivo e revise as seções marcadas com ⚠️');
  console.log('   2. Complete as credenciais de teste');
  console.log('   3. Ajuste as jornadas críticas conforme seu negócio');
  console.log('   4. Use com TestSprite: @TestSprite teste este projeto');
  console.log('');
}

main();
