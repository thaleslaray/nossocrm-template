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
  
  const { data: boards } = await supabase
    .from('boards')
    .select('name, agent_name, agent_role, goal_description, goal_kpi, goal_target_value, goal_type, entry_trigger')
    .order('position');
  
  console.log('\n📊 BOARDS NO BANCO (estrutura completa):\n');
  boards?.forEach(b => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 ${b.name}`);
    console.log(`   🤖 Agente: ${b.agent_name} (${b.agent_role})`);
    console.log(`   🎯 Meta: ${b.goal_description}`);
    console.log(`      KPI: ${b.goal_kpi} | Target: ${b.goal_target_value} | Tipo: ${b.goal_type}`);
    console.log(`   🚀 Entry: ${b.entry_trigger}`);
  });
}

main();
