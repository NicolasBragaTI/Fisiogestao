// ── PACOTES ──────────────────────────────────────────────
let pacotes = [];
let editPacoteId = null;

async function dbLoadPacotes(){
  const { data, error } = await _sb.from('pacotes').select('*').order('created_at', {ascending:false});
  if(error){ console.error(error); return; }
  pacotes = (data||[]).map(p=>({
    id: p.id, pacienteId: p.paciente_id, nome: p.nome,
    totalSessoes: p.total_sessoes||0, valorSessao: p.valor_sessao||0,
    valorTotal: p.valor_total||0, valorRecebido: p.valor_recebido||0,
    historicoPagamentos: Array.isArray(p.historico_pagamentos)?p.historico_pagamentos:[],
    metodo: p.metodo||'', status: p.status||'ativo', obs: p.obs||'',
    createdAt: p.created_at||''
  }));
}

async function dbSavePacote(p, isNew){
  if(isNew){
    const {data,error}=await _sb.from('pacotes').insert({
      id:p.id, paciente_id:p.pacienteId, nome:p.nome,
      total_sessoes:p.totalSessoes, valor_sessao:p.valorSessao,
      valor_total:p.valorTotal, valor_recebido:p.valorRecebido||0,
      historico_pagamentos:p.historicoPagamentos||[],
      metodo:p.metodo||null, status:p.status||'ativo', obs:p.obs||null,
      user_id:currentUser.id
    }).select('id');
    if(error) throw error;
    if(!data||!data.length) throw new Error('Sem permissao para criar pacote.');
  } else {
    const {data,error}=await _sb.from('pacotes').update({
      paciente_id:p.pacienteId, nome:p.nome,
      total_sessoes:p.totalSessoes, valor_sessao:p.valorSessao,
      valor_total:p.valorTotal, valor_recebido:p.valorRecebido||0,
      historico_pagamentos:p.historicoPagamentos||[],
      metodo:p.metodo||null, status:p.status||'ativo', obs:p.obs||null
    }).eq('id',p.id).eq('user_id',currentUser.id).select('id');
    if(error) throw error;
    if(!data||!data.length) throw new Error('Sem permissao para editar pacote.');
  }
}

async function dbDeletePacote(id){
  // desvincular sessoes do pacote antes de remover
  await _sb.from('atendimentos').update({pacote_id:null}).eq('pacote_id',id).eq('user_id',currentUser.id);
  await _sb.from('pacotes').delete().eq('id',id).eq('user_id',currentUser.id);
}

function sessoesNoPacote(pacoteId){
  return atendimentos.filter(a=>a.pacoteId===pacoteId);
}

function sessoesRealizadas(pacoteId){
  return atendimentos.filter(a=>a.pacoteId===pacoteId && a.status!=='cancelado');
}

function openModalPacote(id){
  editPacoteId = id||null;
  document.getElementById('modal-pacote-title').textContent = id?'Editar pacote':'Novo pacote';
  const sel = document.getElementById('pacote-paciente');
  sel.innerHTML = pacientes.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  if(!pacientes.length){toast('Cadastre um paciente primeiro','error');return;}
  if(id){
    const p=pacotes.find(x=>x.id===id);
    sel.value=p.pacienteId;
    document.getElementById('pacote-nome').value=p.nome;
    document.getElementById('pacote-total-sessoes').value=p.totalSessoes;
    document.getElementById('pacote-valor-sessao').value=p.valorSessao;
    document.getElementById('pacote-valor-total').value=p.valorTotal;
    document.getElementById('pacote-metodo').value=p.metodo||'Pix';
    document.getElementById('pacote-obs').value=p.obs||'';
  } else {
    sel.value=pacientes[0]?.id||'';
    document.getElementById('pacote-nome').value='';
    document.getElementById('pacote-total-sessoes').value='';
    document.getElementById('pacote-valor-sessao').value='';
    document.getElementById('pacote-valor-total').value='';
    document.getElementById('pacote-metodo').value='Pix';
    document.getElementById('pacote-obs').value='';
    // preenche valor padrao do paciente
    const p=pacientes.find(x=>x.id===sel.value);
    if(p?.valorPadrao) document.getElementById('pacote-valor-sessao').value=p.valorPadrao;
  }
  document.getElementById('modal-pacote').classList.add('open');
}

