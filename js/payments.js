// ── PAGAMENTOS ───────────────────────────────────────────
function meses(){
  const set=new Set(atendimentos.map(a=>a.data&&a.data.substring(0,7)).filter(Boolean));
  return [...set].sort().reverse();
}

function populatePayFilters(){
  const ms=document.getElementById('pay-mes');
  const cur=ms.value;
  ms.innerHTML='<option value="">Todos os meses</option>'+meses().map(m=>`<option value="${m}">${fmtMes(m)}</option>`).join('');
  if(cur) ms.value=cur;
  const pp=document.getElementById('pay-paciente');
  const curP=pp.value;
  pp.innerHTML='<option value="">Todos os pacientes</option>'+pacientes.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  if(curP) pp.value=curP;
}

function populateAtFilters(){
  const ms=document.getElementById('at-mes');
  const cur=ms.value;
  ms.innerHTML='<option value="">Todos os meses</option>'+meses().map(m=>`<option value="${m}">${fmtMes(m)}</option>`).join('');
  if(cur) ms.value=cur;
  const pp=document.getElementById('at-paciente');
  const curP=pp.value;
  pp.innerHTML='<option value="">Todos os pacientes</option>'+pacientes.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  if(curP) pp.value=curP;
}

function limparFiltrosPag(){
  document.getElementById('pay-mes').value='';
  document.getElementById('pay-paciente').value='';
  document.getElementById('pay-status').value='';
  renderPagamentos();
}

function pagamentosDePacotes(){
  return pacotes.flatMap(p=>(p.historicoPagamentos||[]).map(pg=>({
    ...pg,
    id:`pacote-${p.id}-${pg.id}`,
    pacienteId:p.pacienteId,
    pacoteId:p.id,
    pacoteNome:p.nome,
    data:pg.data,
    valor:parseFloat(pg.valor||0),
    metodo:pg.metodo||p.metodo||'—',
    status:'pago',
    _tipo:'pagamento-pacote'
  })));
}

// ── HISTÓRICO DE PAGAMENTOS ──────────────────────────────
let _hpagAtendId = null;

function renderCelulaPagoEm(a){
  const hist = a.historicoPagamentos||[];
  if(!hist.length){
    return a.dataPagamento
      ? `<span style="color:var(--green);font-weight:500">${fmtData(a.dataPagamento)}</span>`
      : '<span style="color:var(--text3)">—</span>';
  }
  if(hist.length===1){
    return `<span style="color:var(--green);font-weight:500">${fmtData(hist[0].data)}</span>`;
  }
  return `<button onclick="abrirHistoricoPag('${a.id}')" style="background:none;border:none;cursor:pointer;color:var(--green);font-weight:500;font-size:12px;padding:0;display:flex;align-items:center;gap:4px"><i class="ti ti-history" style="font-size:14px"></i>${hist.length} pagamentos</button>`;
}

function abrirHistoricoPag(atendId){
  _hpagAtendId = atendId;
  const a = atendimentos.find(x=>x.id===atendId);
  if(!a) return;
  document.getElementById('hpag-paciente-nome').textContent = nomePac(a.pacienteId) + ' — Sessão de ' + fmtData(a.data);
  document.getElementById('hpag-data').value = today();
  document.getElementById('hpag-valor').value = '';
  document.getElementById('hpag-metodo').value = a.metodo||'Pix';
  document.getElementById('hpag-obs').value = '';
  renderHistoricoLista(a);
  document.getElementById('modal-hpag').classList.add('open');
}

function fecharHistoricoPag(){
  document.getElementById('modal-hpag').classList.remove('open');
  _hpagAtendId = null;
  _hpacoteId = null;
}

