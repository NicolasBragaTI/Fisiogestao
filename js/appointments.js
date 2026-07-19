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
    document.getElementById('atend-hora-fim').value=a.horaFim||'';
    document.getElementById('atend-valor').value=a.valor||'';
    document.getElementById('atend-recebido').value=a.valorRecebido||'';
    document.getElementById('atend-metodo').value=a.metodo||'Pix';
    document.getElementById('atend-vencimento').value=a.vencimento||'';
    document.getElementById('atend-obs').value=a.obs||'';
    document.getElementById('atend-confirmacao').value=a.confirmationStatus||'pending';
    document.getElementById('atend-whatsapp-area').style.display='block';
    document.getElementById('atend-lembrete-info').textContent=a.reminderSentAt
      ? 'Último lembrete preparado em '+new Date(a.reminderSentAt).toLocaleString('pt-BR')+'.'
      : 'O WhatsApp será aberto com uma mensagem pronta para você confirmar o envio.';
    // popular pacote depois dos outros campos; aoSelecionarPacote vai reconstruir o select de status
    // mapeia em_pacote → pendente para o select simplificado de pacote
    const statusParaSelect = a.status==='em_pacote' ? 'pendente' : (a.status||'pago');
    popularPacotesSelect(a.pacienteId, a.pacoteId||'');
    document.getElementById('atend-status').value=statusParaSelect;
  } else {
    sel.value=pacientes[0]?.id||'';
    popularPacotesSelect(sel.value);
    document.getElementById('atend-data').value=t;
    const horasIni=atendimentos.map(a=>a.hora).filter(Boolean);
    const horasFim=atendimentos.map(a=>a.horaFim).filter(Boolean);
    function mediaHora(horas){
      if(!horas.length) return '';
      const mins=horas.map(h=>{const[hh,mm]=h.split(':');return parseInt(hh)*60+parseInt(mm);});
      const avg=Math.round(mins.reduce((s,m)=>s+m,0)/mins.length/60)*60;
      return String(avg/60).padStart(2,'0')+':00';
    }
    document.getElementById('atend-hora').value=mediaHora(horasIni);
    document.getElementById('atend-hora-fim').value=mediaHora(horasFim);
    const p=pacientes.find(x=>x.id===sel.value);
    document.getElementById('atend-valor').value=p?.valorPadrao||'';
    document.getElementById('atend-recebido').value='';
    document.getElementById('atend-metodo').value='Pix';
    document.getElementById('atend-status').value='pendente';
    document.getElementById('atend-vencimento').value='';
    document.getElementById('atend-obs').value='';
    document.getElementById('atend-confirmacao').value='pending';
    document.getElementById('atend-whatsapp-area').style.display='none';
  }
  calcSaldo();
  document.getElementById('modal-atend').classList.add('open');
}

function calcSaldo(){
  const valor=parseFloat(document.getElementById('atend-valor').value)||0;
  const recebido=parseFloat(document.getElementById('atend-recebido').value)||0;
  const saldo=valor-recebido;
  const box=document.getElementById('saldo-box');
  if(recebido>0&&saldo>0){
    box.style.display='block';
    document.getElementById('saldo-val').textContent=brl(saldo);
  } else {
    box.style.display='none';
  }
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
    document.getElementById('atend-recebido').value='0.00';
    const sel=document.getElementById('atend-status');
    sel.innerHTML='<option value="pendente">Pendente</option><option value="pago">Pago</option>';
    sel.value='pendente';
    // badge "pacote" ao lado do label do status
    const statusGrp=sel.closest('.form-group');
    if(!statusGrp.querySelector('.badge-pacote-label')){
      const badge=document.createElement('span');
      badge.className='badge-pacote-label';
      badge.style.cssText='margin-left:6px;font-size:11px;background:var(--green-light,#e6f4ea);color:var(--green);border-radius:4px;padding:2px 7px;font-weight:600;';
      badge.innerHTML='<i class="ti ti-package" style="font-size:11px"></i> Pacote';
      statusGrp.querySelector('label').appendChild(badge);
    }
    // campos de pagamento não se aplicam a sessões em pacote — oculta
    document.getElementById('atend-recebido').closest('.fg3').querySelectorAll('input,select').forEach(el=>{
      if(el.id!=='atend-valor') el.closest('.form-group').style.opacity='0.4';
    });
  } else {
    // restaura campos e preenche com valor padrão do paciente
    document.querySelectorAll('#modal-atend .form-group').forEach(el=>el.style.opacity='');
    const pid=document.getElementById('atend-paciente').value;
    const p=pacientes.find(x=>x.id===pid);
    document.getElementById('atend-valor').value=p?.valorPadrao||'';
    document.getElementById('atend-recebido').value='';
    // restaura opções completas de status
    const sel=document.getElementById('atend-status');
    sel.innerHTML='<option value="pago">Pago</option><option value="parcial">Parcial</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option>';
    sel.value='pendente';
    // remove badge pacote do label
    document.querySelector('.badge-pacote-label')?.remove();
  }
  calcSaldo();
}

function editAtend(id){openModalAtend(id);}

