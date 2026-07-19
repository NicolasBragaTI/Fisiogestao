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
});

test('lembretes de WhatsApp exigem consentimento e não incluem dados clínicos', () => {
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  const appointments = readFileSync(join(root, 'js/appointments.js'), 'utf8');
  const patients = readFileSync(join(root, 'js/patients.js'), 'utf8');
  const migration = readFileSync(join(root, 'supabase/migrations/20260718190000_add_whatsapp_reminders.sql'), 'utf8');

  assert.match(core, /whatsapp_consent/);
  assert.match(core, /confirmation_status/);
  assert.match(patients, /pac-whatsapp-consent/);
  assert.match(appointments, /if\(!p\.whatsappConsent\)/);
  assert.match(appointments, /https:\/\/wa\.me\//);
  assert.doesNotMatch(appointments.match(/const mensagem=`[^`]+`/)?.[0] || '', /diag|obs|valor|pagamento/i);
  assert.match(migration, /default false/);
  assert.match(migration, /pending.*confirmed.*cancelled/s);
});

test('botão móvel adiciona paciente quando a página de pacientes está ativa', () => {
  const core = readFileSync(join(root, 'js/core.js'), 'utf8');
  assert.match(indexHtml, /onclick="openMobileCreate\(\)"/);
  assert.match(core, /activePage==='page-pacientes'/);
  assert.match(core, /return openModalPaciente\(\)/);
});

test('aba de atendimentos lembra e permite preparar confirmações pelo WhatsApp', () => {
  const appointments = readFileSync(join(root, 'js/appointments.js'), 'utf8');
  const payments = readFileSync(join(root, 'js/payments.js'), 'utf8');
  assert.match(indexHtml, /id="at-reminder-alert"/);
  assert.match(indexHtml, /id="bn-atendimentos"/);
  assert.match(payments, /confirmationStatus==='pending'&&!a\.reminderSentAt/);
  assert.match(payments, /enviarLembreteWhatsApp\('\$\{a\.id\}'\)/);
  assert.match(payments, /Reenviar lembrete/);
  assert.match(payments, /at-whatsapp-action/);
  assert.match(appointments, /const id=atendimentoId\|\|editAtendId/);
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

test('tela de login não aparece antes da verificação da sessão', () => {
  assert.match(indexHtml, /id="boot-screen"[^>]*display:flex/);
  assert.match(indexHtml, /id="auth-screen"[^>]*display:none/);
});
