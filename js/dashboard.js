// ── DASHBOARD ────────────────────────────────────────────
// Retorna a data relevante para filtros financeiros:
// - pago com histórico → data do último pagamento
// - parcial com histórico → data do atendimento (ainda em aberto)
// - sem histórico → data do atendimento
function dataEfetiva(a){
  if(a.status==='pago'){
    const hist=a.historicoPagamentos||[];
    if(hist.length) return hist[hist.length-1].data||a.data;
    if(a.dataPagamento) return a.dataPagamento;
  }
  return a.data;
}

function renderDashboard(){
  const now = today();
  const thisMonth = now.substring(0,7);
  // sessões avulsas (sem pacote) para métricas individuais
  const mesAtends = atendimentos.filter(a=>!a.pacoteId&&a.data&&a.data.startsWith(thisMonth));
  const totalMes = mesAtends.reduce((s,a)=>s+parseFloat(a.valor||0),0);
  // recebido este mês: sessões avulsas + entradas de pacotes com data neste mês
  const recebidoMes = atendimentos.filter(a=>!a.pacoteId).reduce((s,a)=>{
    const hist=a.historicoPagamentos||[];
    if(hist.length){
      return s+hist.filter(p=>p.data&&p.data.startsWith(thisMonth))
                   .reduce((ss,p)=>ss+parseFloat(p.valor||0),0);
    }
    const pagDate = a.dataPagamento || a.data;
    if(a.status==='pago'&&pagDate&&pagDate.startsWith(thisMonth)) return s+parseFloat(a.valor||0);
    if(a.status==='parcial'&&pagDate&&pagDate.startsWith(thisMonth)) return s+parseFloat(a.valorRecebido||0);
    return s;
  },0) + pacotes.reduce((s,p)=>{
    return s+(p.historicoPagamentos||[]).filter(x=>x.data&&x.data.startsWith(thisMonth))
                                        .reduce((ss,x)=>ss+parseFloat(x.valor||0),0);
  },0);
  // exclui sessões vinculadas a pacotes das métricas individuais
  const avulsos = atendimentos.filter(a=>!a.pacoteId);
  const pendentes = avulsos.filter(a=>statusComVencimento(a)==='pendente');
  const atrasados = avulsos.filter(a=>statusComVencimento(a)==='atrasado');
  const parciais  = avulsos.filter(a=>statusComVencimento(a)==='parcial');
  const totalPendAvulso = [...pendentes,...atrasados,...parciais]
    .reduce((s,a)=>s+parseFloat(a.valor||0)-parseFloat(a.valorRecebido||0),0);
  const totalPendPacotes = pacotes.filter(p=>p.status==='ativo')
    .reduce((s,p)=>s+parseFloat(p.valorTotal||0)-parseFloat(p.valorRecebido||0),0);
  const totalPend = totalPendAvulso + totalPendPacotes;
  const qtdPacotesAtivos = pacotes.filter(p=>p.status==='ativo'&&(parseFloat(p.valorTotal||0)-parseFloat(p.valorRecebido||0))>0).length;

  document.getElementById('dash-metrics').innerHTML=`
    <div class="metric-card">
      <div class="mc-row">
        <span class="mc-label">Atendimentos este mês</span>
        <div class="mc-icon" style="background:var(--green-light)"><i class="ti ti-calendar-check" style="font-size:20px;color:var(--green)"></i></div>
      </div>
      <div class="mc-value">${mesAtends.length}</div>
      <div class="mc-sub">${pacientes.length} paciente${pacientes.length!==1?'s':''} ativos</div>
    </div>
    <div class="metric-card">
      <div class="mc-row">
        <span class="mc-label">Recebido este mês</span>
        <div class="mc-icon" style="background:#dcfce7"><i class="ti ti-cash" style="font-size:20px;color:#16a34a"></i></div>
      </div>
      <div class="mc-value" style="font-size:22px">${brl(recebidoMes)}</div>
      <div class="mc-sub">de ${brl(totalMes)} faturado</div>
    </div>
    <div class="metric-card">
      <div class="mc-row">
        <span class="mc-label">A receber</span>
        <div class="mc-icon" style="background:#fef9c3"><i class="ti ti-clock" style="font-size:20px;color:#ca8a04"></i></div>
      </div>
      <div class="mc-value" style="font-size:22px;color:var(--amber)">${brl(totalPend)}</div>
      <div class="mc-sub">${(()=>{const n=pendentes.length+atrasados.length+parciais.length;return n+' '+(n===1?'sessão avulsa':'sessões avulsas');})()} ${qtdPacotesAtivos>0?' · '+qtdPacotesAtivos+' pacote'+(qtdPacotesAtivos!==1?'s':''):''}</div>
    </div>
    <div class="metric-card">
      <div class="mc-row">
        <span class="mc-label">Atrasados</span>
        <div class="mc-icon" style="background:#fee2e2"><i class="ti ti-alert-circle" style="font-size:20px;color:var(--red)"></i></div>
      </div>
      <div class="mc-value" style="color:${atrasados.length?'var(--red)':'var(--text)'}">${atrasados.length}</div>
      <div class="mc-sub">${atrasados.length?brl(atrasados.reduce((s,a)=>s+parseFloat(a.valor||0),0))+'em aberto':'<span style="color:var(--green)"><i class="ti ti-circle-check"></i> Tudo em dia</span>'}</div>
    </div>`;


  // pagamentos recentes
  const recentes = [...atendimentos].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5);
  document.getElementById('dash-pagamentos-recentes').innerHTML = recentes.length
    ? recentes.map(a=>{
        const s=statusComVencimento(a);
        const cls=s==='atrasado'?'red':s==='pendente'?'amber':'';
        return `<div class="pending-item">
          <div class="pav ${cls}">${iniciais(nomePac(a.pacienteId))}</div>
          <div><div class="pi-name">${esc(nomePac(a.pacienteId))}</div><div class="pi-sub">${fmtData(a.data)} · ${a.metodo||'—'}${(()=>{if(!a.pacoteId) return ''; const pac=pacotes.find(x=>x.id===a.pacoteId); if(!pac) return ''; const sessoesPac=[...atendimentos].filter(x=>x.pacoteId===a.pacoteId&&x.status!=='cancelado').sort((x,y)=>x.data.localeCompare(y.data)); const idx=sessoesPac.findIndex(x=>x.id===a.id)+1; const faltam=pac.totalSessoes-idx; return ` · <i class="ti ti-package" style="font-size:11px"></i> ${esc(pac.nome)} · Sessão ${idx}/${pac.totalSessoes}${faltam>0?' · '+faltam+' faltando':''}`;})()}</div></div>
          <div class="pi-val ${cls==='red'?'late':cls==='amber'?'soon':''}">${brl(a.valor)}</div>
        </div>`;}).join('')
    : '<div class="empty" style="padding:1.5rem"><p>Sem atendimentos</p></div>';

  // pendentes/atrasados
  const criticos = [...atrasados,...pendentes].slice(0,5);
  document.getElementById('dash-pendentes').innerHTML = criticos.length
    ? criticos.map(a=>{
        const s=statusComVencimento(a);
        const cls=s==='atrasado'?'red':'amber';
        return `<div class="pending-item">
          <div class="pav ${cls}">${iniciais(nomePac(a.pacienteId))}</div>
          <div><div class="pi-name">${esc(nomePac(a.pacienteId))}</div><div class="pi-sub">${situacaoChip(a)}</div></div>
          <div class="pi-val ${cls==='red'?'late':'soon'}">${brl(a.valor)}</div>
        </div>`;}).join('')
    : '<div class="empty" style="padding:1.5rem"><i class="ti ti-circle-check" style="font-size:28px;color:var(--green);opacity:0.6;display:block;margin-bottom:6px"></i><p>Nenhum pagamento pendente</p></div>';

  renderCharts();
}

function renderCharts(){
  const now = new Date();
  const labels=[], data=[], barColors=[];
  const greens=['#10b981','#34d399','#6ee7b7','#a7f3d0','#d1fae5','#ecfdf5'];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    labels.push(['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]);
    data.push(atendimentos.filter(a=>a.data&&a.data.startsWith(ym)&&a.status==='pago').reduce((s,a)=>s+parseFloat(a.valor||0),0));
    barColors.push(greens[i]);
  }
  if(charts.receita) charts.receita.destroy();
  charts.receita = new Chart(document.getElementById('chart-receita'),{
    type:'bar',
    data:{labels,datasets:[{data,backgroundColor:barColors,borderRadius:10,borderSkipped:false,hoverBackgroundColor:barColors.map((_,i)=>greens[Math.max(0,i-1)])}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' R$ '+ctx.parsed.y.toLocaleString('pt-BR',{minimumFractionDigits:2})}}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>'R$'+v.toLocaleString('pt-BR'),font:{size:11}},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}},x:{grid:{display:false},ticks:{font:{size:12,weight:'600'}},border:{display:false}}}}
  });
  if(charts.metodos){charts.metodos.destroy();charts.metodos=null;}
}
