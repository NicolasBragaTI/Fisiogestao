// ── MODAL ATENDIMENTO ────────────────────────────────────
function openModalAtend(id){
  editAtendId=id||null;
  document.getElementById('modal-atend-title').textContent=id?'Editar atendimento':'Novo atendimento';
  const sel=document.getElementById('atend-paciente');
  sel.innerHTML=pacientes.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  if(!pacientes.length){toast('Cadastre um paciente primeiro','error');return;}
  const t=today();
  if(id){
    const a=atendimentos.find(x=>x.id===id);
    sel.value=a.pacienteId;
    document.getElementById('atend-data').value=a.data;
    document.getElementById('atend-hora').value=a.hora||'';
    document.getElementById('atend-valor').value=a.valor||'';
    popularPacotesSelect(a.pacienteId, a.pacoteId||'');
  } else {
    sel.value=pacientes[0]?.id||'';
    popularPacotesSelect(sel.value);
    document.getElementById('atend-data').value=t;
    const horasIni=atendimentos.map(a=>a.hora).filter(Boolean);
    function mediaHora(horas){
      if(!horas.length) return '';
      const mins=horas.map(h=>{const[hh,mm]=h.split(':');return parseInt(hh)*60+parseInt(mm);});
      const avg=Math.round(mins.reduce((s,m)=>s+m,0)/mins.length/60)*60;
      return String(avg/60).padStart(2,'0')+':00';
    }
    document.getElementById('atend-hora').value=mediaHora(horasIni);
    const p=pacientes.find(x=>x.id===sel.value);
    document.getElementById('atend-valor').value=p?.valorPadrao||'';
  }
  document.getElementById('modal-atend').classList.add('open');
}
function preencherValorPadrao(){
  if(editAtendId) return;
  const pid=document.getElementById('atend-paciente').value;
  const p=pacientes.find(x=>x.id===pid);
  if(p?.valorPadrao) document.getElementById('atend-valor').value=p.valorPadrao;
  popularPacotesSelect(pid);
}

function popularPacotesSelect(pid, valorSelecionado=''){
  const sel=document.getElementById('atend-pacote');
  const ativos=pacotes.filter(x=>x.pacienteId===pid&&x.status==='ativo');
  sel.innerHTML='<option value="">Sessão avulsa</option>'+ativos.map(x=>{
    const feitas=sessoesRealizadas(x.id).length;
    return `<option value="${x.id}">${esc(x.nome)} (${feitas}/${x.totalSessoes} sessões)</option>`;
  }).join('');
  if(valorSelecionado) sel.value=valorSelecionado;
  aoSelecionarPacote();
}

function aoSelecionarPacote(){
  const pacoteId=document.getElementById('atend-pacote').value;
  const pac=pacoteId?pacotes.find(x=>x.id===pacoteId):null;
  if(pac){
    document.getElementById('atend-valor').value=pac.valorSessao||0;
  } else if(!editAtendId) {
    const pid=document.getElementById('atend-paciente').value;
    const p=pacientes.find(x=>x.id===pid);
    document.getElementById('atend-valor').value=p?.valorPadrao||'';
  }
}

function editAtend(id){openModalAtend(id);}

