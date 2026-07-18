// Public browser clients. Privileged keys must never be added to this file.
const _supabaseEnvironments = {
  production: {
    url: 'https://igwkhdsywagbmqlispil.supabase.co',
    key: 'sb_publishable_lzLWVm3zOcnqVS3nTEpabw_7QE3OEAi',
  },
  qas: {
    url: 'https://rcnuymnazjyhckoojpvf.supabase.co',
    key: 'sb_publishable_8yC20JKcBguQEPB1-g6cvA_lv0T1l-s',
  },
};

const _hostname = window.location.hostname;
const _isLocal = window.location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(_hostname);
const _isVercelPreview = _hostname.endsWith('.vercel.app') && _hostname !== 'fisiogestao-jhmd.vercel.app';
const _environmentName = (_isLocal || _isVercelPreview) ? 'qas' : 'production';
const _supabaseConfig = _supabaseEnvironments[_environmentName];

const _sb = supabase.createClient(
  _supabaseConfig.url,
  _supabaseConfig.key,
  {
    auth: {
      // Mantém a sessão entre recarregamentos e novas abas do mesmo navegador.
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

window.addEventListener('DOMContentLoaded', () => {
  if (_environmentName !== 'qas') return;
  const badge = document.createElement('div');
  badge.id = 'qas-environment-badge';
  badge.textContent = 'QAS · Ambiente de teste';
  badge.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:12000;background:#f59e0b;color:#111827;padding:6px 10px;border-radius:999px;font:700 11px Inter,sans-serif;box-shadow:0 4px 14px rgba(15,23,42,.18)';
  document.body.appendChild(badge);
});