function renderHistoricoLista(a){
  const hist = a.historicoPagamentos||[];
  const totalPago = hist.reduce((s,p)=>s+parseFloat(p.valor||0),0);
  const saldo = parseFloat(a.valor||0) - totalPago;
  document.getElementById('hpag-resumo').innerHTML=`
    <div class="metric-card" style="flex:1;padding:10px 14px"><div class="mc-label" style="font-size:11px">Valor da sessão</div><div style="font-weight:700;font-size:15px">${brl(a.valor)}</div></div>
    <div class="metric-card green" style="flex:1;padding:10px 14px"><div class="mc-label" style="font-size:11px">Recebido</div><div style="font-weight:700;font-size:15px;color:var(--green)">${brl(totalPago)}</div></div>
    <div class="metric-card ${saldo>0?'amber':'green'}" style="flex:1;padding:10px 14px"><div class="mc-label" style="font-size:11px">Saldo</div><div style="font-weight:700;font-size:15px;color:var(--${saldo>0?'amber':'green'})">${brl(saldo)}</div></div>`;
  if(!hist.length){
    document.getElementById('hpag-lista').innerHTML='<div style="text-align:center;color:var(--text3);padding:12px;font-size:13px">Nenhum pagamento registrado</div>';
    return;
  }
  document.getElementById('hpag-lista').innerHTML=`
    <table class="pay-table" style="font-size:13px">
      <thead><tr><th>Data</th><th>Valor</th><th>Método</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${hist.map(p=>`<tr>
        <td style="font-weight:500">${fmtData(p.data)}</td>
        <td style="color:var(--green);font-weight:600">${brl(p.valor)}</td>
        <td style="color:var(--text2)">${esc(p.metodo||'—')}</td>
        <td style="color:var(--text3);font-size:12px">${esc(p.obs||'')}</td>
        <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="removerPagamentoHistorico('${p.id}')" style="color:var(--red)" title="Remover"><i class="ti ti-trash"></i></button></td>
      </tr>`).join('')}</tbody>
    </table>`;
}


