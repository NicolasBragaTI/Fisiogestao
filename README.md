# FisioGestão

Aplicação web para organizar pacientes, agenda, atendimentos, pacotes de sessões e pagamentos de fisioterapia.

## Funcionalidades atuais

- Cadastro e acompanhamento de pacientes
- Agenda de atendimentos
- Controle de sessões avulsas e pacotes
- Pagamentos totais e parciais
- Indicadores financeiros e relatório mensal
- Autenticação e perfis com Supabase Auth
- Área administrativa

## Tecnologias

O projeto atual é uma aplicação web estática, sem etapa de compilação:

- HTML, CSS e JavaScript
- Supabase Auth, PostgreSQL e Data API
- Chart.js para gráficos
- Tabler Icons

## Executar localmente

É necessário servir a pasta por HTTP; abrir o arquivo diretamente pode impedir alguns recursos do navegador.

Com Node.js:

```bash
npx serve -p 3001 .
```

Ou com Python:

```bash
python3 -m http.server 3001
```

Depois, acesse `http://localhost:3001`.

## Configuração

O frontend utiliza somente a URL do projeto e uma chave pública moderna do Supabase. Chaves públicas são identificadas pelo prefixo `sb_publishable_` e dependem de políticas RLS corretas para proteger os dados.

Use [.env.example](.env.example) como referência para futuras configurações. Arquivos `.env` são locais e não devem ser versionados.

Nunca coloque no frontend ou no GitHub:

- Chaves `service_role`
- Chaves com prefixo `sb_secret_`
- Chaves da Resend
- Senhas, tokens pessoais ou credenciais administrativas

## Estrutura atual

```text
.
├── index.html          # Estrutura da aplicação
├── fisioterapia.png    # Ícone da aplicação
├── css/
│   └── app.css         # Estilos da interface
├── js/
│   ├── supabase-client.js # Cliente público do Supabase
│   ├── core.js         # Estado, persistência, helpers e navegação
│   ├── dashboard.js    # Indicadores e gráficos
│   ├── payments.js     # Pagamentos e lista de atendimentos
│   ├── patients.js     # Pacientes
│   ├── reports.js      # Relatórios e exportação
│   ├── appointments.js # Cadastro de atendimentos
│   ├── packages.js     # Pacotes de sessões
│   ├── agenda.js       # Agenda diária, semanal e mensal
│   ├── auth.js         # Autenticação, perfil e administração
│   └── init.js         # Inicialização da aplicação
├── .env.example        # Referência de configuração
├── .gitignore          # Arquivos locais ignorados
└── docs/
    └── SECURITY.md     # Regras e procedimento de segurança
```

## Próximas etapas técnicas

1. Auditar políticas RLS, funções privilegiadas e permissões do Supabase.
2. Registrar o esquema do banco em migrations versionadas.
3. Separar o `index.html` em módulos menores.
4. Adicionar testes dos fluxos de pacientes, sessões e pagamentos.
