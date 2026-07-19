// ── INIT ─────────────────────────────────────────────────
(async function init(){
  document.getElementById('page-title').textContent = 'Carregando...';
  document.querySelector('aside.sidebar').style.display = 'none';
  document.querySelector('.main').style.display = 'none';
  _sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showAuthScreen();
  });
  const authed = await checkAuth();
  if (!authed) return;
  // A sessão local já foi validada: devolve a interface imediatamente e
  // atualiza perfil e dados em paralelo, reduzindo a espera após um reload.
  hideAuthScreen();
  document.getElementById('page-title').textContent = 'Atualizando dados...';
  await Promise.all([loadProfile(), loadData()]);
  renderDashboard();
  document.getElementById('page-title').textContent = 'Visão geral';
})();
