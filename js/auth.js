// ── AUTH ─────────────────────────────────────────────────
let currentUser = null;
let currentProfile = null;

async function checkAuth() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) { showAuthScreen(); return false; }
  currentUser = session.user;
  await loadProfile();
  return true;
}

async function loadProfile() {
  const { data } = await _sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) navAdmin.style.display = currentProfile?.role === 'admin' ? 'block' : 'none';
  const navCadastros = document.getElementById('nav-cadastros');
  if (navCadastros) navCadastros.style.display = currentProfile?.role === 'admin' ? 'flex' : 'none';
  const footerEl = document.getElementById('sidebar-user');
  if (footerEl) footerEl.innerHTML = `<div style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${currentProfile?.nome || currentUser.email}</div><div style="font-size:11px;color:var(--text3)">${currentUser.email}</div>`;
  const nome = currentProfile?.nome || currentUser.email || '';
  const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  // Prioriza avatar do localStorage (salvo localmente) sobre o do banco
  const lsAvatar = localStorage.getItem('avatar_' + currentUser.id);
  if (lsAvatar && currentProfile) currentProfile.avatar_url = lsAvatar;
  updateAvatarDisplays(currentProfile?.avatar_url || null, initials);
}

function updateAvatarDisplays(url, initials) {
  const av = document.getElementById('topbar-avatar');
  if (av) {
    if (url) {
      av.style.backgroundImage = `url('${url}')`;
      av.style.backgroundSize = 'cover';
      av.style.backgroundPosition = 'center';
      av.textContent = '';
    } else {
      av.style.backgroundImage = '';
      av.textContent = initials || '?';
    }
  }
  const pgAv = document.getElementById('perfil-page-avatar');
  if (pgAv) {
    if (url) {
      pgAv.style.backgroundImage = `url('${url}')`;
      pgAv.style.backgroundSize = 'cover';
      pgAv.style.backgroundPosition = 'center';
      pgAv.textContent = '';
    } else {
      pgAv.style.backgroundImage = '';
      pgAv.textContent = initials || '?';
    }
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.querySelector('aside.sidebar').style.display = 'none';
  document.querySelector('.main').style.display = 'none';
  const ov = document.getElementById('sidebar-overlay');
  if(ov) ov.style.display = 'none';
}

function hideAuthScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.querySelector('aside.sidebar').style.display = '';
  document.querySelector('.main').style.display = '';
}