async function salvarAtend(){
  const pid=document.getElementById('atend-paciente').value;
  const data=document.getElementById('atend-data').value;
  const valor=document.getElementById('atend-valor').value;
  if(!pid||!data||!valor){toast('Preencha os campos obrigatórios (*)','error');return;}
  const valorNum=parseFloat(valor);
  const existing=editAtendId?atendimentos.find(x=>x.id===editAtendId):null;
  const pacoteId=document.getElementById('atend-pacote').value||null;
  let finalValor=valorNum;
  let finalStatus=existing?.status||'pendente';
  let finalRecebido=existing?.valorRecebido||0;
  let finalHist=existing?.historicoPagamentos||[];
  if(pacoteId){
    const pac=pacotes.find(x=>x.id===pacoteId);
    if(pac){
      finalValor=pac.valorSessao;
      if(!existing || existing.pacoteId!==pacoteId){
        finalRecebido=0;
        finalHist=[];
        finalStatus='em_pacote';
      }
    }
  } else if(existing?.status==='em_pacote'){
    finalStatus='pendente';
    finalRecebido=0;
    finalHist=[];
  } else if(!existing){
    finalStatus='pendente';
    finalRecebido=0;
    finalHist=[];
  }
  const metodo=existing?.metodo||'';
  const confirmationStatus=existing?.confirmationStatus||'pending';
  const horaFim=existing?.horaFim||'';
  const vencimento=existing?.vencimento||'';
  const obs=existing?.obs||'';
  if(!document.getElementById('atend-hora').value){
    toast('Informe a hora do atendimento','error');
    return;
    }
  const obj={
    id:editAtendId||Date.now().toString(),
    pacienteId:pid,data,
    hora:document.getElementById('atend-hora').value,
    horaFim,
    valor:finalValor,
    valorRecebido:finalRecebido,
    metodo,
    status:finalStatus,
    vencimento:pacoteId?'':vencimento,
    obs,
    historicoPagamentos:finalHist,
    pacoteId,
    confirmationStatus
  };
  try{
    await dbSaveAtend(obj, !editAtendId);

    // se sessão pertence a pacote, sincroniza pagamento automaticamente
    if(pacoteId){
      const pac = pacotes.find(x=>x.id===pacoteId);
      if(pac){
        // remove entrada anterior gerada por esta sessão (se existir)
        let novoHist = (pac.historicoPagamentos||[]).filter(p=>p.sessaoId!==obj.id);
        // sessão consumida do pacote (pago ou em_pacote) gera entrada no histórico
        if((finalStatus==='pago'||finalStatus==='em_pacote') && finalValor>0){
          novoHist = [...novoHist, {
            id: Date.now().toString(),
            sessaoId: obj.id,
            data: obj.data,
            valor: finalValor,
            metodo: finalStatus==='pago' ? metodo : '',
            obs: (finalStatus==='pago' ? 'Sessão paga' : 'Sessão consumida')+' – '+fmtData(obj.data)
          }];
        }
        const novoTotal = novoHist.reduce((s,p)=>s+parseFloat(p.valor||0),0);
        // auto-conclui se todas as sessões foram realizadas
        await loadData(); // garante contagem atualizada
        const pacFresh = pacotes.find(x=>x.id===pacoteId);
        const sessFeitasAposAtual = atendimentos.filter(a=>a.pacoteId===pacoteId&&(a.status==='pago'||a.status==='em_pacote')).length;
        const autoConclui = pacFresh?.status==='ativo' && sessFeitasAposAtual >= (pacFresh?.totalSessoes||0) && (pacFresh?.totalSessoes||0) > 0;
        const {error:errPac} = await _sb.from('pacotes').update({
          historico_pagamentos: novoHist,
          valor_recebido: novoTotal,
          ...(autoConclui ? {status:'concluido'} : {})
        }).eq('id', pacoteId).eq('user_id', currentUser.id);
        if(errPac){ toast('Erro ao atualizar pacote: '+errPac.message,'error'); console.error('pacote update error',errPac,{pacoteId,novoHist,novoTotal,finalStatus,finalValor}); }
        else if(autoConclui) toast('Pacote concluído! Todas as sessões foram realizadas. 🎉','success');
        console.log('sync pacote',{pacoteId,finalStatus,finalValor,novoHist,novoTotal});
      }
    }

    document.getElementById('modal-atend').classList.remove('open');
    toast(editAtendId?'Atendimento atualizado!':'Atendimento registrado!');
    editAtendId=null;
    await loadData();
    renderDashboard();
    const activePage=[...document.querySelectorAll('.page.active')][0]?.id;
    if(activePage==='page-pagamentos'){populatePayFilters();renderPagamentos();}
    if(activePage==='page-agenda') renderAgenda();
    if(activePage==='page-pacientes') renderPacientes();
    if(activePage==='page-pacotes') renderPacotes();
  } catch(e){ toast('Erro ao salvar: '+e.message,'error'); }
}

async function delAtend(id){
  if(!confirm('Remover este atendimento?')) return;
  try{
    // se pertence a pacote, remove entrada do histórico do pacote antes de deletar
    const atend = atendimentos.find(a=>a.id===id);
    if(atend?.pacoteId){
      const pac = pacotes.find(p=>p.id===atend.pacoteId);
      if(pac){
        const novoHist = (pac.historicoPagamentos||[]).filter(p=>p.sessaoId!==id);
        const novoTotal = novoHist.reduce((s,p)=>s+parseFloat(p.valor||0),0);
        await _sb.from('pacotes').update({
          historico_pagamentos: novoHist,
          valor_recebido: novoTotal
        }).eq('id',pac.id).eq('user_id',currentUser.id);
      }
    }
    await dbDeleteAtend(id);
    toast('Atendimento removido.');
    await loadData();
    renderDashboard();
    const activePage=[...document.querySelectorAll('.page.active')][0]?.id;
    if(activePage==='page-pagamentos'){populatePayFilters();renderPagamentos();}
    if(activePage==='page-agenda') renderAgenda();
    if(activePage==='page-pacotes') renderPacotes();
  } catch(e){ toast('Erro ao remover: '+e.message,'error'); }
}
