// ── BUSCA GLOBAL ─────────────────────────────────────────
function globalSearch(){
  const q=document.getElementById('global-search').value.trim().toLowerCase();
  if(!q) return;
  const match=pacientes.filter(p=>p.nome.toLowerCase().includes(q));
  if(match.length===1) verPaciente(match[0].id);
}

// ── AGENDA ───────────────────────────────────────────────
let agendaBase = null; // segunda-feira da semana atual

const AGENDA_CORES = ['#1a6b3c','#2d9158','#1a6b9a','#7b4fa6','#c97c00','#d4455a','#2a8a7e','#5a7a2a'];
function corPaciente(pid){
  const idx = pacientes.findIndex(p=>p.id===pid);
  return AGENDA_CORES[idx % AGENDA_CORES.length] || '#1a6b3c';
}
function corStatus(a){
  const s = statusComVencimento(a);
  if(s==='pago') return '#10b981';
  if(s==='em_pacote') return '#3b82f6';
  if(s==='pendente') return '#f59e0b';
  if(s==='atrasado') return '#ef4444';
  if(s==='parcial') return '#8b5cf6';
  if(s==='cancelado') return '#94a3b8';
  return '#10b981';
}

let agendaView = 'mensal'; // 'diario' | 'semanal' | 'mensal'

function dateStr(d){ return d.toISOString().split('T')[0]; }

function atualizarBotoesView(){
  ['diario','semanal','mensal'].forEach(x=>{
    const btn = document.getElementById('vbtn-'+x);
    if(btn) btn.style.cssText = x===agendaView
      ? 'padding:4px 12px;font-size:12px;background:var(--green);color:#fff;border:none;border-radius:6px;cursor:pointer'
      : 'padding:4px 12px;font-size:12px;background:transparent;color:var(--text2);border:none;cursor:pointer';
  });
  const labels = {diario:'Hoje', semanal:'Esta semana', mensal:'Este mês'};
  const btnHoje = document.getElementById('btn-agenda-hoje');
  if(btnHoje) btnHoje.textContent = labels[agendaView]||'Hoje';
}
function setAgendaView(v){
  agendaView = v;
  atualizarBotoesView();
  renderAgenda();
}

function agendaNavAtual(){
  agendaBase = new Date();
  if(agendaView==='mensal') agendaBase.setDate(1);
  renderAgenda();
}
function agendaNavAnterior(){
  if(agendaView==='mensal') agendaBase.setMonth(agendaBase.getMonth()-1);
  else if(agendaView==='semanal') agendaBase.setDate(agendaBase.getDate()-7);
  else agendaBase.setDate(agendaBase.getDate()-1);
  renderAgenda();
}
function agendaNavProximo(){
  if(agendaView==='mensal') agendaBase.setMonth(agendaBase.getMonth()+1);
  else if(agendaView==='semanal') agendaBase.setDate(agendaBase.getDate()+7);
  else agendaBase.setDate(agendaBase.getDate()+1);
  renderAgenda();
}
// aliases antigos para compatibilidade
function semanaAtual(){ agendaBase = new Date(); if(agendaView==='mensal') agendaBase.setDate(1); renderAgenda(); }
function semanaAnterior(){ agendaNavAnterior(); }
function semanaProxima(){ agendaNavProximo(); }

function renderAgenda(){
  if(!agendaBase){ agendaBase = new Date(); }
  const mobile=window.innerWidth<=768;
  const rightPanel=document.getElementById('agenda-right-panel');
  if(rightPanel) rightPanel.style.display=mobile?'none':'';
  if(mobile){
    // sync mobile tabs
    ['diario','semanal','mensal'].forEach(v=>{
      const b=document.getElementById('amt-'+v);
      if(b) b.classList.toggle('active',v===agendaView);
    });
    atualizarBotoesView();
    if(agendaView==='diario') return renderAgendaDiariaMobile();
    if(agendaView==='semanal') return renderAgendaSemanalMobile();
    return renderAgendaMensalMobile();
  }
  atualizarBotoesView();
  if(agendaView==='diario') return renderAgendaDiaria();
  if(agendaView==='semanal') return renderAgendaSemanal();
  return renderAgendaMensal();
}