function switchAuthTab(tab) {
  document.getElementById('auth-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('auth-email-sent').style.display = tab === 'email-sent' ? 'block' : 'none';
  const tabBar = document.getElementById('auth-tab-bar');
  if (tabBar) tabBar.style.display = tab === 'email-sent' ? 'none' : 'flex';
  document.getElementById('auth-error').textContent = '';
  const active = 'flex:1;padding:9px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 2px 8px rgba(16,185,129,0.3);border-radius:8px';
  const inactive = 'flex:1;padding:9px;border:none;background:transparent;color:#64748b;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500';
  document.getElementById('tab-login').style.cssText = tab==='login' ? active : inactive;
  document.getElementById('tab-register').style.cssText = tab==='register' ? active : inactive;
}

let _lastRegEmail = '';
function showEmailSent(email) {
  _lastRegEmail = email;
  document.getElementById('reg-email-sent-addr').textContent = email;
  document.getElementById('resend-msg').textContent = '';
  switchAuthTab('email-sent');
}

async function reenviarEmail() {
  const btn = document.getElementById('btn-reenviar');
  const msg = document.getElementById('resend-msg');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Enviando...';
  const { error } = await _sb.auth.resend({ type: 'signup', email: _lastRegEmail });
  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-refresh"></i> Reenviar e-mail';
  if (error) { msg.style.color = '#ef4444'; msg.textContent = 'Erro ao reenviar: ' + error.message; }
  else { msg.style.color = '#10b981'; msg.textContent = '✓ E-mail reenviado com sucesso!'; }
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('auth-error');
  err.style.color = 'var(--red)'; err.textContent = '';
  if (!email || !password) { err.textContent = 'Preencha email e senha.'; return; }
  const { data, error } = await _sb.auth.signInWithPassword({ email, password });
  if (error) { err.textContent = error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message; return; }
  currentUser = data.user;
  await loadProfile();
  if (currentProfile?.role === 'disabled') {
    await _sb.auth.signOut();
    err.textContent = 'Acesso desativado. Entre em contato com o administrador.';
    return;
  }
  hideAuthScreen();
  await loadData();
  renderDashboard();
  document.getElementById('page-title').textContent = 'Visão geral';
}

async function doRegister() {
  const nome = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const err = document.getElementById('auth-error');
  err.style.color = 'var(--red)'; err.textContent = '';
  if (!nome || !email || !password) { err.textContent = 'Preencha todos os campos.'; return; }
  if (password !== confirm) { err.textContent = 'As senhas não coincidem.'; return; }
  if (password.length < 8) { err.textContent = 'A senha deve ter ao menos 8 caracteres.'; return; }
  let data, error;
  try {
    const res = await _sb.auth.signUp({ email, password, options: { data: { nome } } });
    data = res.data; error = res.error;
  } catch(e) {
    err.textContent = 'Erro inesperado: ' + (e?.message || String(e)); return;
  }
  if (error) {
    const msg = typeof error.message === 'string' ? error.message.trim() : '';
    const status = error.status || 0;
    const isNetworkError = error.name === 'AuthRetryableFetchError' || status === 0 || status >= 500;
    const isBadMsg = !msg || msg === '{}' || msg === '[]' || msg.startsWith('{') || msg.startsWith('[');
    if (isNetworkError)
      err.textContent = 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
    else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('user already'))
      err.textContent = 'Este e-mail já está cadastrado. Tente fazer login.';
    else if (msg.toLowerCase().includes('invalid email'))
      err.textContent = 'E-mail inválido. Verifique e tente novamente.';
    else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('senha'))
      err.textContent = 'Senha fraca: use ao menos 8 caracteres com letras e números.';
    else if (!isBadMsg)
      err.textContent = msg;
    else
      err.textContent = 'Erro ao criar conta (código: ' + status + '). Tente novamente.';
    return;
  }
  if (data?.user) {
    // e-mail já cadastrado: Supabase retorna user com identities vazio
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      err.textContent = 'Este e-mail já está cadastrado. Tente fazer login.';
      return;
    }
    const needsConfirm = !data.user.email_confirmed_at && !data.session;
    if (needsConfirm) {
      document.getElementById('reg-nome').value = '';
      document.getElementById('reg-password').value = '';
      document.getElementById('reg-confirm').value = '';
      showEmailSent(email);
      return;
    }
    // Auto-confirm still enabled — log in directly
    const { data: loginData, error: loginErr } = await _sb.auth.signInWithPassword({ email, password });
    if (loginErr) { err.style.color='var(--green)'; err.textContent = '✓ Conta criada! Faça login para continuar.'; return; }
    err.style.color = 'var(--green)';
    err.textContent = '✓ Conta criada com sucesso! Entrando...';
    await new Promise(r => setTimeout(r, 3000));
    currentUser = loginData.user;
    await loadProfile();
    hideAuthScreen();
    await loadData();
    renderDashboard();
    toast('Bem-vindo ao FisioGestão! 👋', 'success');
  } else {
    err.style.color = 'var(--green)';
    err.textContent = '✓ Conta criada! Faça login para continuar.';
  }
}

function toggleUserPanel() {
  if(window.innerWidth<=768){ return openMobileUserMenu(); }
  const panel = document.getElementById('user-panel');
  if (!panel) return;
  if (panel.classList.contains('user-panel-hidden')) {
    const nome = currentProfile?.nome || currentUser?.email || '';
    const email = currentUser?.email || '';
    const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
    document.getElementById('user-panel-avatar-lg').textContent = initials;
    document.getElementById('user-panel-name').textContent = nome || email;
    document.getElementById('user-panel-email').textContent = email;
    panel.classList.remove('user-panel-hidden');
    setTimeout(() => document.addEventListener('click', closePanelOutside, {once:true}), 10);
  } else {
    closeUserPanel();
  }
}

