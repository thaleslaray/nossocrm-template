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
  
  const { data: stages } = await supabase
    .from('board_stages')
    .select('name, color, order, boards(name, position)')
    .order('order');
  
  console.log('\n📊 STAGES NO BANCO (com cores):\n');
  stages?.sort((a, b) => {
    const posA = (a.boards as any)?.position || 0;
    const posB = (b.boards as any)?.position || 0;
    if (posA !== posB) return posA - posB;
    return a.order - b.order;
  }).forEach(s => {
    console.log(`  [${(s.boards as any)?.name}] ${s.name} → ${s.color}`);
  });
}

main();
