// Public browser client. Privileged keys must never be added to this file.
const _sb = supabase.createClient(
  'https://igwkhdsywagbmqlispil.supabase.co',
  'sb_publishable_lzLWVm3zOcnqVS3nTEpabw_7QE3OEAi',
  {
    auth: {
      // Mantém a sessão entre recarregamentos e novas abas do mesmo navegador.
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
