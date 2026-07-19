// ── TIMEOUT POR INATIVIDADE (30 min) ─────────────────────
let _idleTimer;
function _resetIdle() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(async () => {
    if (currentUser) {
      toast('Sessão encerrada por inatividade.', 'error');
      await doLogout();
    }
  }, 30 * 60 * 1000);
}
['click','keydown','mousemove','touchstart'].forEach(ev =>
  document.addEventListener(ev, _resetIdle, { passive: true })
);

// ── DATA ────────────────────────────────────────────────
let pacientes = [];
let atendimentos = [];
let editAtendId = null, editPacId = null;
let charts = {};

async function loadData(){
  const [{ data: pacs, error: e1 }, { data: atends, error: e2 }] = await Promise.all([
    _sb.from('pacientes').select('*').order('nome'),
    _sb.from('atendimentos').select('*').order('data', { ascending: false }),
    dbLoadPacotes()
  ]);
  if(e1||e2){ console.error(e1||e2); return; }
  pacientes = (pacs||[]).map(p => ({
    id: p.id, nome: p.nome, tel: p.tel||'', nasc: p.nasc||'',
    end: p.end_local||'', diag: p.diag||'', valorPadrao: p.valor_padrao||'', obs: p.obs||'',
    whatsappConsent: p.whatsapp_consent===true
  }));
  atendimentos = (atends||[]).map(a => ({
    id: a.id, pacienteId: a.paciente_id, data: a.data||'', hora: a.hora||'', horaFim: a.hora_fim||'',
    valor: a.valor||0, valorRecebido: a.valor_recebido||0, metodo: a.metodo||'', status: a.status||'pendente',
    vencimento: a.vencimento||'', obs: a.obs||'', dataPagamento: a.data_pagamento||'',
    historicoPagamentos: Array.isArray(a.historico_pagamentos) ? a.historico_pagamentos : [],
    pacoteId: a.pacote_id||'', confirmationStatus: a.confirmation_status||'pending',
    reminderSentAt: a.reminder_sent_at||''
  }));
}

async function dbSavePaciente(p, isNew){
  if(isNew){
    const { data, error } = await _sb.from('pacientes').insert({
      id: p.id, nome: p.nome, tel: p.tel||null, nasc: p.nasc||null,
      end_local: p.end||null, diag: p.diag||null, valor_padrao: p.valorPadrao||null, obs: p.obs||null,
      whatsapp_consent: p.whatsappConsent===true,
      user_id: currentUser.id
    }).select('id');
    if(error) throw error;
    if(!data||!data.length) throw new Error('Sem permissão para criar paciente.');
  } else {
    const { data, error } = await _sb.from('pacientes').update({
      nome: p.nome, tel: p.tel||null, nasc: p.nasc||null,
      end_local: p.end||null, diag: p.diag||null, valor_padrao: p.valorPadrao||null, obs: p.obs||null,
      whatsapp_consent: p.whatsappConsent===true
    }).eq('id', p.id).eq('user_id', currentUser.id).select('id');
    if(error) throw error;
    if(!data||!data.length) throw new Error('Sem permissão para editar este paciente.');
  }
}

async function dbSaveAtend(a, isNew){
  const valor = parseFloat(a.valor)||0;
  const valorRecebido = parseFloat(a.valorRecebido)||0;
  if(valor < 0 || valorRecebido < 0) throw new Error('Valores financeiros não podem ser negativos.');
  if(valorRecebido > valor + 0.01) throw new Error('Valor recebido não pode superar o valor da sessão.');
  if(isNew){
    const { data, error } = await _sb.from('atendimentos').insert({
      id: a.id, paciente_id: a.pacienteId, data: a.data||null, hora: a.hora||null, hora_fim: a.horaFim||null,
      valor: a.valor||0, valor_recebido: a.valorRecebido||0, metodo: a.metodo||null, status: a.status||null,
      vencimento: a.vencimento||null, obs: a.obs||null, data_pagamento: a.dataPagamento||null,
      historico_pagamentos: a.historicoPagamentos||[], pacote_id: a.pacoteId||null,
      confirmation_status: a.confirmationStatus||'pending', reminder_sent_at: a.reminderSentAt||null,
      user_id: currentUser.id
    }).select('id');
    if(error) throw error;
    if(!data||!data.length) throw new Error('Sem permissão para criar atendimento.');
  } else {
    const { data, error } = await _sb.from('atendimentos').update({
      paciente_id: a.pacienteId, data: a.data||null, hora: a.hora||null, hora_fim: a.horaFim||null,
      valor: a.valor||0, valor_recebido: a.valorRecebido||0, metodo: a.metodo||null, status: a.status||null,
      vencimento: a.vencimento||null, obs: a.obs||null, data_pagamento: a.dataPagamento||null,
      historico_pagamentos: a.historicoPagamentos||[], pacote_id: a.pacoteId||null,
      confirmation_status: a.confirmationStatus||'pending', reminder_sent_at: a.reminderSentAt||null
    }).eq('id', a.id).eq('user_id', currentUser.id).select('id');
    if(error) throw error;
    if(!data||!data.length) throw new Error('Sem permissão para editar este atendimento.');
  }
}

async function dbDeletePaciente(id){
  await _sb.from('atendimentos').delete().eq('paciente_id', id);
  await _sb.from('pacientes').delete().eq('id', id);
}

async function dbDeleteAtend(id){
  await _sb.from('atendimentos').delete().eq('id', id);
}