function renderAgendaDiariaMobile(){
  const agora=new Date();
  const hojeStr=dateStr(agora);
  const ds=dateStr(agendaBase);
  const isHoje=ds===hojeStr;
  const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DOWS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  document.getElementById('agenda-periodo').textContent=
    `${DOWS[agendaBase.getDay()]}, ${agendaBase.getDate()} de ${MESES[agendaBase.getMonth()]}`;

  const HOUR_H=64, START_H=7, END_H=21;
  const totalH=END_H-START_H;
  const totalPx=totalH*HOUR_H;
  const TIME_COL=38;

  const nowTop=((agora.getHours()-START_H)*60+agora.getMinutes())/60*HOUR_H;
  const showNow=isHoje&&agora.getHours()>=START_H&&agora.getHours()<END_H;

  const events=atendimentos.filter(a=>{
    if(a.data!==ds) return false;
    if(agendaFiltro) return nomePac(a.pacienteId).toLowerCase().includes(agendaFiltro);
    return true;
  });

  const cal=document.getElementById('agenda-cal');
  cal.style.cssText='overflow:visible;padding:0;';

  let html=`<div style="background:var(--surface);border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border)">
    <div style="display:flex;overflow-y:auto;max-height:calc(100svh - 200px);-webkit-overflow-scrolling:touch" id="gcal-scroll-dia">
      <div style="width:${TIME_COL}px;flex-shrink:0;position:relative;height:${totalPx}px;border-right:1px solid var(--border)">
        ${Array.from({length:totalH},(_,i)=>`
          <div style="position:absolute;top:${i*HOUR_H-7}px;left:0;right:0;text-align:right;padding-right:6px;font-size:10px;color:var(--text3);font-weight:500;line-height:1;white-space:nowrap">
            ${i===0?'':`${String(START_H+i).padStart(2,'0')}h`}
          </div>`).join('')}
      </div>
      <div style="flex:1;position:relative;height:${totalPx}px;background:${isHoje?'rgba(16,185,129,0.015)':''}">
        ${Array.from({length:totalH},(_,i)=>`
          <div style="position:absolute;top:${i*HOUR_H}px;left:0;right:0;height:${HOUR_H}px;border-top:1px solid var(--border);cursor:pointer" onclick="agendaClicarHora('${ds}','${String(START_H+i).padStart(2,'0')}:00')"></div>
          <div style="position:absolute;top:${i*HOUR_H+HOUR_H/2}px;left:0;right:0;border-top:1px dashed rgba(0,0,0,.06);pointer-events:none"></div>
        `).join('')}
        ${showNow?`
          <div style="position:absolute;top:${nowTop}px;left:0;right:0;height:2px;background:#ea4335;z-index:5;pointer-events:none">
            <div style="position:absolute;left:-4px;top:-4px;width:10px;height:10px;border-radius:50%;background:#ea4335"></div>
          </div>`:''}
        ${events.map(a=>{
          if(!a.hora) return '';
          const [hh,mm]=a.hora.split(':').map(Number);
          if(hh<START_H||hh>=END_H) return '';
          const top=((hh-START_H)*60+mm)/60*HOUR_H;
          let height=HOUR_H-3;
          if(a.horaFim){const [fh,fm]=a.horaFim.split(':').map(Number);height=Math.max(24,((fh-hh)*60+(fm-mm))/60*HOUR_H-3);}
          const cor=corStatus(a);
          const nome=nomePac(a.pacienteId);
          return `<div onclick="editAtend('${a.id}')"
            style="position:absolute;top:${top+2}px;height:${height}px;left:6px;right:6px;background:${cor};color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.15)">
            <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nome)}</div>
            ${height>=36?`<div style="font-size:11px;opacity:.85;margin-top:2px">${a.hora}${a.horaFim?' – '+a.horaFim:''}</div>`:''}
            ${height>=52?`<div style="font-size:11px;opacity:.75;margin-top:1px">${a.metodo||''}</div>`:''}
          </div>`;
        }).join('')}
        ${!events.length?`<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--text3);pointer-events:none">
          <i class="ti ti-calendar-off" style="font-size:32px;opacity:.25;display:block;margin-bottom:8px"></i>
          <div style="font-size:13px">Sem atendimentos</div>
        </div>`:''}
      </div>
    </div>
  </div>`;
  cal.innerHTML=html;

  requestAnimationFrame(()=>{
    const sc=document.getElementById('gcal-scroll-dia');
    if(sc){
      const scrollTo=showNow?Math.max(0,nowTop-100):(8-START_H)*HOUR_H;
      sc.scrollTop=scrollTo;
    }
  });
}

