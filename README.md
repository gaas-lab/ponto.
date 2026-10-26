# Ponto

Aplicação web para registrar a jornada de trabalho, acompanhar o saldo de horas e estimar o horário de saída. O sistema oferece calendário, dashboard, histórico, relatórios e administração de uma carga horária global.

## Funcionalidades

- Registro de entrada, saída para almoço, retorno do almoço e saída do expediente.
- Cálculo das horas trabalhadas, do saldo diário e do horário previsto para sair.
- Opção para usar o saldo acumulado na previsão de saída.
- Carga horária global configurável pelo usuário master e compartilhada por todas as contas. O padrão inicial é **8h48min**.
- Calendário com visualização mensal, semanal ou diária e indicação de feriados nacionais.
- Dashboard mensal com gráfico diário. Nos dias completos, as barras indicam carga abaixo da meta, carga exata ou carga acima da meta; o hover e o foco pelo teclado mostram as horas e o saldo do dia.
- Relatório mensal para impressão ou salvamento em PDF.
- Exportação de períodos para Excel e importação de registros em `.xlsx`, `.xls` ou `.csv` usando o modelo fornecido pelo app.
- Histórico completo dos registros.
- Notificação do navegador dez minutos antes da previsão de saída, se o usuário permitir.
- Perfil com nome e foto armazenada no Supabase Storage.
- Tema claro e escuro e interface responsiva para celular.
- Sincronização dos registros com o Supabase.

## Cálculo da jornada

O tempo trabalhado é a soma dos períodos entre entrada e saída para almoço e entre retorno do almoço e saída final. O intervalo não entra no total trabalhado.

O saldo diário é calculado quando as quatro batidas estão registradas:

```text
saldo do dia = tempo trabalhado − carga horária global
```

Dias com batidas incompletas aparecem como em andamento e não entram no saldo acumulado. A previsão usa a carga horária global e o intervalo registrado; se o intervalo ainda não estiver completo, considera uma hora.

## Administração master

A conta master pode consultar registros de todos os usuários, alterar a carga horária global e apagar os registros de um mês para a conta selecionada. A checagem de permissões ocorre tanto na interface quanto nas políticas e funções do banco.

Atualmente, a conta autorizada é `gaasbrel@gmail.com`. Se esse endereço mudar, atualize as verificações correspondentes em `src/main.jsx` e `supabase/setup.sql`.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| React 18 | Interface e componentes |
| Vite 6 | Desenvolvimento e build |
| CSS | Layout, temas e responsividade |
| Supabase Auth | Cadastro, login e sessão |
| Supabase Postgres e RLS | Registros de ponto, configuração global e permissões |
| Supabase Storage | Fotos de perfil |
| SheetJS (`xlsx`) | Importação e exportação de planilhas |
| Lucide React | Ícones |
| BrasilAPI | Consulta de feriados nacionais |
| Vercel | Hospedagem e publicação |

## Executar localmente

### Pré-requisitos

- Node.js e npm.
- Um projeto Supabase configurado.

### Instalação

```bash
git clone https://github.com/gaas-lab/ponto..git
cd 'ponto.'
npm install
```

Copie o exemplo para `.env.local` e configure as variáveis nesse arquivo:

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

O app também aceita `VITE_SUPABASE_ANON_KEY` no lugar de `VITE_SUPABASE_PUBLISHABLE_KEY`.

Execute `supabase/setup.sql` no SQL Editor do projeto Supabase. O script cria a tabela de registros, a configuração da carga global, as políticas de acesso, a função de administração e o bucket privado de avatares.

No Supabase Auth, habilite o método de e-mail e senha. Para desenvolvimento local, adicione `http://localhost:5173` às URLs autorizadas de redirecionamento, se necessário para o fluxo de confirmação de e-mail.

Inicie o servidor:

```bash
npm run dev
```

O Vite informa o endereço local no terminal. Para gerar e visualizar o build de produção:

```bash
npm run build
npm run preview
```

## Publicar na Vercel

1. Importe o repositório no projeto da Vercel.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente.
3. Publique o projeto. A Vercel detecta o Vite e executa o build com `npm run build`.
4. Adicione o domínio publicado às URLs autorizadas no Supabase Auth.

As chaves `VITE_*` são incluídas no bundle do navegador. Use somente a chave publicável/anon do Supabase; nunca coloque uma `service_role` ou outro segredo nessas variáveis.

## Estrutura do projeto

```text
.
├── index.html
├── package.json
├── package-lock.json
├── .env.example
├── src/
│   ├── main.jsx                 # Aplicação, páginas e cálculos de jornada
│   ├── styles.css               # Estilos base e componentes existentes
│   ├── design.css               # Sistema visual, temas e layout responsivo
│   ├── components/
│   │   ├── Account.jsx          # Login, cadastro e perfil
│   │   └── account.css
│   └── lib/
│       ├── supabase.js          # Cliente Supabase
│       └── spreadsheet.js       # Exportação lazy-loaded do SheetJS
└── supabase/
    └── setup.sql                # Tabelas, RLS, função master e Storage
```

## Dados e segurança

- Cada usuário pode ler e alterar os próprios registros.
- A conta master pode administrar os registros de todas as contas.
- As políticas de Row Level Security (RLS) aplicam essas permissões no Postgres.
- Fotos ficam em um bucket privado e são exibidas por URLs assinadas temporárias.
- A sessão de autenticação é gerenciada pelo Supabase Auth.

## Roadmap

- [x] Dashboard e gráfico de horas por dia
- [x] Carga horária global administrável pela conta master
- [x] Relatório mensal e exportação para PDF
- [x] Importação e exportação de planilhas
- [x] Histórico completo
- [x] Calendário mensal, semanal e diário
- [x] Tema claro e escuro
- [x] Notificação de previsão de saída
- [ ] PWA instalável
- [ ] Jornadas diferentes por usuário
- [ ] Banco de horas com regras de compensação
- [ ] Melhorias adicionais de acessibilidade

## Créditos

Desenvolvido por **Gabriel Rocha** · [Gaaslab](https://github.com/gaas-lab).

## Licença

Este repositório ainda não contém um arquivo de licença. Consulte o responsável antes de reutilizar ou redistribuir o código.
