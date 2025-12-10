import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('/Users/thaleslaray/code/projetos/crmia/.env', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...v] = line.split('=');
  if (key && v.length) env[key.trim()] = v.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  await supabase.auth.signInWithPassword({ email: 'thales@laray.com.br', password: 'H@so4nh3' });
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('name, created_at, updated_at')
    .order('created_at', { ascending: true })
    .limit(10);
  
  console.log('\n📅 10 CONTATOS MAIS ANTIGOS:\n');
  contacts?.forEach(c => {
    const created = new Date(c.created_at).toLocaleDateString('pt-BR');
    const updated = new Date(c.updated_at).toLocaleDateString('pt-BR');
    console.log(`  ${c.name.padEnd(25)} | Criado: ${created} | Modificado: ${updated}`);
  });
  
  // Verificar distribuição de datas
  const { data: stats } = await supabase
    .from('contacts')
    .select('created_at');
  
  if (stats) {
    const today = new Date();
    const counts = { today: 0, week: 0, month: 0, older: 0 };
    stats.forEach(c => {
      const created = new Date(c.created_at);
      const diffDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) counts.today++;
      else if (diffDays <= 7) counts.week++;
      else if (diffDays <= 30) counts.month++;
      else counts.older++;
    });
    console.log('\n📊 DISTRIBUIÇÃO DE DATAS:');
    console.log(`   Hoje:        ${counts.today}`);
    console.log(`   Última semana: ${counts.week}`);
    console.log(`   Último mês:   ${counts.month}`);
    console.log(`   Mais antigos: ${counts.older}`);
  }
}

main();