// ── HELPERS ─────────────────────────────────────────────
const brl = v => 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const fmtData = d => { if(!d) return '—'; const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}`; };
const iniciais = n => n.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
const nomePac = id => { const p=pacientes.find(x=>x.id===id); return p?p.nome:'—'; };
const today = () => new Date().toISOString().split('T')[0];
const fmtMes = ym => { if(!ym) return ''; const [y,m]=ym.split('-'); return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(m)-1]+' '+y; };

function diasAtraso(vencimento, status){
  if(status==='pago'||status==='cancelado'||!vencimento) return null;
  const diff = Math.floor((new Date(today()) - new Date(vencimento)) / 86400000);
  return diff;
}

function statusComVencimento(a){
  if(a.status==='pago'||a.status==='cancelado') return a.status;
  if(a.status==='parcial'){
    if(!a.vencimento) return 'parcial';
    const diff = diasAtraso(a.vencimento, a.status);
    return diff > 0 ? 'atrasado' : 'parcial';
  }
  if(!a.vencimento) return a.status;
  const diff = diasAtraso(a.vencimento, a.status);
  if(diff > 0) return 'atrasado';
  return 'pendente';
}

function badgeHtml(status, vencimento){
  const s = (status==='pendente'||status==='parcial')&&vencimento ? statusComVencimento({status,vencimento}) : status;
  const map = {pago:'badge-pago',pendente:'badge-pendente',atrasado:'badge-atrasado',cancelado:'badge-cancelado',parcial:'badge-pendente',em_pacote:'badge-pendente'};
  const ico = {pago:'ti-circle-check',pendente:'ti-clock',atrasado:'ti-alert-circle',cancelado:'ti-x',parcial:'ti-clock-half-2',em_pacote:'ti-package'};
  const label = {pago:'Pago',pendente:'Pendente',atrasado:'Atrasado',cancelado:'Cancelado',parcial:'Parcial',em_pacote:'Consumido do pacote'};
  return `<span class="badge ${map[s]||'badge-cancelado'}"><i class="ti ${ico[s]||'ti-minus'}"></i>${label[s]||s}</span>`;
}

function confirmationBadgeHtml(a){
  if(a.confirmationStatus==='confirmed') return '<span class="badge badge-pago"><i class="ti ti-circle-check"></i>Confirmado</span>';
  if(a.confirmationStatus==='cancelled') return '<span class="badge badge-cancelado"><i class="ti ti-x"></i>Cancelado</span>';
  if(a.reminderSentAt) return '<span class="badge badge-parcial"><i class="ti ti-brand-whatsapp"></i>Lembrete preparado</span>';
  return '<span class="badge badge-pendente"><i class="ti ti-bell"></i>Aguardando lembrete</span>';
}

function situacaoChip(a){
  const s = statusComVencimento(a);
  if(s==='pago') return `<span class="days-chip days-ok">Pago</span>`;
  if(s==='cancelado') return `<span class="days-chip" style="background:#f0f4f2;color:#5a7a6a">Cancelado</span>`;
  if(!a.vencimento) return `<span class="days-chip days-soon">Sem vencimento</span>`;
  const diff = diasAtraso(a.vencimento, a.status);
  if(diff > 0) return `<span class="days-chip days-late">${diff}d atrasado</span>`;
  if(diff === 0) return `<span class="days-chip days-soon">Vence hoje</span>`;
  const falta = Math.abs(diff);
  if(falta <= 3) return `<span class="days-chip days-soon">Vence em ${falta}d</span>`;
  return `<span class="days-chip days-ok">Vence em ${falta}d</span>`;
}

// ── TOAST ───────────────────────────────────────────────
function toast(msg, type=''){
  const t=document.getElementById('toast');
  t.className='toast show'+(type?' '+type:'');
  document.getElementById('toast-msg').textContent=msg;
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>t.classList.remove('show'),2800);
}

// ── NAVEGAÇÃO ────────────────────────────────────────────
function toggleSidebar(){
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
async function navTo(page, btn){
  const adminPages = ['admin','cadastros'];
  if(adminPages.includes(page) && currentProfile?.role !== 'admin'){
    toast('Acesso restrito ao administrador.', 'error');
    return;
  }
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  closeSidebar();
  // sync bottom nav
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  const bnMap={'visao-geral':'bn-visao-geral','agenda':'bn-agenda','pacientes':'bn-pacientes','pagamentos':'bn-pagamentos'};
  if(bnMap[page]) document.getElementById(bnMap[page])?.classList.add('active');
  const titles={
    'visao-geral':'Visão geral','pagamentos':'Pagamentos',
    'atendimentos':'Atendimentos','pacientes':'Pacientes','relatorio':'Relatório mensal','agenda':'Agenda',
    'admin':'Controle de acesso','cadastros':'Cadastros de usuários','perfil':'Meu perfil','pacotes':'Pacotes de sessões'
  };
  document.getElementById('page-title').textContent=titles[page]||page;
  const dataPages=['visao-geral','pagamentos','atendimentos','pacientes','relatorio','pacotes'];
  if(dataPages.includes(page)) await loadData();
  if(page==='visao-geral') renderDashboard();
  if(page==='pagamentos'){populatePayFilters();renderPagamentos();}
  if(page==='atendimentos'){populateAtFilters();renderAtendimentos();}
  if(page==='pacientes') renderPacientes();
  if(page==='relatorio'){populateRelMes();renderRelatorio();}
  if(page==='agenda'){semanaAtual();}
  if(page==='admin') renderAdmin();
  if(page==='cadastros') renderCadastros();
  if(page==='perfil') renderPerfil();
  if(page==='pacotes') renderPacotes();
}

function navToLink(page){
  const btn = [...document.querySelectorAll('.nav-item')].find(b=>b.textContent.trim().toLowerCase().includes(page));
  navTo(page, btn);
}

function openMobileCreate(){
  const activePage=document.querySelector('.page.active')?.id;
  if(activePage==='page-pacientes') return openModalPaciente();
  if(activePage==='page-pacotes') return openModalPacote();
  return openModalAtend();
}