function atualizarValorPacote(){
  const n=parseInt(document.getElementById('pacote-total-sessoes').value)||0;
  const v=parseFloat(document.getElementById('pacote-valor-sessao').value)||0;
  if(n>0&&v>0) document.getElementById('pacote-valor-total').value=(n*v).toFixed(2);
}

function atualizarValorSessao(){
  const n=parseInt(document.getElementById('pacote-total-sessoes').value)||0;
  const t=parseFloat(document.getElementById('pacote-valor-total').value)||0;
  if(n>0&&t>0) document.getElementById('pacote-valor-sessao').value=(t/n).toFixed(2);
}

async function salvarPacote(){
  const pid=document.getElementById('pacote-paciente').value;
  const nome=document.getElementById('pacote-nome').value.trim();
  const total=parseInt(document.getElementById('pacote-total-sessoes').value)||0;
  const valorSessao=parseFloat(document.getElementById('pacote-valor-sessao').value)||0;
  const valorTotal=parseFloat(document.getElementById('pacote-valor-total').value)||0;
  if(!pid||!nome||total<1||valorTotal<=0){toast('Preencha todos os campos obrigatórios','error');return;}
  const obj={
    id: editPacoteId||Date.now().toString(),
    pacienteId:pid, nome, totalSessoes:total,
    valorSessao, valorTotal,
    valorRecebido: editPacoteId?(pacotes.find(x=>x.id===editPacoteId)?.valorRecebido||0):0,
    historicoPagamentos: editPacoteId?(pacotes.find(x=>x.id===editPacoteId)?.historicoPagamentos||[]):[],
    metodo:document.getElementById('pacote-metodo').value,
    status: editPacoteId?(pacotes.find(x=>x.id===editPacoteId)?.status||'ativo'):'ativo',
    obs:document.getElementById('pacote-obs').value.trim()
  };
  try{
    await dbSavePacote(obj,!editPacoteId);
    document.getElementById('modal-pacote').classList.remove('open');
    toast(editPacoteId?'Pacote atualizado!':'Pacote criado!');
    editPacoteId=null;
    await dbLoadPacotes();
    await loadData();
    renderPacotes();
  } catch(e){ toast('Erro: '+e.message,'error'); }
}

async function delPacote(id){
  if(!confirm('Remover este pacote? As sessões vinculadas serão desvinculadas.')) return;
  try{
    await dbDeletePacote(id);
    toast('Pacote removido.');
    await dbLoadPacotes();
    await loadData();
    renderPacotes();
  } catch(e){ toast('Erro: '+e.message,'error'); }
}

async function reativarPacote(id){
  if(!confirm('Reativar este pacote?')) return;
  const {data,error}=await _sb.from('pacotes').update({status:'ativo'}).eq('id',id).eq('user_id',currentUser.id).select('id');
  if(error){toast('Erro: '+error.message,'error');return;}
  if(!data||!data.length){toast('Não foi possível reativar. Tente recarregar a página.','error');return;}
  toast('Pacote reativado!');
  await dbLoadPacotes();
  renderPacotes();
}

async function concluirPacote(id){
  const pac = pacotes.find(x=>x.id===id);
  if(!pac) return;
  const realizadas = sessoesRealizadas(id).length;
  const total = pac.totalSessoes||0;
  const msg = realizadas < total
    ? `Atenção: apenas ${realizadas} de ${total} sessões foram realizadas.\nDeseja marcar como concluído mesmo assim?`
    : `Marcar pacote como concluído? (${realizadas}/${total} sessões realizadas)`;
  if(!confirm(msg)) return;
  const {data,error}=await _sb.from('pacotes').update({status:'concluido'}).eq('id',id).eq('user_id',currentUser.id).select('id');
  if(error){toast('Erro: '+error.message,'error');return;}
  if(!data||!data.length){toast('Não foi possível concluir. Tente recarregar a página.','error');return;}
  toast('Pacote concluído!');
  await dbLoadPacotes();
  renderPacotes();
}

function populatePacoteFilters(){
  const pp=document.getElementById('pacote-filtro-paciente');
  const cur=pp.value;
  pp.innerHTML='<option value="">Todos os pacientes</option>'+pacientes.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  if(cur) pp.value=cur;
}

