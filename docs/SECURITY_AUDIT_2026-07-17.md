# Auditoria de segurança — 17/07/2026

## Escopo

- Credenciais presentes nos arquivos locais
- Chaves públicas e legadas do Supabase
- Chaves da Resend
- RLS das tabelas públicas
- Permissões de funções `SECURITY DEFINER`

## Correções concluídas

- Removidas credenciais administrativas das configurações locais do Claude.
- Migrado o frontend da chave legada `anon` para uma chave `sb_publishable_`.
- Desativadas as chaves legadas `anon` e `service_role` no Supabase.
- Excluídas as duas chaves da Resend encontradas no arquivo exposto.
- Mantida apenas uma chave recente da Resend que não constava no vazamento.
- Confirmado RLS habilitado em `pacientes`, `atendimentos`, `pacotes` e `profiles`.
- Políticas restringidas ao papel `authenticated`.
- Adicionado `WITH CHECK` às políticas que permitem alterar registros com `user_id`.
- Removida a execução anônima das quatro funções `SECURITY DEFINER`.
- Removida a execução direta de `handle_new_user`, que deve ser chamada apenas pelo gatilho de autenticação.

## Verificação

- A chave pública moderna respondeu corretamente à Data API.
- A chave legada passou a ser rejeitada após a desativação.
- Nenhum JWT administrativo ou chave da Resend permanece nos arquivos locais.
- Consultas a `pg_policies` confirmaram `authenticated` em todas as políticas.
- Consultas a `pg_proc` confirmaram `anon_execute = false` nas quatro funções privilegiadas.

## Alertas restantes

- O advisor mantém avisos para três funções `SECURITY DEFINER` executáveis por usuários autenticados. Isso é necessário para os RPCs atuais; as funções validam `auth.uid()` e, no caso administrativo, conferem `profiles.role = 'admin'`.
- A proteção do Supabase Auth contra senhas conhecidas como vazadas está desabilitada. A ativação deve ser avaliada no painel de Auth, considerando os recursos disponíveis no plano atual.
- O banco local do Supabase ainda não está configurado, portanto a migration foi verificada contra a produção, mas não executada em uma instância local.

## Registro da alteração

A alteração de banco está registrada em:

`supabase/migrations/20260717191543_harden_rls_and_function_privileges.sql`
