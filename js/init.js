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
  hideAuthScreen();
  await loadData();
  renderDashboard();
  document.getElementById('page-title').textContent = 'Visão geral';
})();
