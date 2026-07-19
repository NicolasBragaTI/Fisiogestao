// ── RELATÓRIO ────────────────────────────────────────────
function populateRelMes(){
  const sel=document.getElementById('rel-mes');
  const cur=sel.value;
  const ms=meses();
  if(!ms.length){sel.innerHTML='<option value="">Sem dados</option>';return;}
  sel.innerHTML=ms.map(m=>`<option value="${m}">${fmtMes(m)}</option>`).join('');
  if(cur&&ms.includes(cur)) sel.value=cur; else sel.value=ms[0]||'';
}

function renderRelatorio(){
  const mes=document.getElementById('rel-mes').value;
  const list=atendimentos.filter(a=>!mes||a.data.startsWith(mes));
  // Recebido: usa dataPagamento (quando o dinheiro entrou) em vez da data do atendimento
  const pagos=atendimentos.filter(a=>{
    if(a.status!=='pago'&&a.status!=='parcial') return false;
    const pagDate=a.dataPagamento||a.data;
    return !mes||pagDate.startsWith(mes);
  });
  const recebidoTotal=pagos.reduce((s,a)=>s+(a.status==='pago'?parseFloat(a.valor||0):parseFloat(a.valorRecebido||0)),0);
  const pend=list.filter(a=>statusComVencimento(a)==='pendente');
  const atras=list.filter(a=>statusComVencimento(a)==='atrasado');
  document.getElementById('rel-metrics').innerHTML=`
    <div class="metric-card green"><div class="mc-label">Recebido</div><div class="mc-value" style="font-size:18px">${brl(recebidoTotal)}</div><div class="mc-sub">${pagos.length} atendimento${pagos.length!==1?'s':''}</div></div>
    <div class="metric-card amber"><div class="mc-label">Pendente</div><div class="mc-value" style="font-size:18px;color:var(--amber)">${brl(pend.reduce((s,a)=>s+parseFloat(a.valor||0),0))}</div><div class="mc-sub">${pend.length} em aberto</div></div>
    <div class="metric-card red"><div class="mc-label">Atrasado</div><div class="mc-value" style="font-size:18px;color:var(--red)">${brl(atras.reduce((s,a)=>s+parseFloat(a.valor||0),0))}</div><div class="mc-sub">${atras.length} vencido${atras.length!==1?'s':''}</div></div>`;
  const sorted=[...list].sort((a,b)=>a.data.localeCompare(b.data));
  const tbody=document.getElementById('rel-tbody');
  const empty=document.getElementById('rel-empty');
  if(!sorted.length){tbody.innerHTML='';document.getElementById('rel-tfoot').innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  tbody.innerHTML=sorted.map(a=>{
    const p=pacientes.find(x=>x.id===a.pacienteId);
    return `<tr>
      <td>${fmtData(a.data)}${a.hora?' '+a.hora:''}</td>
      <td style="font-weight:500">${esc(nomePac(a.pacienteId))}</td>
      <td style="color:var(--text2)">${p?p.end||'—':'—'}</td>
      <td>${a.metodo||'—'}</td>
      <td style="text-align:right;font-weight:600">${brl(a.valor)}</td>
      <td>${badgeHtml(statusComVencimento(a))}</td>
      <td style="color:var(--text2);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.obs||''}</td>
    </tr>`;}).join('');
  const total=list.reduce((s,a)=>s+parseFloat(a.valor||0),0);
  document.getElementById('rel-tfoot').innerHTML=`<tr><td colspan="4" style="font-weight:600;padding-top:12px;border-top:2px solid var(--border)">Total</td><td style="text-align:right;font-weight:700;color:var(--green);padding-top:12px;border-top:2px solid var(--border)">${brl(total)}</td><td colspan="2" style="border-top:2px solid var(--border)"></td></tr>`;
}

// ── EXPORTAR ─────────────────────────────────────────────
function exportarCSV(){
  const mes=(document.getElementById('rel-mes')||{}).value||(document.getElementById('pay-mes')||{}).value||'';
  const list=atendimentos.filter(a=>!mes||a.data.startsWith(mes));
  if(!list.length){toast('Nenhum dado para exportar','error');return;}
  const sorted=[...list].sort((a,b)=>a.data.localeCompare(b.data));
  const rows=[['Data','Horário','Paciente','Telefone','Endereço','Diagnóstico','Método','Valor','Vencimento','Status','Situação','Observações']];
  sorted.forEach(a=>{
    const p=pacientes.find(x=>x.id===a.pacienteId);
    rows.push([fmtData(a.data),a.hora||'',nomePac(a.pacienteId),p?p.tel||'':'',p?p.end||'':'',p?p.diag||'':'',a.metodo||'',parseFloat(a.valor||0).toFixed(2),fmtData(a.vencimento),a.status,statusComVencimento(a),a.obs||'']);
  });
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a2=document.createElement('a');
  a2.href=url;a2.download=`fisiogestao_${mes||'completo'}.csv`;a2.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado com sucesso!');
}
