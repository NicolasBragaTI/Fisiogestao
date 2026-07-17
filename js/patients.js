// ── PACIENTES ────────────────────────────────────────────
function saldoPaciente(pid){
  return atendimentos
    .filter(a=>a.pacienteId===pid)
    .filter(a=>['pendente','parcial','atrasado'].includes(statusComVencimento(a)))
    .reduce((s,a)=>s+parseFloat(a.valor||0)-parseFloat(a.valorRecebido||0),0);
}

function renderPacientes(){
  const el=document.getElementById('pac-list');
  if(!pacientes.length){el.innerHTML='<div class="empty"><i class="ti ti-users"></i><p>Nenhum paciente cadastrado</p></div>';return;}
  const isMobile=window.innerWidth<=768;
  if(isMobile){
    el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">${pacientes.map(p=>{
      const sess=atendimentos.filter(a=>a.pacienteId===p.id);
      return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)">
        <div class="pav" style="flex-shrink:0">${iniciais(p.nome)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${esc(p.nome)}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${esc(p.diag)||'—'}${p.nasc?' · '+calcIdade(p.nasc)+' anos':''}</div>
          <div style="font-size:12px;color:var(--green);font-weight:600;margin-top:3px">${p.valorPadrao?brl(p.valorPadrao)+'/sessão':''} <span style="color:var(--text3);font-weight:400">${sess.length} sess.</span></div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="verPaciente('${p.id}')"><i class="ti ti-eye"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="editPaciente('${p.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="delPaciente('${p.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>
        </div>
      </div>`;}).join('')}</div>`;
  } else {
    el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">
      <table class="pay-table">
        <thead><tr><th>Paciente</th><th>Diagnóstico</th><th style="text-align:right">Valor/Sessão</th><th style="text-align:right">Sessões</th><th>Telefone</th><th></th></tr></thead>
        <tbody>${pacientes.map(p=>{
          const sess=atendimentos.filter(a=>a.pacienteId===p.id);
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:10px"><div class="pav">${iniciais(p.nome)}</div><div><div style="font-weight:600">${esc(p.nome)}</div><div style="font-size:12px;color:var(--text3)">${p.nasc?calcIdade(p.nasc)+' anos':''}</div></div></div></td>
            <td style="color:var(--text2)">${esc(p.diag)||'—'}</td>
            <td style="text-align:right;font-weight:600;color:var(--green)">${p.valorPadrao?brl(p.valorPadrao):'—'}</td>
            <td style="text-align:right;font-weight:500">${sess.length}</td>
            <td>${p.tel||'—'}</td>
            <td style="text-align:right">
              <button class="btn btn-ghost btn-sm" onclick="verPaciente('${p.id}')"><i class="ti ti-eye"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="editPaciente('${p.id}')"><i class="ti ti-edit"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="delPaciente('${p.id}')" style="color:var(--red)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>`;}).join('')}
        </tbody>
      </table></div>`;
  }
}

function abrirPagamentoPaciente(pid){
  const p=pacientes.find(x=>x.id===pid);
  const saldo=saldoPaciente(pid);
  document.getElementById('ppag-nome').textContent=p.nome;
  document.getElementById('ppag-saldo').textContent=brl(saldo);
  document.getElementById('ppag-valor').value='';
  document.getElementById('ppag-valor').max=saldo;
  document.getElementById('modal-ppag').dataset.pid=pid;
  document.getElementById('modal-ppag').classList.add('open');
}

async function confirmarPagamentoPaciente(){
  const modal=document.getElementById('modal-ppag');
  const pid=modal.dataset.pid;
  const valor=parseFloat(document.getElementById('ppag-valor').value)||0;
  if(!valor||valor<=0){toast('Informe o valor recebido','error');return;}

  // pegar sessões pendentes/parciais/atrasadas ordenadas por data (mais antigas primeiro)
  const pendentes=atendimentos
    .filter(a=>a.pacienteId===pid&&['pendente','parcial','atrasado'].includes(statusComVencimento(a)))
    .sort((a,b)=>a.data.localeCompare(b.data));

  let restante=valor;
  try{
    for(const a of pendentes){
      if(restante<=0) break;
      const saldoSessao=parseFloat(a.valor||0)-parseFloat(a.valorRecebido||0);
      if(restante>=saldoSessao){
        a.valorRecebido=parseFloat(a.valor||0);
        a.status='pago';
        a.dataPagamento=today();
        restante-=saldoSessao;
      } else {
        a.valorRecebido=(parseFloat(a.valorRecebido||0)+restante);
        a.status='parcial';
        a.dataPagamento=today();
        restante=0;
      }
      await dbSaveAtend(a, false);
    }
    modal.classList.remove('open');
    toast('Pagamento registrado com sucesso!');
    await loadData();
    renderDashboard();
    renderPacientes();
    const apPag=[...document.querySelectorAll('.page.active')][0]?.id;
    if(apPag==='page-pagamentos'){populatePayFilters();renderPagamentos();}
    if(apPag==='page-atendimentos'){populateAtFilters();renderAtendimentos();}
  }catch(e){
    toast('Erro ao salvar: '+e.message,'error');
  }
}

function calcIdade(nasc){
  const d=new Date(nasc),n=new Date();
  let a=n.getFullYear()-d.getFullYear();
  if(n<new Date(n.getFullYear(),d.getMonth(),d.getDate())) a--;
  return a;
}

// ── MODAL PACIENTE ───────────────────────────────────────
function openModalPaciente(id){
  editPacId=id||null;
  document.getElementById('modal-pac-title').textContent=id?'Editar paciente':'Novo paciente';
  const fields=['pac-nome','pac-tel','pac-nasc','pac-end','pac-diag','pac-valor','pac-obs'];
  if(id){
    const p=pacientes.find(x=>x.id===id);
    document.getElementById('pac-nome').value=p.nome;
    document.getElementById('pac-tel').value=p.tel||'';
    document.getElementById('pac-nasc').value=p.nasc||'';
    document.getElementById('pac-end').value=p.end||'';
    document.getElementById('pac-diag').value=p.diag||'';
    document.getElementById('pac-valor').value=p.valorPadrao||'';
    document.getElementById('pac-obs').value=p.obs||'';
  } else {
    fields.forEach(f=>document.getElementById(f).value='');
  }
  document.getElementById('modal-pac').classList.add('open');
}

function editPaciente(id){openModalPaciente(id);}

async function salvarPaciente(){
  const nome=document.getElementById('pac-nome').value.trim();
  if(!nome){toast('Informe o nome do paciente','error');return;}
  const obj={
    id:editPacId||Date.now().toString(),nome,
    tel:document.getElementById('pac-tel').value,
    nasc:document.getElementById('pac-nasc').value,
    end:document.getElementById('pac-end').value,
    diag:document.getElementById('pac-diag').value,
    valorPadrao:document.getElementById('pac-valor').value,
    obs:document.getElementById('pac-obs').value
  };
  try{
    await dbSavePaciente(obj, !editPacId);
    document.getElementById('modal-pac').classList.remove('open');
    toast(editPacId?'Paciente atualizado!':'Paciente cadastrado!');
    editPacId=null;
    await loadData();
    renderPacientes();
    renderDashboard();
  } catch(e){ toast('Erro ao salvar: '+e.message,'error'); }
}

async function delPaciente(id){
  const total=atendimentos.filter(a=>a.pacienteId===id).length;
  if(!confirm(total?`Este paciente tem ${total} atendimento(s). Remover mesmo assim?`:'Remover este paciente?')) return;
  try{
    await dbDeletePaciente(id);
    toast('Paciente removido.');
    await loadData();
    renderPacientes();
    renderDashboard();
  } catch(e){ toast('Erro ao remover: '+e.message,'error'); }
}

function verPaciente(id){
  const p=pacientes.find(x=>x.id===id);if(!p) return;
  const sess=atendimentos.filter(a=>a.pacienteId===id).sort((a,b)=>b.data.localeCompare(a.data));
  const totalPago=sess.filter(a=>a.status==='pago').reduce((s,a)=>s+parseFloat(a.valor||0),0);
  const totalPend=sess.filter(a=>statusComVencimento(a)!=='pago'&&statusComVencimento(a)!=='cancelado').reduce((s,a)=>s+parseFloat(a.valor||0),0);
  document.getElementById('ver-title').textContent=p.nome;
  document.getElementById('ver-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${p.tel?`<div><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Telefone</div><div style="font-size:14px">${esc(p.tel)}</div></div>`:''}
      ${p.nasc?`<div><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Nascimento</div><div style="font-size:14px">${fmtData(p.nasc)} · ${calcIdade(p.nasc)} anos</div></div>`:''}
      ${p.end?`<div style="grid-column:1/-1"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Endereço</div><div style="font-size:14px">${esc(p.end)}</div></div>`:''}
      ${p.diag?`<div style="grid-column:1/-1"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Diagnóstico</div><div style="font-size:14px">${esc(p.diag)}</div></div>`:''}
      ${p.valorPadrao?`<div><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Valor/Sessão</div><div style="font-size:14px;font-weight:600;color:var(--green)">${brl(p.valorPadrao)}</div></div>`:''}
      ${p.obs?`<div style="grid-column:1/-1"><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Observações</div><div style="font-size:13px;color:var(--text2);line-height:1.5">${esc(p.obs)}</div></div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="metric-card green" style="padding:12px 14px"><div class="mc-label">Sessões</div><div class="mc-value">${sess.length}</div></div>
      <div class="metric-card green" style="padding:12px 14px"><div class="mc-label">Recebido</div><div class="mc-value" style="font-size:15px">${brl(totalPago)}</div></div>
      <div class="metric-card amber" style="padding:12px 14px"><div class="mc-label">Pendente</div><div class="mc-value" style="font-size:15px;color:var(--amber)">${brl(totalPend)}</div></div>
    </div>
    <div style="font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Últimas sessões</div>
    ${sess.slice(0,6).map(a=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:500">${fmtData(a.data)}${a.hora?' · '+a.hora:''}</div>
          <div style="font-size:12px;color:var(--text2)">${a.metodo||'—'}${a.vencimento?' · venc. '+fmtData(a.vencimento):''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600">${brl(a.valor)}</span>
          ${badgeHtml(statusComVencimento(a))}
        </div>
      </div>`).join('')}`;
  document.getElementById('modal-ver').classList.add('open');
}