function agendaClicarHora(data,hora){
  openModalAtend();
  setTimeout(()=>{
    document.getElementById('atend-data').value=data;
    if(hora) document.getElementById('atend-hora').value=hora;
    const [hh,mm]=hora.split(':').map(Number);
    const fimH=String(hh+1).padStart(2,'0');
    document.getElementById('atend-hora-fim').value=`${fimH}:${String(mm).padStart(2,'0')}`;
  },50);
}

function renderAgendaMensalMobile(){
  if(!agendaBase){ agendaBase=new Date(); agendaBase.setDate(1); }
  const ano=agendaBase.getFullYear(), mes=agendaBase.getMonth();
  const hojeStr=dateStr(new Date());
  const NOMES_MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('agenda-periodo').textContent=`${NOMES_MESES[mes]} ${ano}`;
  const DOWS=['D','S','T','Q','Q','S','S'];
  const primeiroDia=new Date(ano,mes,1).getDay();
  const diasNoMes=new Date(ano,mes+1,0).getDate();
  const byDate={};
  atendimentos.forEach(a=>{
    if(a.data&&a.data.startsWith(`${ano}-${String(mes+1).padStart(2,'0')}`)){
      if(!byDate[a.data]) byDate[a.data]=[];
      byDate[a.data].push(a);
    }
  });
  let cells='';
  for(let i=0;i<primeiroDia;i++) cells+=`<div></div>`;
  for(let dia=1;dia<=diasNoMes;dia++){
    const ds=`${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const isHoje=ds===hojeStr;
    const evs=(byDate[ds]||[]);
    const dots=evs.slice(0,3).map(a=>`<div style="width:5px;height:5px;border-radius:50%;background:${corStatus(a)}"></div>`).join('');
    cells+=`<div style="display:flex;flex-direction:column;align-items:center;padding:4px 2px;cursor:pointer;border-radius:8px;background:${isHoje?'var(--green)':'transparent'}" onclick="agendaBase=new Date('${ds}');agendaView='diario';renderAgenda()">
      <span style="font-size:13px;font-weight:${isHoje?'700':'500'};color:${isHoje?'#fff':'var(--text)'};">${dia}</span>
      <div style="display:flex;gap:2px;min-height:6px;margin-top:2px">${dots}</div>
    </div>`;
  }
  document.getElementById('agenda-cal').innerHTML=`<div style="background:var(--surface);border-radius:var(--radius-lg);border:1px solid var(--border);overflow:hidden">
    <div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border);background:var(--surface2)">
      ${DOWS.map(d=>`<div style="text-align:center;padding:8px 2px;font-size:11px;font-weight:700;color:var(--text3)">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:6px">${cells}</div>
  </div>`;
}

function renderAgendaSemanalMobile(){
  const agora=new Date();
  const hojeStr=dateStr(agora);
  const inicio=new Date(agendaBase);
  inicio.setDate(inicio.getDate()-inicio.getDay()); // domingo
  const dias=Array.from({length:7},(_,i)=>{const d=new Date(inicio);d.setDate(d.getDate()+i);return d;});
  const DOWS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MESES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const ini=dias[1],fim=dias[6];
  document.getElementById('agenda-periodo').textContent=
    `${ini.getDate()} ${MESES[ini.getMonth()]} – ${fim.getDate()} ${MESES[fim.getMonth()]}`;

  const HOUR_H=56, START_H=7, END_H=21;
  const totalH=END_H-START_H;
  const totalPx=totalH*HOUR_H;
  const TIME_COL=32;

  // linha horário atual
  const nowTop=((agora.getHours()-START_H)*60+agora.getMinutes())/60*HOUR_H;
  const showNow=agora.getHours()>=START_H&&agora.getHours()<END_H;

  const byDate={};
  dias.forEach(d=>{byDate[dateStr(d)]=[];});
  atendimentos.forEach(a=>{
    if(byDate[a.data]){
      if(!agendaFiltro||nomePac(a.pacienteId).toLowerCase().includes(agendaFiltro))
        byDate[a.data].push(a);
    }
  });

  const cal=document.getElementById('agenda-cal');
  cal.style.cssText='overflow:visible;padding:0;';

  // cabeçalho sticky — abaixo do topbar (52px) + tabs (44px)
  let hdr=`<div id="gcal-hdr" style="display:flex;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:96px;z-index:20;box-shadow:0 1px 4px rgba(0,0,0,.06)">
    <div style="width:${TIME_COL}px;flex-shrink:0"></div>
    ${dias.map(d=>{
      const ds=dateStr(d);
      const isHoje=ds===hojeStr;
      const cnt=(byDate[ds]||[]).length;
      return `<div style="flex:1;text-align:center;padding:6px 1px 5px;min-width:0;cursor:pointer;border-left:1px solid var(--border);background:${isHoje?'rgba(16,185,129,0.06)':''}" onclick="agendaBase=new Date('${ds}T12:00:00');agendaView='diario';renderAgenda()">
        <div style="font-size:9px;font-weight:700;color:${isHoje?'var(--green)':'var(--text3)'};letter-spacing:.04em;text-transform:uppercase;line-height:1">${DOWS[d.getDay()]}</div>
        <div style="width:26px;height:26px;border-radius:50%;margin:3px auto 2px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:${isHoje?'var(--green)':'transparent'};color:${isHoje?'#fff':'var(--text)'}">${d.getDate()}</div>
        <div style="display:flex;justify-content:center;gap:2px;min-height:5px">${Array.from({length:Math.min(cnt,3)},(_,i)=>`<div style="width:4px;height:4px;border-radius:50%;background:${cnt>0?'var(--green)':'transparent'}"></div>`).join('')}</div>
      </div>`;
    }).join('')}
  </div>`;

  // grid scrollável
  let grid=`<div style="display:flex;overflow-y:auto;max-height:calc(100svh - 198px);-webkit-overflow-scrolling:touch" id="gcal-scroll">
    <div style="width:${TIME_COL}px;flex-shrink:0;position:relative;height:${totalPx}px">
      ${Array.from({length:totalH},(_,i)=>`
        <div style="position:absolute;top:${i*HOUR_H-6}px;right:4px;font-size:9px;color:var(--text3);font-weight:500;text-align:right;line-height:1;white-space:nowrap">
          ${i===0?'':`${String(START_H+i).padStart(2,'0')}h`}
        </div>`).join('')}
    </div>
    <div style="flex:1;min-width:0;display:flex;position:relative">
      ${showNow?`
        <div style="position:absolute;top:${nowTop}px;left:0;right:0;height:2px;background:#ea4335;z-index:5;pointer-events:none">
          <div style="position:absolute;left:-4px;top:-4px;width:9px;height:9px;border-radius:50%;background:#ea4335"></div>
        </div>`:''}
      ${dias.map(d=>{
        const ds=dateStr(d);const isHoje=ds===hojeStr;
        return `<div style="flex:1;position:relative;height:${totalPx}px;border-left:1px solid var(--border);min-width:0;background:${isHoje?'rgba(16,185,129,0.02)':''}">
          ${Array.from({length:totalH},(_,i)=>`
            <div style="position:absolute;top:${i*HOUR_H}px;left:0;right:0;height:${HOUR_H}px;border-top:1px solid var(--border)" onclick="openModalAtend()"></div>
            <div style="position:absolute;top:${i*HOUR_H+HOUR_H/2}px;left:0;right:0;border-top:1px dashed rgba(0,0,0,.07);pointer-events:none"></div>
          `).join('')}
          ${(byDate[ds]||[]).map(a=>{
            if(!a.hora) return '';
            const [hh,mm]=a.hora.split(':').map(Number);
            if(hh<START_H||hh>=END_H) return '';
            const top=((hh-START_H)*60+mm)/60*HOUR_H;
            let height=HOUR_H-2;
            if(a.horaFim){const [fh,fm]=a.horaFim.split(':').map(Number);height=Math.max(16,((fh-hh)*60+(fm-mm))/60*HOUR_H-2);}
            const cor=corStatus(a);
            const nome=nomePac(a.pacienteId).split(' ')[0];
            return `<div onclick="event.stopPropagation();editAtend('${a.id}')"
              style="position:absolute;top:${top+1}px;height:${height}px;left:1px;right:1px;background:${cor};color:#fff;border-radius:4px;padding:2px 3px;font-size:9px;font-weight:600;overflow:hidden;cursor:pointer;line-height:1.25;box-shadow:0 1px 3px rgba(0,0,0,.18)">
              <div style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${nome}</div>
              ${height>=30&&a.hora?`<div style="font-size:8px;opacity:.85">${a.hora}${a.horaFim?'–'+a.horaFim:''}</div>`:''}
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>
  </div>`;

  cal.innerHTML=`<div style="background:var(--surface);border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border)">${hdr}${grid}</div>`;

  // auto-scroll para horário atual ou início do expediente
  requestAnimationFrame(()=>{
    const sc=document.getElementById('gcal-scroll');
    if(sc){
      const scrollTo=showNow?Math.max(0,nowTop-80):(8-START_H)*HOUR_H;
      sc.scrollTop=scrollTo;
    }
  });
}

// ── VISÃO DIÁRIA ──────────────────────────────────────────
function renderAgendaDiaria(){
  const hojeStr = dateStr(new Date());
  const ds = dateStr(agendaBase);
  const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DOWS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  document.getElementById('agenda-periodo').textContent =
    `${DOWS[agendaBase.getDay()]}, ${agendaBase.getDate()} de ${MESES[agendaBase.getMonth()]} ${agendaBase.getFullYear()}`;

  const HOUR_H=64, START_H=7, END_H=21;
  const totalH=END_H-START_H;
  const totalPx=totalH*HOUR_H;
  const events=atendimentos.filter(a=>{
    if(a.data!==ds) return false;
    if(agendaFiltro) return nomePac(a.pacienteId).toLowerCase().includes(agendaFiltro);
    return true;
  }).sort((a,b)=>(a.hora||'').localeCompare(b.hora||''));

  let html=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="display:flex;overflow-y:auto;max-height:calc(100vh - 170px)">
      <div style="width:62px;flex-shrink:0;position:relative;height:${totalPx}px;border-right:1px solid var(--border)">
        ${Array.from({length:totalH},(_,i)=>`<div style="position:absolute;top:${i*HOUR_H+4}px;right:8px;font-size:10px;color:var(--text3);font-weight:500">${String(START_H+i).padStart(2,'0')}:00</div>`).join('')}
      </div>
      <div style="flex:1;position:relative;height:${totalPx}px;background:${ds===hojeStr?'rgba(16,185,129,0.015)':''}">
        ${Array.from({length:totalH},(_,i)=>`
          <div style="position:absolute;top:${i*HOUR_H}px;left:0;right:0;height:${HOUR_H}px;border-top:1px solid var(--border)" class="agenda-cell" onclick="agendaClicar('${ds}','${String(START_H+i).padStart(2,'0')}:00')"></div>
          <div style="position:absolute;top:${i*HOUR_H+HOUR_H/2}px;left:0;right:0;height:1px;border-top:1px dashed var(--border);opacity:.35;pointer-events:none"></div>
        `).join('')}
        ${events.map(a=>{
          if(!a.hora) return '';
          const [hh,mm]=a.hora.split(':').map(Number);
          if(hh<START_H||hh>=END_H) return '';
          const top=((hh-START_H)*60+mm)/60*HOUR_H;
          let height=HOUR_H;
          if(a.horaFim){const [fh,fm]=a.horaFim.split(':').map(Number);height=Math.max(32,((fh-hh)*60+(fm-mm))/60*HOUR_H);}
          const cor=corStatus(a);
          const pacNome=a.pacoteId?(pacotes.find(x=>x.id===a.pacoteId)?.nome||''):'';
          return `<div class="agenda-block" onclick="event.stopPropagation();editAtend('${a.id}')"
            style="top:${top+1}px;height:${height-2}px;left:4px;right:4px;background:${cor};color:#fff">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px">${esc(nomePac(a.pacienteId))}</div>
            ${pacNome?`<div style="font-size:11px;opacity:.85"><i class="ti ti-package"></i> ${esc(pacNome)}</div>`:''}
            ${a.obs&&height>=60?`<div style="font-size:11px;opacity:.8;margin-top:2px">${esc(a.obs)}</div>`:''}
            ${height>=32?`<div style="font-size:10px;opacity:.8;margin-top:auto;padding-top:3px">${a.hora}${a.horaFim?' – '+a.horaFim:''}</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
  document.getElementById('agenda-cal').innerHTML=html;
  renderAgendaRightPanel();
}

// ── VISÃO SEMANAL ─────────────────────────────────────────
function renderAgendaSemanal(){
  const hojeStr=dateStr(new Date());
  const inicio=new Date(agendaBase);
  const dow=inicio.getDay();
  inicio.setDate(inicio.getDate()-dow);
  const dias=Array.from({length:7},(_,i)=>{const d=new Date(inicio);d.setDate(d.getDate()+i);return d;});

  const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const ini=dias[0],fim=dias[6];
  document.getElementById('agenda-periodo').textContent = ini.getMonth()===fim.getMonth()
    ? `${ini.getDate()} – ${fim.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`
    : `${ini.getDate()} ${MESES[ini.getMonth()].substring(0,3)} – ${fim.getDate()} ${MESES[fim.getMonth()].substring(0,3)} ${fim.getFullYear()}`;

  const DOWS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const HOUR_H=56, START_H=7, END_H=21;
  const totalH=END_H-START_H;
  const totalPx=totalH*HOUR_H;

  const byDate={};
  dias.forEach(d=>{byDate[dateStr(d)]=[];});
  atendimentos.forEach(a=>{
    if(byDate[a.data]){
      if(!agendaFiltro||nomePac(a.pacienteId).toLowerCase().includes(agendaFiltro)) byDate[a.data].push(a);
    }
  });

  let html=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;min-width:500px">
    <div style="display:flex;border-bottom:2px solid var(--border);background:var(--surface)">
      <div style="width:56px;flex-shrink:0"></div>
      ${dias.map(d=>{
        const ds=dateStr(d);const isHoje=ds===hojeStr;
        const cnt=(byDate[ds]||[]).length;
        return `<div style="flex:1;text-align:center;padding:10px 4px 8px;border-left:1px solid var(--border);background:${isHoje?'var(--green-light)':'transparent'};cursor:pointer" onclick="agendaClicar('${ds}','')">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${isHoje?'var(--green)':'var(--text3)'};margin-bottom:3px">${DOWS[d.getDay()]}</div>
          <div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:15px;font-weight:700;margin:0 auto;background:${isHoje?'var(--green)':'transparent'};color:${isHoje?'#fff':'var(--text)'}">${d.getDate()}</div>
          ${cnt?`<div style="font-size:9px;color:${isHoje?'var(--green)':'var(--text3)'};margin-top:4px;font-weight:600">${cnt}</div>`:'<div style="height:14px"></div>'}
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;overflow-y:auto;max-height:calc(100vh - 200px)">
      <div style="width:56px;flex-shrink:0;position:relative;height:${totalPx}px;border-right:1px solid var(--border)">
        ${Array.from({length:totalH},(_,i)=>`<div style="position:absolute;top:${i*HOUR_H+4}px;right:7px;font-size:10px;color:var(--text3);font-weight:500">${String(START_H+i).padStart(2,'0')}:00</div>`).join('')}
      </div>
      ${dias.map(d=>{
        const ds=dateStr(d);const isHoje=ds===hojeStr;
        return `<div style="flex:1;position:relative;height:${totalPx}px;border-left:1px solid var(--border);background:${isHoje?'rgba(16,185,129,0.018)':''}">
          ${Array.from({length:totalH},(_,i)=>`
            <div style="position:absolute;top:${i*HOUR_H}px;left:0;right:0;height:${HOUR_H}px;border-top:1px solid var(--border)" class="agenda-cell" onclick="agendaClicar('${ds}','${String(START_H+i).padStart(2,'0')}:00')"></div>
            <div style="position:absolute;top:${i*HOUR_H+HOUR_H/2}px;left:0;right:0;height:1px;border-top:1px dashed var(--border);opacity:.3;pointer-events:none"></div>
          `).join('')}
          ${byDate[ds].map(a=>{
            if(!a.hora) return '';
            const [hh,mm]=a.hora.split(':').map(Number);
            if(hh<START_H||hh>=END_H) return '';
            const top=((hh-START_H)*60+mm)/60*HOUR_H;
            let height=HOUR_H-2;
            if(a.horaFim){const [fh,fm]=a.horaFim.split(':').map(Number);height=Math.max(22,((fh-hh)*60+(fm-mm))/60*HOUR_H-2);}
            const cor=corStatus(a);
            const nome=nomePac(a.pacienteId).split(' ').slice(0,2).join(' ');
            const isPacote=!!a.pacoteId;
            const pacNome=isPacote?(pacotes.find(x=>x.id===a.pacoteId)?.nome||''):'';
            return `<div class="agenda-block" onclick="event.stopPropagation();editAtend('${a.id}')"
              style="top:${top+1}px;height:${height}px;background:${cor};color:#fff">
              <div style="font-weight:700;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nome}</div>
              ${height>=42&&isPacote?`<div style="font-size:9px;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="ti ti-package"></i> ${esc(pacNome)}</div>`:''}
              ${height>=28?`<div style="font-size:9px;opacity:.8;margin-top:auto;padding-top:2px">${a.hora}${a.horaFim?' – '+a.horaFim:''}</div>`:''}
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>
  </div>`;
  document.getElementById('agenda-cal').innerHTML=html;
  renderAgendaRightPanel();
}

// ── VISÃO MENSAL ──────────────────────────────────────────
function renderAgendaMensal(){
  if(!agendaBase){ agendaBase = new Date(); agendaBase.setDate(1); }
  const ano = agendaBase.getFullYear();
  const mes = agendaBase.getMonth();
  const hojeStr = dateStr(new Date());

  const NOMES_MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('agenda-periodo').textContent = `${NOMES_MESES[mes]} ${ano}`;

  const dows=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const primeiroDia = new Date(ano, mes, 1).getDay(); // 0=dom
  const diasNoMes = new Date(ano, mes+1, 0).getDate();

  // indexar atendimentos do mês
  const byDate = {};
  atendimentos.forEach(a=>{
    if(a.data && a.data.startsWith(`${ano}-${String(mes+1).padStart(2,'0')}`)){
      if(!byDate[a.data]) byDate[a.data]= [];
      byDate[a.data].push(a);
    }
  });

  let html = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--green)">
      ${dows.map(d=>`<div style="text-align:center;padding:10px 4px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid var(--border)">`;

  // células vazias antes do dia 1
  for(let i=0;i<primeiroDia;i++){
    html += `<div style="min-height:110px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface2)"></div>`;
  }

  for(let dia=1;dia<=diasNoMes;dia++){
    const ds = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const isHoje = ds===hojeStr;
    const events = (byDate[ds]||[]).sort((a,b)=>(a.hora||'').localeCompare(b.hora||''));
    const col = (primeiroDia + dia - 1) % 7;
    const bRight = col<6 ? '1px solid var(--border)' : 'none';

    html += `<div style="min-height:110px;border-right:${bRight};border-bottom:1px solid var(--border);padding:4px;vertical-align:top;background:${isHoje?'var(--green-light)':'var(--surface)'};cursor:pointer" onclick="agendaClicar('${ds}','')">
      <div style="font-size:13px;font-weight:${isHoje?'700':'500'};color:${isHoje?'var(--green)':'var(--text)'};width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:50%;${isHoje?'background:var(--green);color:#fff;':''}margin-bottom:3px">${dia}</div>
      ${events.slice(0,3).map(a=>{
        const cor=corStatus(a);
        const nome=nomePac(a.pacienteId).split(' ')[0];
        const hora=a.hora?a.hora.substring(0,5):'';
        const horaFim=a.horaFim?` – ${a.horaFim.substring(0,5)}`:'';
        return `<div onclick="event.stopPropagation();editAtend('${a.id}')"
          style="background:${cor};color:#fff;border-radius:4px;padding:2px 5px;font-size:10px;font-weight:600;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer"
          title="${esc(nomePac(a.pacienteId))} ${hora}${horaFim}${a.pacoteId?' 📦 Pacote':''}">
          ${a.pacoteId?'📦 ':''}${hora} ${nome}${horaFim}
        </div>`;
      }).join('')}
      ${events.length>3?`<div style="font-size:10px;color:var(--text3);padding:1px 4px">+${events.length-3} mais</div>`:''}
    </div>`;
  }

  // células vazias depois do último dia
  const total = primeiroDia + diasNoMes;
  const restantes = total%7===0 ? 0 : 7-(total%7);
  for(let i=0;i<restantes;i++){
    html += `<div style="min-height:110px;border-bottom:1px solid var(--border);background:var(--surface2)"></div>`;
  }

  html += `</div></div>`;
  document.getElementById('agenda-cal').innerHTML = html;
  renderAgendaRightPanel();
}

function agendaClicar(data, hora){
  openModalAtend();
  setTimeout(()=>{
    document.getElementById('atend-data').value = data;
    if(hora) document.getElementById('atend-hora').value = hora;
  }, 50);
}

let agendaFiltro = '';
function filtrarAgenda(val){ agendaFiltro = val.toLowerCase().trim(); renderAgenda(); }

function agendaIrParaDia(ds){
  agendaBase = new Date(ds + 'T12:00:00');
  setAgendaView('diario');
}

function renderMiniCalendarHTML(){
  const d = new Date(agendaBase);
  const ano = d.getFullYear(), mes = d.getMonth();
  const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DOWS=['D','S','T','Q','Q','S','S'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes+1, 0).getDate();
  const hojeStr = dateStr(new Date());
  let cells = '';
  for(let i=0;i<primeiroDia;i++) cells += `<div></div>`;
  for(let dia=1;dia<=diasNoMes;dia++){
    const ds=`${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const isHoje=ds===hojeStr;
    const hasEv=atendimentos.some(a=>a.data===ds&&a.status!=='cancelado');
    cells+=`<div class="mini-cal-day" onclick="agendaIrParaDia('${ds}')" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:11px;cursor:pointer;font-weight:${isHoje?'700':'400'};background:${isHoje?'var(--green)':'transparent'};color:${isHoje?'#fff':'var(--text)'};position:relative">${dia}${hasEv&&!isHoje?`<span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:var(--green)"></span>`:''}</div>`;
  }
  return `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:13px;font-weight:600;color:var(--text)">${MESES[mes].substring(0,3)} ${ano}</span>
      <div style="display:flex;gap:3px">
        <button class="btn btn-outline btn-sm" style="padding:2px 7px" onclick="agendaNavAnterior();renderAgendaRightPanel()"><i class="ti ti-chevron-left" style="font-size:11px"></i></button>
        <button class="btn btn-outline btn-sm" style="padding:2px 7px" onclick="agendaNavProximo();renderAgendaRightPanel()"><i class="ti ti-chevron-right" style="font-size:11px"></i></button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,26px);gap:2px">
      ${DOWS.map(x=>`<div style="text-align:center;font-size:9px;color:var(--text3);font-weight:600;height:20px;display:flex;align-items:center;justify-content:center">${x}</div>`).join('')}
      ${cells}
    </div>
  </div>`;
}

function renderAgendaRightPanel(){
  const panel = document.getElementById('agenda-right-panel');
  if(!panel) return;
  let count = 0;
  if(agendaView==='diario'){
    const ds=dateStr(agendaBase);
    count=atendimentos.filter(a=>a.data===ds&&a.status!=='cancelado').length;
  } else if(agendaView==='semanal'){
    const ini=new Date(agendaBase);ini.setDate(ini.getDate()-ini.getDay());
    const dias=Array.from({length:7},(_,i)=>{const x=new Date(ini);x.setDate(x.getDate()+i);return dateStr(x);});
    count=atendimentos.filter(a=>dias.includes(a.data)&&a.status!=='cancelado').length;
  } else {
    const ano=agendaBase.getFullYear(),mes=agendaBase.getMonth();
    count=atendimentos.filter(a=>{if(!a.data)return false;const x=new Date(a.data+'T12:00:00');return x.getFullYear()===ano&&x.getMonth()===mes&&a.status!=='cancelado';}).length;
  }
  const legend=[
    {c:'var(--green)',l:'Pago'},{c:'#3b82f6',l:'Em pacote'},
    {c:'var(--amber)',l:'Pendente'},{c:'var(--red)',l:'Atrasado'},
    {c:'#8b5cf6',l:'Parcial'},{c:'var(--text3)',l:'Cancelado'}
  ];
  panel.innerHTML=`
    <button class="btn btn-primary" style="width:100%;gap:6px" onclick="openModalAtend()"><i class="ti ti-plus"></i> Novo agendamento</button>
    <div style="position:relative">
      <i class="ti ti-search" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:13px;pointer-events:none"></i>
      <input type="text" class="form-input" placeholder="Buscar paciente..." style="padding-left:30px;font-size:12px;height:34px" value="${agendaFiltro}" oninput="filtrarAgenda(this.value)">
    </div>
    ${renderMiniCalendarHTML()}
    <div style="padding:12px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">
      <div style="font-size:26px;font-weight:800;color:var(--text);line-height:1">${count}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:3px">agendamento${count!==1?'s':''} no período</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Legenda</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${legend.map(l=>`<div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${l.c};flex-shrink:0"></div><span style="font-size:12px;color:var(--text2)">${l.l}</span></div>`).join('')}
      </div>
    </div>`;
}