function renderPagamentos(){
  const mes=document.getElementById('pay-mes').value;
  const pid=document.getElementById('pay-paciente').value;
  const sta=document.getElementById('pay-status').value;
  const btnLimpar=document.getElementById('pay-btn-limpar');
  if(btnLimpar) btnLimpar.style.display=(mes||pid||sta)?'inline-flex':'none';
  // Sessões vinculadas representam consumo do pacote, não um novo pagamento.
  // No lugar delas, exibe cada entrada efetivamente registrada no pacote.
  let list=[...atendimentos.filter(a=>!a.pacoteId),...pagamentosDePacotes()];
  // filtro de mês: pago → data efetiva (pagamento); pendente/parcial → data do atendimento
  if(mes) list=list.filter(a=>dataEfetiva(a)?.startsWith(mes));
  if(pid) list=list.filter(a=>a.pacienteId===pid);
  if(sta) list=list.filter(a=>statusComVencimento(a)===sta);

  // métricas (calculadas antes dos filtros de status, mas com filtros de mês/paciente)
  const base=atendimentos.filter(a=>!a.pacoteId&&(!mes||dataEfetiva(a)?.startsWith(mes))&&(!pid||a.pacienteId===pid));
  const pacotesFiltrados=pacotes.filter(p=>(!pid||p.pacienteId===pid));
  const pendenteAvulso=base.filter(a=>['pendente','parcial','atrasado'].includes(statusComVencimento(a)))
    .reduce((s,a)=>s+parseFloat(a.valor||0)-parseFloat(a.valorRecebido||0),0);
  const pendentePacotes=mes?0:pacotesFiltrados.filter(p=>p.status==='ativo')
    .reduce((s,p)=>s+Math.max(0,parseFloat(p.valorTotal||0)-parseFloat(p.valorRecebido||0)),0);
  const pendente=pendenteAvulso+pendentePacotes;
  const recebidoAvulso=base.reduce((s,a)=>{
    const hist=a.historicoPagamentos||[];
    if(hist.length){
      // soma só entradas cujo mês bate com o filtro
      return s+hist.filter(p=>!mes||p.data?.startsWith(mes))
                   .reduce((ss,p)=>ss+parseFloat(p.valor||0),0);
    }
    if(a.status==='pago') return s+parseFloat(a.valor||0);
    if(a.status==='parcial') return s+parseFloat(a.valorRecebido||0);
    return s;
  },0);
  const recebidoPacotes=pacotesFiltrados.reduce((s,p)=>s+(p.historicoPagamentos||[])
    .filter(pg=>!mes||pg.data?.startsWith(mes))
    .reduce((ss,pg)=>ss+parseFloat(pg.valor||0),0),0);
  const recebido=recebidoAvulso+recebidoPacotes;
  const atrasado=base.filter(a=>statusComVencimento(a)==='atrasado')
    .reduce((s,a)=>s+parseFloat(a.valor||0)-parseFloat(a.valorRecebido||0),0);
  document.getElementById('pay-metrics-bar').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em;font-weight:600">Pendente</span>
      <span style="font-size:16px;font-weight:700;color:var(--amber)">${brl(pendente)}</span>
    </div>
    <div style="width:1px;background:var(--border);align-self:stretch"></div>
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em;font-weight:600">Recebido</span>
      <span style="font-size:16px;font-weight:700;color:var(--green)">${brl(recebido)}</span>
    </div>
    <div style="width:1px;background:var(--border);align-self:stretch"></div>
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em;font-weight:600">Em atraso</span>
      <span style="font-size:16px;font-weight:700;color:var(--red)">${brl(atrasado)}</span>
    </div>`;
  const btnPagar = document.getElementById('pay-btn-pagar');
  btnPagar.style.display = (pid && pendente > 0) ? 'inline-flex' : 'none';
  list.sort((a,b)=>{
    const sa=statusComVencimento(a),sb=statusComVencimento(b);
    const ord={atrasado:0,parcial:1,pendente:2,pago:3,cancelado:4};
    if(ord[sa]!==ord[sb]) return ord[sa]-ord[sb];
    return (a.vencimento||a.data||'').localeCompare(b.vencimento||b.data||'');
  });
  const tbody=document.getElementById('pay-tbody');
  const empty=document.getElementById('pay-empty');
  if(!list.length){tbody.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const mobile=window.innerWidth<=768;
  // toggle table vs cards
  const tableWrap=tbody.closest('[style*="overflow-x"]');
  let cardList=document.getElementById('pay-card-list');
  if(!cardList){
    cardList=document.createElement('div');
    cardList.id='pay-card-list';
    tableWrap.parentNode.insertBefore(cardList,tableWrap.nextSibling);
  }
  if(mobile){
    tableWrap.style.display='none';
    cardList.innerHTML=list.map(a=>`
      <div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border)">
        <div class="pav" style="width:36px;height:36px;font-size:11px;flex-shrink:0">${iniciais(nomePac(a.pacienteId))}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${esc(nomePac(a.pacienteId))}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${fmtData(a.data)}${a.hora?' · '+a.hora:''} · ${a.metodo||'—'}${a._tipo==='pagamento-pacote'?' · '+esc(a.pacoteNome):''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-weight:700;font-size:14px">${brl(a.valor)}</div>
          <div style="margin-top:4px">${badgeHtml(statusComVencimento(a))}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
          ${a._tipo==='pagamento-pacote'
            ? `<button class="btn btn-ghost btn-sm" title="Ver pacote" onclick="navTo('pacotes',null)" style="color:var(--green)"><i class="ti ti-package"></i></button>`
            : `<button class="btn btn-ghost btn-sm" onclick="editAtend('${a.id}')"><i class="ti ti-edit"></i></button><button class="btn btn-ghost btn-sm" onclick="delAtend('${a.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>`}
        </div>
      </div>`).join('');
  } else {
    tableWrap.style.display='';
    cardList.innerHTML='';
    tbody.innerHTML=list.map(a=>`
      <tr style="${a.pacoteId?'opacity:0.85;':''}">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="pav" style="width:30px;height:30px;font-size:10px">${iniciais(nomePac(a.pacienteId))}</div>
            <div>
              <span style="font-weight:500">${esc(nomePac(a.pacienteId))}</span>
              ${a._tipo==='pagamento-pacote'?`<div style="font-size:11px;color:var(--green);display:flex;align-items:center;gap:3px"><i class="ti ti-package"></i>${esc(a.pacoteNome||'Pacote')}</div>`:''}
            </div>
          </div>
        </td>
        <td>${fmtData(a.data)}${a.hora?' <span style="color:var(--text3)">'+a.hora+'</span>':''}</td>
        <td style="text-align:right;font-weight:600">
          ${brl(a.valor)}
          ${a.valorRecebido>0&&a.valorRecebido<a.valor?`<div style="font-size:11px;color:var(--amber);font-weight:500">+${brl(a.valorRecebido)} · saldo ${brl(a.valor-a.valorRecebido)}</div>`:''}
        </td>
        <td><span style="color:var(--text2)">${a.metodo||'—'}</span></td>
        <td>${badgeHtml(statusComVencimento(a))}</td>
        <td style="text-align:right">
          ${a._tipo==='pagamento-pacote'
            ? `<button class="btn btn-ghost btn-sm" title="Ver pacote" onclick="navTo('pacotes',null)" style="color:var(--green)"><i class="ti ti-package"></i></button>`
            : `<button class="btn btn-ghost btn-sm" title="Histórico de pagamentos" onclick="abrirHistoricoPag('${a.id}')" style="color:var(--green)"><i class="ti ti-history"></i></button>`}
          <button class="btn btn-ghost btn-sm" title="Editar" onclick="editAtend('${a.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn btn-ghost btn-sm" title="Remover" onclick="delAtend('${a.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`).join('');
  }
}