function renderPacotes(){
  populatePacoteFilters();
  const fpid=document.getElementById('pacote-filtro-paciente').value;
  const fsta=document.getElementById('pacote-filtro-status').value;
  let list=[...pacotes];
  if(fpid) list=list.filter(p=>p.pacienteId===fpid);
  if(fsta) list=list.filter(p=>p.status===fsta);

  // métricas globais
  const ativos=pacotes.filter(p=>p.status==='ativo');
  const totalRecPacotes=pacotes.reduce((s,p)=>s+parseFloat(p.valorRecebido||0),0);
  const totalPendPacotes=pacotes.filter(p=>p.status==='ativo').reduce((s,p)=>s+parseFloat(p.valorTotal||0)-parseFloat(p.valorRecebido||0),0);
  document.getElementById('pac-metrics').innerHTML=`
    <div class="metric-card green"><div class="mc-label">Pacotes ativos</div><div class="mc-value">${ativos.length}</div></div>
    <div class="metric-card green"><div class="mc-label">Total recebido (pacotes)</div><div class="mc-value" style="font-size:18px">${brl(totalRecPacotes)}</div></div>
    <div class="metric-card amber"><div class="mc-label">A receber (pacotes)</div><div class="mc-value" style="font-size:18px;color:var(--amber)">${brl(totalPendPacotes)}</div></div>`;

  const el=document.getElementById('pacotes-lista');
  if(!list.length){
    el.innerHTML='<div class="empty"><i class="ti ti-package"></i><p>Nenhum pacote encontrado</p></div>';
    return;
  }
  el.innerHTML=list.map(p=>{
    const realizadas=sessoesRealizadas(p.id).length;
    const pct=p.totalSessoes>0?Math.round(realizadas/p.totalSessoes*100):0;
    const saldo=parseFloat(p.valorTotal||0)-parseFloat(p.valorRecebido||0);
    const statusCor={ativo:'var(--green)',concluido:'var(--text2)',cancelado:'var(--red)'}[p.status]||'var(--text2)';
    const statusLabel={ativo:'Ativo',concluido:'Concluído',cancelado:'Cancelado'}[p.status]||p.status;
    const hist=p.historicoPagamentos||[];
    const ultimoPag=hist.length?`Último pagamento: ${fmtData(hist[hist.length-1].data)}`:'Nenhum pagamento registrado';
    return `<div class="card" style="margin-bottom:12px;padding:18px 20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <div class="pav" style="width:36px;height:36px;flex-shrink:0">${iniciais(nomePac(p.pacienteId))}</div>
            <div>
              <div style="font-weight:700;font-size:15px">${esc(p.nome)}</div>
              <div style="font-size:12px;color:var(--text2)">${esc(nomePac(p.pacienteId))}</div>
            </div>
            <span style="margin-left:4px;font-size:11px;font-weight:600;color:${statusCor};background:${statusCor}18;padding:2px 8px;border-radius:20px">${statusLabel}</span>
          </div>
          <!-- barra de progresso -->
          <div style="margin:10px 0 6px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:4px">
              <span><strong style="color:var(--text1)">${realizadas}</strong> de ${p.totalSessoes} sessões realizadas</span>
              <span>${pct}%</span>
            </div>
            <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden">
              <div style="background:var(--green);height:100%;width:${pct}%;border-radius:99px;transition:width .3s"></div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text3)">${ultimoPag}</div>
          ${p.obs?`<div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic">${esc(p.obs)}</div>`:''}
        </div>
        <!-- valores -->
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:160px">
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text3)">Valor do pacote</div>
            <div style="font-weight:700;font-size:16px">${brl(p.valorTotal)}</div>
            <div style="font-size:11px;color:var(--text3)">${brl(p.valorSessao)}/sessão</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text3)">Recebido</div>
            <div style="font-weight:600;color:var(--green)">${brl(p.valorRecebido)}</div>
          </div>
          ${saldo>0?`<div style="text-align:right"><div style="font-size:11px;color:var(--text3)">Saldo</div><div style="font-weight:600;color:var(--amber)">${brl(saldo)}</div></div>`:''}
          <div style="display:flex;gap:6px;margin-top:4px">
            <button class="btn btn-ghost btn-sm" style="color:var(--green)" title="Pagamentos" onclick="abrirHistoricoPacote('${p.id}')"><i class="ti ti-cash"></i></button>
            ${p.status!=='concluido'?`<button class="btn btn-ghost btn-sm" title="Marcar como concluído" onclick="concluirPacote('${p.id}')" style="color:var(--text2)"><i class="ti ti-circle-check"></i></button>`:`<button class="btn btn-ghost btn-sm" title="Reativar pacote" onclick="reativarPacote('${p.id}')" style="color:var(--amber)"><i class="ti ti-refresh"></i></button>`}
            <button class="btn btn-ghost btn-sm" title="Editar" onclick="openModalPacote('${p.id}')"><i class="ti ti-edit"></i></button>
            <button class="btn btn-ghost btn-sm" title="Remover" onclick="delPacote('${p.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Histórico de pagamentos do PACOTE
let _hpacoteId = null;

function abrirHistoricoPacote(pacoteId){
  _hpacoteId = pacoteId;
  const p = pacotes.find(x=>x.id===pacoteId);
  if(!p) return;
  document.getElementById('hpag-paciente-nome').textContent = nomePac(p.pacienteId)+' — '+p.nome;
  document.getElementById('hpag-data').value = today();
  document.getElementById('hpag-valor').value = '';
  document.getElementById('hpag-metodo').value = p.metodo||'Pix';
  document.getElementById('hpag-obs').value = '';
  // reutiliza o modal de histórico mas em modo pacote
  _hpagAtendId = null; // garante que não confunde com atendimento
  renderHistoricoPacoteLista(p);
  document.getElementById('modal-hpag').classList.add('open');
}

function renderHistoricoPacoteLista(p){
  const hist = p.historicoPagamentos||[];
  const totalPago = hist.reduce((s,x)=>s+parseFloat(x.valor||0),0);
  const saldo = parseFloat(p.valorTotal||0)-totalPago;
  document.getElementById('hpag-resumo').innerHTML=`
    <div class="metric-card" style="flex:1;padding:10px 14px"><div class="mc-label" style="font-size:11px">Valor do pacote</div><div style="font-weight:700;font-size:15px">${brl(p.valorTotal)}</div></div>
    <div class="metric-card green" style="flex:1;padding:10px 14px"><div class="mc-label" style="font-size:11px">Recebido</div><div style="font-weight:700;font-size:15px;color:var(--green)">${brl(totalPago)}</div></div>
    <div class="metric-card ${saldo>0?'amber':'green'}" style="flex:1;padding:10px 14px"><div class="mc-label" style="font-size:11px">Saldo</div><div style="font-weight:700;font-size:15px;color:var(--${saldo>0?'amber':'green'})">${brl(saldo)}</div></div>`;
  if(!hist.length){
    document.getElementById('hpag-lista').innerHTML='<div style="text-align:center;color:var(--text3);padding:12px;font-size:13px">Nenhum pagamento registrado</div>';
    return;
  }
  document.getElementById('hpag-lista').innerHTML=`
    <table class="pay-table" style="font-size:13px">
      <thead><tr><th>Data</th><th>Valor</th><th>Método</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${hist.map(x=>`<tr>
        <td style="font-weight:500">${fmtData(x.data)}</td>
        <td style="color:var(--green);font-weight:600">${brl(x.valor)}</td>
        <td style="color:var(--text2)">${esc(x.metodo||'—')}</td>
        <td style="color:var(--text3);font-size:12px">${esc(x.obs||'')}</td>
        <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="removerPagamentoPacote('${x.id}')" style="color:var(--red)" title="Remover"><i class="ti ti-trash"></i></button></td>
      </tr>`).join('')}</tbody>
    </table>`;
}

async function adicionarPagamentoHistorico(){
  // decide se é pacote ou atendimento
  if(_hpacoteId) return adicionarPagamentoPacote();
  if(!_hpagAtendId) return;
  const a = atendimentos.find(x=>x.id===_hpagAtendId);
  if(!a) return;
  const dataPag = document.getElementById('hpag-data').value;
  const valorPag = parseFloat(document.getElementById('hpag-valor').value)||0;
  const metodo = document.getElementById('hpag-metodo').value;
  const obs = document.getElementById('hpag-obs').value.trim();
  if(!dataPag||valorPag<=0){ toast('Preencha data e valor','error'); return; }
  const totalAtual = (a.historicoPagamentos||[]).reduce((s,p)=>s+parseFloat(p.valor||0),0);
  if(totalAtual+valorPag > parseFloat(a.valor||0)+0.01){ toast('Total dos pagamentos superaria o valor da sessão','error'); return; }
  const novoHist = [...(a.historicoPagamentos||[]), {id:Date.now().toString(), data:dataPag, valor:valorPag, metodo, obs}];
  const novoTotal = novoHist.reduce((s,p)=>s+parseFloat(p.valor||0),0);
  const novoStatus = novoTotal >= parseFloat(a.valor||0)-0.01 ? 'pago' : 'parcial';
  const { error } = await _sb.from('atendimentos').update({
    historico_pagamentos: novoHist, valor_recebido: novoTotal, status: novoStatus, data_pagamento: dataPag
  }).eq('id', _hpagAtendId).eq('user_id', currentUser.id);
  if(error){ toast('Erro ao salvar: '+error.message,'error'); return; }
  toast('Pagamento registrado!');
  document.getElementById('hpag-valor').value='';
  document.getElementById('hpag-obs').value='';
  await loadData();
  renderDashboard();
  renderHistoricoLista(atendimentos.find(x=>x.id===_hpagAtendId));
  const activePage=[...document.querySelectorAll('.page.active')][0]?.id;
  if(activePage==='page-pagamentos'){populatePayFilters();renderPagamentos();}
}

async function adicionarPagamentoPacote(){
  const p = pacotes.find(x=>x.id===_hpacoteId);
  if(!p) return;
  const dataPag = document.getElementById('hpag-data').value;
  const valorPag = parseFloat(document.getElementById('hpag-valor').value)||0;
  const metodo = document.getElementById('hpag-metodo').value;
  const obs = document.getElementById('hpag-obs').value.trim();
  if(!dataPag||valorPag<=0){ toast('Preencha data e valor','error'); return; }
  const totalAtual = (p.historicoPagamentos||[]).reduce((s,x)=>s+parseFloat(x.valor||0),0);
  if(totalAtual+valorPag > parseFloat(p.valorTotal||0)+0.01){ toast('Total superaria o valor do pacote','error'); return; }
  const novoHist = [...(p.historicoPagamentos||[]), {id:Date.now().toString(), data:dataPag, valor:valorPag, metodo, obs}];
  const novoTotal = novoHist.reduce((s,x)=>s+parseFloat(x.valor||0),0);
  const {error} = await _sb.from('pacotes').update({
    historico_pagamentos: novoHist, valor_recebido: novoTotal
  }).eq('id', _hpacoteId).eq('user_id', currentUser.id);
  if(error){ toast('Erro: '+error.message,'error'); return; }
  toast('Pagamento registrado!');
  document.getElementById('hpag-valor').value='';
  document.getElementById('hpag-obs').value='';
  await dbLoadPacotes();
  renderHistoricoPacoteLista(pacotes.find(x=>x.id===_hpacoteId));
  renderDashboard();
  const activePage=[...document.querySelectorAll('.page.active')][0]?.id;
  if(activePage==='page-pacotes') renderPacotes();
}

async function removerPagamentoPacote(pagId){
  const p = pacotes.find(x=>x.id===_hpacoteId);
  if(!p) return;
  if(!confirm('Remover este pagamento?')) return;
  const novoHist = (p.historicoPagamentos||[]).filter(x=>x.id!==pagId);
  const novoTotal = novoHist.reduce((s,x)=>s+parseFloat(x.valor||0),0);
  const {error} = await _sb.from('pacotes').update({
    historico_pagamentos: novoHist, valor_recebido: novoTotal
  }).eq('id', _hpacoteId).eq('user_id', currentUser.id);
  if(error){ toast('Erro: '+error.message,'error'); return; }
  toast('Pagamento removido.');
  await dbLoadPacotes();
  renderHistoricoPacoteLista(pacotes.find(x=>x.id===_hpacoteId));
  renderDashboard();
  const activePage=[...document.querySelectorAll('.page.active')][0]?.id;
  if(activePage==='page-pacotes') renderPacotes();
}
