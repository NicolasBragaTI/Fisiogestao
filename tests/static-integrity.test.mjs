import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url).pathname;
const indexPath = join(root, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');

const localScripts = [...indexHtml.matchAll(/<script\s+src="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((src) => !/^https?:\/\//.test(src));

test('todos os módulos locais referenciados existem e têm sintaxe válida', () => {
  assert.ok(localScripts.length > 0, 'nenhum módulo local encontrado');

  for (const script of localScripts) {
    const file = join(root, script);
    assert.ok(existsSync(file), `arquivo ausente: ${script}`);
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  }
});

test('módulos carregam na ordem necessária', () => {
  assert.deepEqual(localScripts, [
    'js/supabase-client.js',
    'js/core.js',
    'js/dashboard.js',
    'js/payments.js',
    'js/patients.js',
    'js/reports.js',
    'js/appointments.js',
    'js/packages.js',
    'js/agenda.js',
    'js/auth.js',
    'js/init.js'
  ]);
});

test('frontend usa somente chave pública moderna do Supabase', () => {
  const client = readFileSync(join(root, 'js/supabase-client.js'), 'utf8');
  assert.equal((client.match(/sb_publishable_[A-Za-z0-9_-]+/g) ?? []).length, 2);
  assert.match(client, /storage:\s*window\.localStorage/);
  assert.match(client, /persistSession:\s*true/);
  assert.doesNotMatch(client, /sb_secret_/);
  assert.doesNotMatch(client, /service_role/);
  assert.doesNotMatch(client, /eyJhbGciOi/);
});

test('previews usam QAS e o domínio oficial permanece em produção', () => {
  const client = readFileSync(join(root, 'js/supabase-client.js'), 'utf8');
  assert.match(client, /rcnuymnazjyhckoojpvf\.supabase\.co/);
  assert.match(client, /fisiogestao-jhmd\.vercel\.app/);
  assert.match(client, /qas-environment-badge/);
});

test('migrações críticas de segurança e desempenho estão versionadas', () => {
  assert.ok(existsSync(join(root, 'supabase/migrations/20260717180000_create_initial_schema.sql')));
  assert.ok(existsSync(join(root, 'supabase/migrations/20260717191543_harden_rls_and_function_privileges.sql')));
  assert.ok(existsSync(join(root, 'supabase/migrations/20260718125341_add_fk_covering_indexes.sql')));
  const hardening = readFileSync(join(root, 'supabase/migrations/20260719143000_harden_profile_and_disable_public_admin_rpcs.sql'), 'utf8');
  assert.match(hardening, /security invoker/i);
  assert.match(hardening, /profiles_update_own/);
  assert.match(hardening, /revoke execute on function public\.admin_get_users\(\) from public, anon, authenticated/i);
});

test('cadastro e troca de senha exigem senha forte', () => {
  const auth = readFileSync(join(root, 'js/auth.js'), 'utf8');
  assert.match(auth, /password\.length < 12/);
  assert.match(auth, /\[A-Z\]/);
  assert.match(auth, /\[a-z\]/);
  assert.match(auth, /\[0-9\]/);
  assert.match(auth, /\[\^A-Za-z0-9\]/);
  assert.doesNotMatch(auth, /senha deve ter ao menos (6|8) caracteres/i);
  assert.doesNotMatch(indexHtml, /senha deve ter no mínimo (6|8) caracteres/i);
});

test('administração de cadastros usa RLS sem reabrir RPCs privilegiadas', () => {
  const auth = readFileSync(join(root, 'js/auth.js'), 'utf8');
  const migration = readFileSync(join(root, 'supabase/migrations/20260725125301_restore_admin_access_with_rls.sql'), 'utf8');

  assert.match(auth, /\.from\('profiles'\)[\s\S]*\.select\('id,email,role,created_at,nome'\)/);
  assert.match(auth, /\.from\('profiles'\)\.update\(\{ role \}\)\.eq\('id', userId\)/);
  assert.doesNotMatch(auth, /\.rpc\('admin_get_users'/);
  assert.doesNotMatch(auth, /\.rpc\('admin_update_role'/);
  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /profiles_admin_select/);
  assert.match(migration, /profiles_admin_update/);
  assert.match(migration, /revoke execute on function public\.admin_get_users\(\) from public, anon, authenticated/i);
});

test('integração de envio pelo WhatsApp foi removida da aplicação', () => {
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  const appointments = readFileSync(join(root, 'js/appointments.js'), 'utf8');
  const patients = readFileSync(join(root, 'js/patients.js'), 'utf8');
  const payments = readFileSync(join(root, 'js/payments.js'), 'utf8');

  assert.doesNotMatch(indexHtml, /WhatsApp|at-reminder-alert|pac-whatsapp-consent/i);
  assert.doesNotMatch(core, /whatsapp_consent|reminder_sent_at|reminderSentAt/i);
  assert.doesNotMatch(patients, /whatsapp/i);
  assert.doesNotMatch(appointments, /whatsapp|wa\.me|enviarLembrete/i);
  assert.doesNotMatch(payments, /whatsapp|enviarLembrete|reminderSentAt/i);
  assert.match(core, /confirmation_status/);
});

test('botão móvel adiciona paciente quando a página de pacientes está ativa', () => {
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  assert.match(indexHtml, /onclick="openMobileCreate\(\)"/);
  assert.match(core, /activePage==='page-pacientes'/);
  assert.match(core, /return openModalPaciente\(\)/);
});

test('formulário de atendimento contém somente os cinco campos essenciais', () => {
  const modal = indexHtml.match(/id="modal-atend"[\s\S]*?<!-- MODAL PACIENTE -->/)?.[0] ?? '';
  const fieldIds = [...modal.matchAll(/<(?:input|select|textarea)[^>]+id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(fieldIds, ['atend-paciente','atend-pacote','atend-data','atend-hora','atend-valor']);
  const payments = readFileSync(join(root, 'js/payments.js'), 'utf8');
  assert.doesNotMatch(payments, /confirmationBadgeHtml\(a\)/);
  assert.match(indexHtml, /<textarea id="pac-obs"/);
});

test('agenda centraliza atendimentos sem manter uma tela duplicada', () => {
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  const agenda = readFileSync(join(root, 'js/agenda.js'), 'utf8');
  assert.doesNotMatch(indexHtml, /id="page-atendimentos"|id="bn-atendimentos"|navTo\('atendimentos'/);
  assert.match(core, /if\(page==='atendimentos'\) page='agenda'/);
  assert.match(core, /'pacotes','agenda'/);
  assert.match(agenda, /openModalAtend\(\)/);
  assert.match(agenda, /editAtend\('/);
});

test('página de vendas aponta para o checkout oficial', () => {
  const sales = readFileSync(join(root, 'js/sales.js'), 'utf8');
  assert.match(sales, /https:\/\/go\.perfectpay\.com\.br\/PPU38CQECIM/);
});

test('login direciona o usuário para a visão geral', () => {
  const auth = readFileSync(join(root, 'js/auth.js'), 'utf8');
  const loginFunction = auth.match(/async function doLogin\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(loginFunction, /page-title/);
  assert.match(loginFunction, /Visão geral/);
});

test('pagamentos de pacotes são consolidados sem contar sessões como novas cobranças', () => {
  const payments = readFileSync(join(root, 'js/payments.js'), 'utf8');
  assert.match(payments, /function pagamentosDePacotes\(\)/);
  assert.match(payments, /atendimentos\.filter\(a=>!a\.pacoteId\)/);
  assert.match(payments, /\.\.\.pagamentosDePacotes\(\)/);
});

test('recarregamento restaura a interface antes de buscar os dados em paralelo', () => {
  const init = readFileSync(join(root, 'js/init.js'), 'utf8');
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  assert.ok(init.indexOf('hideAuthScreen()') < init.indexOf('await Promise.all([loadProfile(), loadData()])'));
  assert.match(core, /Promise\.all\(\[[\s\S]*dbLoadPacotes\(\)/);
});

test('navegação reutiliza dados recentes e gráfico pesado carrega apenas no desktop', () => {
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  const dashboard = readFileSync(join(root, 'js/dashboard.js'), 'utf8');
  assert.match(core, /async function ensureDataFresh/);
  assert.match(core, /if\(dataPages\.includes\(page\)\) await ensureDataFresh\(\)/);
  assert.doesNotMatch(indexHtml, /<script[^>]+Chart\.js/i);
  assert.match(dashboard, /matchMedia\('\(max-width: 768px\)'\)/);
  assert.match(dashboard, /script\.async = true/);
});

test('visão geral exibe somente os indicadores essenciais e não destaca atrasados', () => {
  const dashboard = readFileSync(join(root, 'js/dashboard.js'), 'utf8');
  const overview = indexHtml.match(/id="page-visao-geral"[\s\S]*?<!-- ===== PAGAMENTOS ===== -->/)?.[0] ?? '';
  assert.notEqual(overview, '');
  assert.doesNotMatch(overview, /Pendentes \/ Atrasados|dash-pendentes/);
  assert.doesNotMatch(dashboard, /<span class="mc-label">Atrasados<\/span>|dash-pendentes/);
  assert.match(dashboard, /Atendimentos este mês/);
  assert.match(dashboard, /Recebido este mês/);
  assert.match(dashboard, /A receber/);
});

test('tela de login não aparece antes da verificação da sessão', () => {
  assert.match(indexHtml, /id="boot-screen"[^>]*display:flex/);
  assert.match(indexHtml, /id="auth-screen"[^>]*display:none/);
});