async function salvarAtend(){
  const pid=document.getElementById('atend-paciente').value;
  const data=document.getElementById('atend-data').value;
  const valor=document.getElementById('atend-valor').value;
  if(!pid||!data||!valor){toast('Preencha os campos obrigatórios (*)','error');return;}
  const recebido=parseFloat(document.getElementById('atend-recebido').value)||0;
  const valorNum=parseFloat(valor);
  let statusAuto=document.getElementById('atend-status').value;
  if(statusAuto!=='cancelado'){
    if(recebido>=valorNum&&valorNum>0) statusAuto='pago';
    else if(recebido>0) statusAuto='parcial';
  }
  const metodo=document.getElementById('atend-metodo').value;
  // herda histórico existente ao editar, ou cria primeiro entry ao criar com valor recebido
  let historicoPagamentos=[];
  if(editAtendId){
    const existing=atendimentos.find(x=>x.id===editAtendId);
    historicoPagamentos=existing?.historicoPagamentos||[];
    // se não há histórico mas há valorRecebido, cria entry retroativa
    if(!historicoPagamentos.length && recebido>0){
      historicoPagamentos=[{id:Date.now().toString(),data:existing?.dataPagamento||today(),valor:recebido,metodo,obs:''}];
    }
  } else if(recebido>0){
    historicoPagamentos=[{id:Date.now().toString(),data:today(),valor:recebido,metodo,obs:''}];
  }
  const pacoteId=document.getElementById('atend-pacote').value||null;
  // se vinculado a pacote: usa valor/sessao do pacote e status direto do select (sem sobrescrita por valor recebido)
  const statusSelect=document.getElementById('atend-status').value;
  let finalValor=valorNum, finalStatus=statusAuto, finalRecebido=recebido, finalHist=historicoPagamentos;
  if(pacoteId){
    const pac=pacotes.find(x=>x.id===pacoteId);
    if(pac){
      finalValor=pac.valorSessao;
      finalRecebido=0;
      finalHist=[];
      // status vem direto do select (só pago ou pendente para pacote)
      finalStatus = (statusSelect==='pago') ? 'pago' : (statusSelect==='cancelado' ? 'cancelado' : 'em_pacote');
    }
  }
  const obj={
    id:editAtendId||Date.now().toString(),
    pacienteId:pid,data,
    hora:document.getElementById('atend-hora').value,
    horaFim:document.getElementById('atend-hora-fim').value,
    valor:finalValor,
    valorRecebido:finalRecebido,
    metodo,
    status:finalStatus,
    vencimento:pacoteId?'':document.getElementById('atend-vencimento').value,
    obs:document.getElementById('atend-obs').value,
    historicoPagamentos:finalHist,
    pacoteId,
    confirmationStatus:document.getElementById('atend-confirmacao').value,
    reminderSentAt:editAtendId?(atendimentos.find(x=>x.id===editAtendId)?.reminderSentAt||''):''
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
    if(activePage==='page-atendimentos'){populateAtFilters();renderAtendimentos();}
    if(activePage==='page-pacientes') renderPacientes();
    if(activePage==='page-pacotes') renderPacotes();
  } catch(e){ toast('Erro ao salvar: '+e.message,'error'); }
}

function telefoneWhatsApp(numero){
  let digits=String(numero||'').replace(/\D/g,'');
  if(digits.startsWith('00')) digits=digits.slice(2);
  if(digits.length===10||digits.length===11) digits='55'+digits;
  return /^\d{12,13}$/.test(digits)?digits:'';
}

async function enviarLembreteWhatsApp(atendimentoId){
  const id=atendimentoId||editAtendId;
  if(!id){toast('Salve o atendimento antes de enviar o lembrete.','error');return;}
  const a=atendimentos.find(x=>x.id===id);
  const p=a&&pacientes.find(x=>x.id===a.pacienteId);
  if(!a||!p){toast('Atendimento ou paciente não encontrado.','error');return;}
  if(!p.whatsappConsent){toast('Registre a autorização de WhatsApp na ficha do paciente.','error');return;}
  const telefone=telefoneWhatsApp(p.tel);
  if(!telefone){toast('Cadastre um WhatsApp válido com DDD na ficha do paciente.','error');return;}
  const primeiroNome=p.nome.trim().split(/\s+/)[0];
  const mensagem=`Olá, ${primeiroNome}! Passando para lembrar do seu atendimento no dia ${fmtData(a.data)}${a.hora?' às '+a.hora:''}. Você pode confirmar sua presença, por favor?`;
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`,'_blank','noopener,noreferrer');
  a.reminderSentAt=new Date().toISOString();
  try{
    await dbSaveAtend(a,false);
    const info=document.getElementById('atend-lembrete-info');
    if(info&&editAtendId===id) info.textContent='Lembrete preparado agora. Confirme o envio no WhatsApp.';
    toast('WhatsApp aberto. Confirme o envio da mensagem.');
    await loadData();
    if(document.getElementById('page-atendimentos')?.classList.contains('active')) renderAtendimentos();
  }catch(e){toast('WhatsApp aberto, mas não foi possível registrar o lembrete: '+e.message,'error');}
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
    if(activePage==='page-atendimentos'){populateAtFilters();renderAtendimentos();}
    if(activePage==='page-pacotes') renderPacotes();
  } catch(e){ toast('Erro ao remover: '+e.message,'error'); }
}