function renderAtendimentos(){
  const mes=document.getElementById('at-mes').value;
  const pid=document.getElementById('at-paciente').value;
  let list=[...atendimentos];
  if(mes) list=list.filter(a=>a.data&&a.data.startsWith(mes));
  if(pid) list=list.filter(a=>a.pacienteId===pid);
  list.sort((a,b)=>b.data.localeCompare(a.data));
  const tbody=document.getElementById('at-tbody');
  const empty=document.getElementById('at-empty');
  if(!list.length){tbody.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const mobile=window.innerWidth<=768;
  const tableWrap=tbody.closest('[style*="overflow-x"]');
  let cardList=document.getElementById('at-card-list');
  if(!cardList){
    cardList=document.createElement('div');
    cardList.id='at-card-list';
    tableWrap.parentNode.insertBefore(cardList,tableWrap.nextSibling);
  }
  if(mobile){
    tableWrap.style.display='none';
    cardList.innerHTML=list.map(a=>`
      <div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border)">
        <div class="pav" style="width:36px;height:36px;font-size:11px;flex-shrink:0">${iniciais(nomePac(a.pacienteId))}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${esc(nomePac(a.pacienteId))}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${fmtData(a.data)}${a.hora?' · '+a.hora:''}</div>
          ${a.obs?`<div style="font-size:12px;color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${esc(a.obs)}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-weight:700;font-size:14px">${brl(a.valor)}</div>
          <div style="margin-top:4px">${badgeHtml(statusComVencimento(a))}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="editAtend('${a.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="delAtend('${a.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join('');
  } else {
    tableWrap.style.display='';
    cardList.innerHTML='';
    tbody.innerHTML=list.map(a=>`
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="pav" style="width:30px;height:30px;font-size:10px">${iniciais(nomePac(a.pacienteId))}</div><span style="font-weight:500">${esc(nomePac(a.pacienteId))}</span></div></td>
        <td>${fmtData(a.data)}</td>
        <td>${a.hora||'<span style="color:var(--text3)">—</span>'}</td>
        <td>${a.metodo||'—'}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2)">${a.obs||''}</td>
        <td style="text-align:right;font-weight:600">${brl(a.valor)}</td>
        <td>
          ${badgeHtml(statusComVencimento(a))}
          ${a.pacoteId?`<div style="font-size:11px;color:var(--green);margin-top:3px;display:flex;align-items:center;gap:3px"><i class="ti ti-package"></i>${esc(pacotes.find(x=>x.id===a.pacoteId)?.nome||'Pacote')}</div>`:''}
        </td>
        <td style="text-align:right">
          <button class="btn btn-ghost btn-sm" title="Editar" onclick="editAtend('${a.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn btn-ghost btn-sm" title="Remover" onclick="delAtend('${a.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`).join('');
  }
}
