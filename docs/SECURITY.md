# Segurança

## Chaves e credenciais

O navegador pode receber apenas chaves públicas do Supabase. A segurança dos registros deve ser garantida por autenticação, Row Level Security (RLS) e políticas de propriedade por usuário.

Chaves administrativas e de serviços externos devem existir somente em ambientes de servidor ou em um gerenciador de segredos. Elas nunca devem ser gravadas em arquivos de assistentes, código-fonte, histórico Git ou mensagens de commit.

## Supabase

Todas as tabelas expostas pela Data API devem ter RLS habilitado. As políticas precisam limitar cada registro ao usuário proprietário, normalmente comparando `auth.uid()` com a coluna `user_id`.

Operações de atualização precisam de políticas `SELECT` e `UPDATE`. A política de `UPDATE` deve definir tanto `USING` quanto `WITH CHECK`, impedindo que um usuário transfira registros para outro `user_id`.

Funções `SECURITY DEFINER` exigem revisão especial porque podem ignorar RLS. Funções privilegiadas não devem ficar publicamente executáveis sem validação explícita do usuário e da função administrativa.

## Resposta a vazamento

Quando uma credencial for exposta:

1. Remova-a dos arquivos atuais.
2. Revogue ou desative a credencial no provedor.
3. Crie uma substituta com o menor nível de permissão necessário.
4. Atualize somente os ambientes autorizados.
5. Verifique logs de uso e o histórico Git.
6. Confirme que a credencial anterior não é mais aceita.
