# Revisão legal e de privacidade do Ponto

**Levantamento preliminar do código — 25 de outubro de 2026. Não é parecer jurídico.** Serve para orientar decisões de produto e revisão profissional antes de divulgar políticas como definitivas.

## Escopo observado

- Cadastro por e-mail e senha via Supabase Auth; o cadastro também envia nome como metadado.
- Registros de jornada por data e batidas de horário no Supabase Postgres, com cópia local em `localStorage`.
- Foto opcional em bucket privado do Supabase Storage; nome e caminho da foto também ficam nos metadados do usuário e em armazenamento local.
- Preferências de tema, calendário, uso de saldo e notificação ficam no navegador. Notificação usa a permissão nativa do navegador.
- A BrasilAPI é consultada por ano para carregar feriados.
- Google Fonts é carregado por uma importação CSS externa, expondo requisições técnicas do navegador ao provedor.
- Vercel é indicada no README como hospedagem.
- Não foi encontrada integração de analytics ou anúncios nas fontes examinadas.

## Pontos que precisam de decisão ou confirmação

1. **Acesso privilegiado:** o código e as políticas RLS dão à conta `gaasbrel@gmail.com` acesso aos nomes, e-mails, totais e registros de todas as contas, além de exclusão mensal. Para um produto de uso pessoal, decidir se esse acesso é realmente necessário. Se permanecer, precisa ser informado de modo destacado e protegido com controles e registros de acesso.
2. **Exclusão integral:** não há fluxo para o usuário excluir a conta. Excluir a conta no Supabase apaga registros relacionados por cascata, mas o arquivo no Storage requer exclusão separada. Implementar um pedido de exclusão verificável e um procedimento para apagar conta, avatar, cache e cópias de segurança segundo prazo documentado.
3. **Retenção:** definir prazos para contas inativas, registros, fotos, logs dos fornecedores e backups; hoje não há política automática de retenção observável no código.
4. **Fornecedores e transferência internacional:** confirmar região real do projeto Supabase, subprocessadores, termos de tratamento de dados do Supabase e Vercel, retenção de logs e mecanismo jurídico de eventual transferência internacional. A política deve descrever os fatos e mecanismos concretos, não apenas dizer que podem existir transferências.
5. **Direitos e canal LGPD:** confirmar que `gaasbrel@gmail.com` é um canal monitorado para pedidos, estabelecer verificação proporcional de identidade, prazos, responsável e processo para acesso/correção/exclusão/portabilidade aplicável. A Resolução ANPD nº 2/2022 só permite flexibilizações se o agente realmente preencher seus critérios.
6. **Aviso no cadastro:** dar acesso claro à Política de Privacidade e aos Termos antes de criar conta. Registrar versão e data de aceite se os termos forem aceitos; não usar consentimento genérico como base para tratamentos que dependem de outra hipótese legal.
7. **Uso trabalhista:** por decisão do responsável, o produto se destina a controle pessoal. Se passar a ser oferecido a empregadores para registrar jornada de empregados, reavaliar como produto distinto. A CLT e a Portaria MTP nº 671/2021 impõem regras a sistemas oficiais, como integridade das marcações e arquivos/comprovantes específicos. O código atual permite alteração e exclusão de registros e não implementa os requisitos de um REP-P.
8. **Relação de consumo e responsabilidade:** se o serviço for oferecido comercialmente ou ao público como serviço, revisar CDC, oferta, suporte, disponibilidade, cobrança e cláusulas contratuais. Não confiar em uma cláusula genérica de isenção para afastar direitos legais.
9. **Segurança operacional:** documentar acesso administrativo, MFA para a conta master, revisão de RLS e chaves, atualização de dependências, backups, resposta a incidentes e prazos de notificação. O regulamento atual da ANPD prevê comunicação de incidentes relevantes e registro de incidentes por pelo menos cinco anos.
10. **Licenças de terceiros:** a licença MIT cobre o código deste repositório de autoria do titular nomeado; conferir licenças de dependências, fontes, imagens, marcas e outros materiais antes de redistribuição.

## Fontes oficiais

- [Lei nº 13.709/2018 — LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Resolução CD/ANPD nº 2/2022 — agentes de tratamento de pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
- [Resolução CD/ANPD nº 15/2024 — comunicação de incidentes](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
- [Resolução CD/ANPD nº 19/2024 — transferência internacional](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- [CLT, art. 74](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm)
- [Portaria MTP nº 671/2021, texto compilado](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/legislacao/portarias-1/portarias-vigentes-3/PDFPortarian671de8denovembrode2021compilada03.06.2024.pdf)