function openMobileUserMenu(){
  const nome = currentProfile?.nome || currentUser?.email || '';
  const email = currentUser?.email || '';
  const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  const isAdmin = currentProfile?.role==='admin';

  // remove se já existe
  document.getElementById('mob-user-sheet')?.remove();
  document.getElementById('mob-user-overlay')?.remove();

  const overlay=document.createElement('div');
  overlay.id='mob-user-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:8998;animation:fadeIn .15s';
  overlay.onclick=closeMobileUserMenu;

  const sheet=document.createElement('div');
  sheet.id='mob-user-sheet';
  sheet.style.cssText='position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-radius:20px 20px 0 0;z-index:8999;animation:slideSheet .25s cubic-bezier(0.34,1.1,0.64,1);padding-bottom:env(safe-area-inset-bottom,0)';
  sheet.innerHTML=`
    <div style="width:36px;height:4px;border-radius:2px;background:var(--border2);margin:12px auto 0"></div>
    <div style="display:flex;align-items:center;gap:14px;padding:20px 20px 16px">
      <div style="width:52px;height:52px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0">${initials}</div>
      <div style="min-width:0">
        <div style="font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nome||email)}</div>
        <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(email)}</div>
        ${isAdmin?`<span style="background:var(--green);color:#fff;border-radius:20px;padding:1px 8px;font-size:10px;font-weight:700;display:inline-block;margin-top:4px">Admin</span>`:''}
      </div>
    </div>
    <div style="border-top:1px solid var(--border)">
      ${menuItem('ti-user','Meu perfil',`closeMobileUserMenu();navTo('perfil',null)`)}
      ${menuItem('ti-chart-bar','Relatório mensal',`closeMobileUserMenu();navTo('relatorio',null)`)}
      ${menuItem('ti-users-group','Cadastros',`closeMobileUserMenu();navTo('cadastros',null)`)}
      ${isAdmin?menuItem('ti-shield','Admin',`closeMobileUserMenu();navTo('admin',null)`):''}
      <div style="height:1px;background:var(--border);margin:4px 0"></div>
      ${menuItem('ti-lock','Alterar senha',`closeMobileUserMenu();openAlterarSenha()`)}
      ${menuItem('ti-logout','Sair',`closeMobileUserMenu();doLogout()`,'color:var(--red)')}
    </div>
    <div style="height:16px"></div>
  `;
  function menuItem(icon,label,action,extra=''){
    return `<button onclick="${action}" style="display:flex;align-items:center;gap:14px;padding:14px 20px;width:100%;border:none;background:transparent;cursor:pointer;font-family:inherit;text-align:left;${extra}">
      <i class="ti ${icon}" style="font-size:20px;color:${extra?'var(--red)':'var(--text3)'}"></i>
      <span style="font-size:15px;font-weight:500;color:${extra?'var(--red)':'var(--text)'}">${label}</span>
    </button>`;
  }
  document.body.appendChild(overlay);
  document.body.appendChild(sheet);
}

function closeMobileUserMenu(){
  document.getElementById('mob-user-sheet')?.remove();
  document.getElementById('mob-user-overlay')?.remove();
}
function closeUserPanel() {
  const panel = document.getElementById('user-panel');
  if (panel) panel.classList.add('user-panel-hidden');
}
function closePanelOutside(e) {
  const wrap = document.querySelector('.user-panel-wrap');
  if (wrap && !wrap.contains(e.target)) closeUserPanel();
  else if (wrap && wrap.contains(e.target)) setTimeout(() => document.addEventListener('click', closePanelOutside, {once:true}), 10);
}

function handleAvatarUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Selecione uma imagem válida', 'error'); return; }
  const msg = document.getElementById('perfil-msg');
  if (msg) { msg.style.color = 'var(--text3)'; msg.textContent = 'Processando foto...'; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const rawUrl = e.target.result;
    if (!rawUrl) {
      if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Erro ao ler arquivo.'; }
      return;
    }
    // Tenta redimensionar via canvas; se falhar, usa o URL original
    try {
      const img = new Image();
      img.onload = function() {
        try {
          const MAX = 300;
          const scale = Math.min(MAX / img.width, MAX / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          _aplicarAvatar(canvas.toDataURL('image/jpeg', 0.85), msg);
        } catch(err) {
          _aplicarAvatar(rawUrl, msg);
        }
      };
      img.onerror = function() { _aplicarAvatar(rawUrl, msg); };
      img.src = rawUrl;
    } catch(err) {
      _aplicarAvatar(rawUrl, msg);
    }
  };
  reader.onerror = function() {
    if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Erro ao ler o arquivo.'; }
  };
  reader.readAsDataURL(file);
}

