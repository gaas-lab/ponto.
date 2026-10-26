# Política de Privacidade — rascunho para revisão

**Versão preliminar — 25 de outubro de 2026.** Este texto descreve o funcionamento encontrado no código da instância hospedada do Ponto e ainda precisa ser confirmado contra as configurações reais dos provedores antes de ser apresentado como política vigente.

## Quem trata os dados

Para a instância do Ponto mantida por Gaaslab, o responsável indicado neste rascunho é **Gabriel Rocha**, contato: [gaasbrel@gmail.com](mailto:gaasbrel@gmail.com). O usuário ou organização que instalar uma cópia própria do software será responsável por definir e informar sua própria política.

## Dados e finalidades

O Ponto trata os dados abaixo para fornecer a conta e as funções que o usuário solicita:

| Dados | Para que são usados |
| --- | --- |
| E-mail, credencial de autenticação e nome informado no cadastro | Criar a conta, autenticar e identificar o perfil. A autenticação é processada pelo Supabase Auth. |
| Token de sessão e cópias locais | Manter a sessão e permitir que o app recupere preferências e registros neste navegador. |
| Datas e horários de jornada inseridos pelo usuário | Mostrar calendário, horas trabalhadas, saldo, previsão de saída, relatórios e planilhas. |
| Foto de perfil opcional | Exibir o perfil do usuário. A foto é armazenada em bucket privado do Supabase Storage. |
| Preferências de tema, calendário, saldo e notificações | Lembrar escolhas no navegador por meio do armazenamento local (`localStorage`). |
| Dados técnicos de acesso | Podem ser tratados pelos provedores de hospedagem, autenticação e infraestrutura para operação, segurança e diagnóstico, conforme a configuração e os termos desses provedores. |

O código consulta a BrasilAPI para obter feriados nacionais, enviando o ano consultado, e carrega fontes do Google Fonts. Essas requisições podem revelar dados técnicos da conexão, como o endereço IP, aos respectivos provedores. Não encontramos integração de analytics ou publicidade no código analisado. O navegador mantém a sessão de autenticação e cópias locais de preferências e registros; limpar o armazenamento do navegador remove essas cópias locais, mas não apaga os dados no Supabase.

## Bases legais

Como avaliação inicial, os dados necessários à criação da conta e às funções solicitadas podem ser tratados para execução do serviço solicitado pelo titular (art. 7º, V, da LGPD). A ativação opcional de notificações depende da permissão do navegador e deve permanecer desligada sem essa escolha. A base aplicável a cada operação precisa ser confirmada pelo responsável, considerando o uso real da instância.

O Ponto não solicita intencionalmente dados pessoais sensíveis. Registros de horários, mesmo quando não forem dados sensíveis na definição legal, são dados pessoais quando associados à conta e podem revelar aspectos da rotina de alguém.

## Compartilhamento e operadores

O serviço usa Supabase para autenticação, banco de dados e armazenamento de fotos; Vercel para hospedagem/publicação; BrasilAPI para consultar feriados; e Google Fonts para carregar fontes. Esses provedores recebem ou podem processar dados técnicos necessários à prestação de seus serviços, nos termos das configurações e contratos aplicáveis.

**Atenção:** a configuração atual contém uma conta master que pode consultar a lista de usuários (incluindo e-mail, nome e quantidade de registros), ler registros de todas as contas e apagar os registros de um mês. Esse acesso administrativo deve ser removido ou claramente aceito como parte do modelo de serviço antes de divulgar esta política como definitiva.

Os locais de hospedagem e os mecanismos usados para eventual transferência internacional ainda precisam ser verificados nos painéis e contratos dos provedores. Se houver transferência internacional, o responsável deve informar país, finalidade, agentes, salvaguardas e mecanismo válido nos termos da LGPD e da Resolução CD/ANPD nº 19/2024.

## Retenção e exclusão

Os registros de jornada permanecem na conta até que o usuário os apague ou solicite a exclusão. O banco relaciona esses registros à conta e prevê remoção em cascata se a conta for excluída. Atualmente, a interface não permite ao usuário excluir a conta, e arquivos de foto no Storage precisam de tratamento próprio. A exclusão integral deve ser solicitada pelo canal de contato acima até existir um fluxo automático.

As cópias locais persistem no navegador até serem substituídas ou apagadas pelo próprio usuário. Provedores de infraestrutura podem manter logs por prazos definidos em seus contratos e políticas. O responsável deve confirmar e documentar os prazos reais de retenção e eventuais cópias de segurança.

## Direitos do titular

O titular pode solicitar confirmação e acesso aos dados, correção, informação sobre compartilhamento, portabilidade quando aplicável, anonimização, bloqueio ou eliminação nos casos previstos em lei, além de informações sobre a finalidade e a duração do tratamento. Pedidos podem ser enviados gratuitamente para [gaasbrel@gmail.com](mailto:gaasbrel@gmail.com). Poderemos pedir informações proporcionais para confirmar a identidade e proteger a conta.

Se o responsável se enquadrar como agente de tratamento de pequeno porte, algumas obrigações podem ter procedimento simplificado; isso não elimina os deveres da LGPD nem os direitos dos titulares.

## Segurança e incidentes

O sistema usa autenticação Supabase, políticas de Row Level Security para separar registros por conta e bucket privado para fotos. A conta master descrita acima é uma exceção expressa a essa separação. Nenhum serviço conectado à internet pode prometer risco zero.

Incidentes que possam causar risco ou dano relevante devem ser avaliados e comunicados pelo controlador à ANPD e aos titulares nos prazos e condições vigentes. O canal para contato e orientações sobre direitos é [gaasbrel@gmail.com](mailto:gaasbrel@gmail.com).

## Alterações desta política

Publicaremos uma versão atualizada com data da alteração quando mudarem os dados tratados, finalidades, provedores, retenção ou forma de acesso. A versão acima permanece identificada como rascunho até as pendências de [`REVISAO_LEGAL.md`](REVISAO_LEGAL.md) serem resolvidas.