function _aplicarAvatar(dataUrl, msg) {
  try { localStorage.setItem('avatar_' + currentUser.id, dataUrl); } catch(e) {}
  if (currentProfile) currentProfile.avatar_url = dataUrl;
  const nome = currentProfile?.nome || currentUser?.email || '';
  const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  updateAvatarDisplays(dataUrl, initials);
  if (msg) { msg.style.color = 'var(--green)'; msg.textContent = 'Foto atualizada!'; }
  toast('Foto de perfil atualizada!', 'success');
  // Tenta salvar no banco em segundo plano (não bloqueia)
  try { _sb.from('profiles').update({ avatar_url: dataUrl }).eq('id', currentUser.id).then(()=>{}); } catch(e) {}
}

function loadAvatarFromStorage() {
  if (!currentUser?.id) return;
  const lsKey = 'avatar_' + currentUser.id;
  const stored = localStorage.getItem(lsKey);
  if (stored && currentProfile) currentProfile.avatar_url = stored;
  const nome = currentProfile?.nome || currentUser?.email || '';
  const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  updateAvatarDisplays(currentProfile?.avatar_url || null, initials);
}

function renderPerfil() {
  const nome = currentProfile?.nome || '';
  const email = currentUser?.email || '';
  const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  updateAvatarDisplays(currentProfile?.avatar_url || null, initials);
  document.getElementById('perfil-page-nome').textContent = nome || email;
  document.getElementById('perfil-page-email-hdr').textContent = email;
  document.getElementById('perfil-nome').value = nome;
  document.getElementById('perfil-email').value = email;
  document.getElementById('perfil-telefone').value = currentProfile?.telefone || '';
  document.getElementById('perfil-crefito').value = currentProfile?.crefito || '';
  document.getElementById('perfil-cidade').value = currentProfile?.cidade || '';
  document.getElementById('perfil-estado').value = currentProfile?.estado || '';
  document.getElementById('perfil-msg').textContent = '';
}
function closePerfilModal() {
  const modal = document.getElementById('modal-perfil');
  if (modal) modal.style.display = 'none';
}
async function salvarPerfil() {
  const msg = document.getElementById('perfil-msg');
  const nome = document.getElementById('perfil-nome').value.trim();
  if (!nome) { msg.style.color = 'var(--red)'; msg.textContent = 'Nome é obrigatório.'; return; }
  msg.style.color = 'var(--text3)'; msg.textContent = 'Salvando...';
  const { error } = await _sb.rpc('update_own_profile', {
    p_nome: nome,
    p_telefone: document.getElementById('perfil-telefone').value.trim() || null,
    p_crefito: document.getElementById('perfil-crefito').value.trim() || null,
    p_cidade: document.getElementById('perfil-cidade').value.trim() || null,
    p_estado: document.getElementById('perfil-estado').value || null,
  });
  if (error) { msg.style.color = 'var(--red)'; msg.textContent = 'Erro: ' + error.message; return; }
  // atualiza cache local
  const cidade = document.getElementById('perfil-cidade').value.trim();
  const estado = document.getElementById('perfil-estado').value;
  if (currentProfile) {
    currentProfile.nome = nome;
    currentProfile.telefone = document.getElementById('perfil-telefone').value.trim();
    currentProfile.crefito = document.getElementById('perfil-crefito').value.trim();
    currentProfile.cidade = cidade;
    currentProfile.estado = estado;
  }
  try { renderUI(); } catch(e) {}
  // atualiza cabeçalho da página de perfil
  const initials = nome.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
  const pgAvatar = document.getElementById('perfil-page-avatar');
  const pgNome = document.getElementById('perfil-page-nome');
  const pgEmailHdr = document.getElementById('perfil-page-email-hdr');
  if (pgAvatar) pgAvatar.textContent = initials;
  if (pgNome) pgNome.textContent = nome;
  if (pgEmailHdr) pgEmailHdr.textContent = currentUser?.email || '';
  msg.style.color = 'var(--green)'; msg.textContent = 'Perfil salvo com sucesso!';
}

function setPerfilTab(tab) {
  document.getElementById('ptab-geral').style.display = tab === 'geral' ? '' : 'none';
  document.getElementById('ptab-senha').style.display = tab === 'senha' ? '' : 'none';
  const btnGeral = document.getElementById('ptab-btn-geral');
  const btnSenha = document.getElementById('ptab-btn-senha');
  btnGeral.style.borderBottomColor = tab === 'geral' ? 'var(--green)' : 'transparent';
  btnGeral.style.color = tab === 'geral' ? 'var(--green)' : 'var(--text3)';
  btnSenha.style.borderBottomColor = tab === 'senha' ? 'var(--green)' : 'transparent';
  btnSenha.style.color = tab === 'senha' ? 'var(--green)' : 'var(--text3)';
  if (tab === 'senha') { document.getElementById('senha-nova').value = ''; document.getElementById('senha-conf').value = ''; document.getElementById('senha-msg').textContent = ''; }
}

function openAlterarSenha() {
  navTo('perfil', null);
  setTimeout(() => setPerfilTab('senha'), 50);
}
function closeAlterarSenha() {
  const modal = document.getElementById('modal-senha');
  if (modal) modal.style.display = 'none';
}
async function salvarNovaSenha() {
  const nova = document.getElementById('senha-nova').value;
  const conf = document.getElementById('senha-conf').value;
  const msg = document.getElementById('senha-msg');
  if (nova.length < 6) { msg.style.color = 'var(--red)'; msg.textContent = 'A senha deve ter ao menos 6 caracteres.'; return; }
  if (nova !== conf) { msg.style.color = 'var(--red)'; msg.textContent = 'As senhas não coincidem.'; return; }
  msg.style.color = 'var(--text3)'; msg.textContent = 'Salvando...';
  const { error } = await _sb.auth.updateUser({ password: nova });
  if (error) { msg.style.color = 'var(--red)'; msg.textContent = 'Erro: ' + error.message; return; }
  msg.style.color = 'var(--green)'; msg.textContent = 'Senha alterada com sucesso!';
  setTimeout(closeAlterarSenha, 1500);
}

async function doLogout() {
  await _sb.auth.signOut();
  currentUser = null; currentProfile = null;
  showAuthScreen();
}

async function renderCadastros() {
  const list = document.getElementById('cadastros-list');
  const stats = document.getElementById('cadastros-stats');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--text3);padding:20px">Carregando...</div>';
  const { data: profiles, error } = await _sb.rpc('admin_get_users');
  if (error) { list.innerHTML = '<div style="color:var(--red);padding:20px">Erro: ' + error.message + '</div>'; return; }

  const total = profiles.length;
  const admins = profiles.filter(p => p.role === 'admin').length;
  const ativos = profiles.filter(p => p.role === 'user').length;
  const desativados = profiles.filter(p => p.role === 'disabled').length;
  const hoje = new Date().toISOString().split('T')[0];
  const novosHoje = profiles.filter(p => p.created_at && p.created_at.startsWith(hoje)).length;
  const ultimos7 = profiles.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    return (new Date() - d) < 7*24*60*60*1000;
  }).length;

  stats.innerHTML = [
    ['ti-users','Total',total,'var(--blue)'],
    ['ti-user-check','Ativos',ativos,'var(--green)'],
    ['ti-user-plus','Últimos 7 dias',ultimos7,'var(--green-dark)'],
    ['ti-user-x','Desativados',desativados,'var(--red)'],
    ['ti-shield','Admins',admins,'var(--text2)'],
    ['ti-calendar-today','Hoje',novosHoje,'var(--blue)'],
  ].map(([icon,label,val,color]) => `
    <div class="card" style="padding:14px 18px;min-width:130px;flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <i class="ti ${icon}" style="color:${color};font-size:16px"></i>
        <span style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${label}</span>
      </div>
      <div style="font-size:24px;font-weight:700;color:var(--text)">${val}</div>
    </div>`).join('');

  const roleLabel = { admin:'Admin', user:'Usuário', disabled:'Desativado' };
  const roleColor = { admin:'var(--green)', user:'var(--blue)', disabled:'var(--red)' };

  if(window.innerWidth<=768){
    list.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">${profiles.map(p=>`
      <div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:50%;background:${roleColor[p.role]||'var(--text3)'};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0">${(p.nome||p.email||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome||'—'}</div>
          <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.email||'—'}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):''}</div>
        </div>
        <span style="background:${roleColor[p.role]||'var(--text3)'};color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;flex-shrink:0">${roleLabel[p.role]||p.role}</span>
      </div>`).join('')}</div>`;
  } else {
    list.innerHTML = `<div class="card" style="padding:0;overflow:hidden">
      <table class="pay-table">
        <thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Cadastrado em</th></tr></thead>
        <tbody>${profiles.map(p => `<tr>
          <td style="font-weight:500">${p.nome || '—'}</td>
          <td style="color:var(--text2)">${p.email || '—'}</td>
          <td><span style="background:${roleColor[p.role]||'var(--text3)'};color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">${roleLabel[p.role]||p.role}</span></td>
          <td style="color:var(--text2)">${p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  }
}

function setAdminTab(tab) {
  ['usuarios','info'].forEach(t => {
    document.getElementById('admin-tab-'+t).style.display = t===tab ? 'block' : 'none';
    const btn = document.getElementById('atab-'+t);
    btn.style.cssText = t===tab
      ? 'padding:6px 18px;font-size:13px;background:var(--green);color:#fff;border:none;border-radius:6px;cursor:pointer'
      : 'padding:6px 18px;font-size:13px;background:transparent;color:var(--text2);border:none;border-radius:6px;cursor:pointer';
  });
  if(tab==='usuarios') renderAdmin();
}

async function renderAdmin() {
  const el = document.getElementById('admin-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--text3);padding:20px">Carregando...</div>';
  const { data: profiles, error } = await _sb.rpc('admin_get_users');
  if (error) { el.innerHTML = '<div style="color:var(--red);padding:20px">Erro: ' + error.message + '</div>'; return; }
  if (!profiles || !profiles.length) { el.innerHTML = '<div class="empty"><i class="ti ti-users"></i><p>Nenhum usuário</p></div>'; return; }
  const roleColors = { admin:'var(--green)', user:'var(--blue)', disabled:'var(--red)' };
  const roleLabels = { admin:'Admin', user:'Usuário', disabled:'Desativado' };
  if(window.innerWidth<=768){
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">${profiles.map(p=>`
      <div class="card" style="padding:14px 16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${p.id!==currentUser?.id?'10px':'0'}">
          <div style="width:40px;height:40px;border-radius:50%;background:${roleColors[p.role]||'var(--text3)'};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0">${(p.nome||p.email||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.nome)||'—'}</div>
            <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.email)||'—'}</div>
          </div>
          <span style="background:${roleColors[p.role]||'var(--text3)'};color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;flex-shrink:0">${roleLabels[p.role]||p.role}</span>
        </div>
        ${p.id!==currentUser?.id?`<select onchange="changeUserRole('${p.id}',this.value)" style="width:100%;font-size:13px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:inherit;background:var(--surface);color:var(--text)"><option value="">Alterar papel...</option><option value="admin">Admin</option><option value="user">Usuário</option><option value="disabled">Desativar</option></select>`:'<div style="font-size:12px;color:var(--green);font-weight:600"><i class="ti ti-user-check"></i> Você</div>'}
      </div>`).join('')}</div>`;
  } else {
    el.innerHTML = `<div class="card" style="padding:0;overflow:hidden"><table class="pay-table"><thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Criado em</th><th>Ações</th></tr></thead><tbody>${profiles.map(p=>`<tr>
      <td style="font-weight:500">${esc(p.nome)||'—'}</td>
      <td style="color:var(--text2)">${esc(p.email)||'—'}</td>
      <td><span style="background:${roleColors[p.role]||'var(--text3)'};color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">${roleLabels[p.role]||p.role}</span></td>
      <td style="color:var(--text2)">${p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):'—'}</td>
      <td>${p.id!==currentUser?.id?`<select onchange="changeUserRole('${p.id}',this.value)" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-family:inherit"><option value="">Alterar...</option><option value="admin">Admin</option><option value="user">Usuário</option><option value="disabled">Desativar</option></select>`:'<span style="font-size:12px;color:var(--text3)">Você</span>'}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }
}

async function changeUserRole(userId, role) {
  if (!role) return;
  const { error } = await _sb.rpc('admin_update_role', { target_user_id: userId, new_role: role });
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Usuário alterado com sucesso!', 'success');
  renderAdmin();
}
