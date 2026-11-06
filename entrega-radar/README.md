# EntregaRadar

Previsão de entregas de materiais e conexão entre empresas e transportadoras.

**Aluno:** Henry Matheus da Silveira
**Trabalho:** individual
**Etapa:** Entrega 2 - Banco de dados e autenticação
**Atualização:** 06/11/2026

EntregaRadar é o nome provisório do projeto. O sistema será voltado a empresas em geral, com foco nas indústrias que dependem do recebimento de materiais para manter sua produção.

## 1. Problema

Uma empresa precisa saber quando os materiais comprados vão chegar para organizar suas atividades. Na indústria, uma entrega atrasada pode comprometer uma etapa da produção, deixar uma equipe esperando ou exigir uma compra de última hora.

A data informada no pedido nem sempre acompanha o que está acontecendo com a entrega. Quando as informações ficam espalhadas em mensagens e planilhas, a empresa pode perceber o atraso somente quando o prazo já venceu. Isso reduz o tempo disponível para reorganizar a produção ou procurar outra alternativa.

Além disso, empresas que não possuem uma transportadora parceira precisam encontrar quem possa realizar o transporte dos materiais. Nem sempre é fácil comparar as regiões atendidas, os tipos de carga e a disponibilidade dos prestadores.

### Público afetado

- Empresas que compram e recebem materiais, principalmente indústrias.
- Profissionais de compras, logística e planejamento da produção.
- Transportadoras interessadas em atender novas empresas.

### Justificativa

Reunir pedidos, etapas do transporte e histórico de entregas em um único lugar pode ajudar as empresas a identificar problemas com antecedência. Uma área de transportadoras também pode facilitar a busca de um parceiro quando a empresa ainda não possui um.

## 2. Proposta de solução

Desenvolver um sistema web para acompanhar pedidos de materiais, apresentar estimativas de chegada e sinalizar risco de atraso. A previsão deverá considerar os registros de entregas anteriores e as atualizações do pedido, mostrando também o motivo do alerta e quando a informação foi atualizada.

O sistema terá uma área para transportadoras cadastrarem seus serviços, regiões atendidas, tipos de material transportado e disponibilidade. A empresa poderá pesquisar esses cadastros, solicitar atendimento e acompanhar a confirmação da transportadora.

O diferencial da proposta será reunir a previsão de entrega e a busca de transporte no mesmo sistema, ajudando a empresa tanto no acompanhamento quanto na escolha de um parceiro.

### Objetivo geral

Ajudar empresas a planejar o recebimento de materiais e agir antes que um atraso prejudique suas atividades.

### Objetivos específicos

- Centralizar informações dos pedidos e das entregas.
- Comparar o prazo combinado com a estimativa atual de chegada.
- Destacar pedidos que precisam de atenção e explicar o motivo.
- Registrar o resultado real das entregas para melhorar as próximas estimativas.
- Aproximar empresas contratantes e transportadoras disponíveis.

## 3. Principais funcionalidades previstas

Esta seção preserva a visão geral do projeto. O estado implementado está na seção 8; cadastro e login já funcionam na Entrega 2.

| Funcionalidade | Descrição |
| --- | --- |
| Cadastro e login | Acesso de usuários com perfis e permissões diferentes. |
| Cadastro de empresas | Registro da empresa contratante e de seus dados básicos. |
| Cadastro de transportadoras | Perfil com apresentação, contato, regiões atendidas, tipos de material e disponibilidade informada. |
| Diretório de transportadoras | Pesquisa de prestadores por região, tipo de material e disponibilidade. |
| Pedidos de materiais | Cadastro, consulta, alteração e exclusão de pedidos, respeitando as regras do sistema. Esta será a entidade principal do CRUD. |
| Solicitação de transporte | Envio de uma solicitação a uma transportadora escolhida, que poderá aceitar ou recusar o atendimento. |
| Acompanhamento | Registro de etapas, datas e observações sobre o transporte. |
| Estimativa de chegada | Exibição da data ou faixa estimada, com indicação da base de dados utilizada. |
| Alertas no painel | Avisos de risco de atraso, prazo vencido ou falta de atualização, com seus motivos. |
| Histórico de entregas | Registro da data real de chegada e comparação com o prazo e a previsão. |

## 4. Tipos de usuários e ações previstas

Os perfis representam as permissões dos usuários. Cada empresa poderá ter usuários vinculados à sua organização.

| Perfil | Ações previstas |
| --- | --- |
| Empresa contratante | Gerenciar seus próprios pedidos, consultar previsões e alertas, pesquisar transportadoras, solicitar transporte e confirmar o recebimento dos materiais. |
| Transportadora | Manter o cadastro de seus serviços, informar sua disponibilidade, aceitar ou recusar solicitações e atualizar as etapas das entregas sob sua responsabilidade. |
| Administrador | Gerenciar os cadastros e os acessos da plataforma e atuar sobre registros inadequados. Esse perfil não será escolhido livremente no cadastro público. |

Uma empresa contratante não poderá acessar os pedidos de outra empresa. A transportadora terá acesso apenas às solicitações recebidas e aos transportes vinculados a ela. As verificações de acesso deverão acontecer na API, além da interface.

## 5. Fluxo básico de funcionamento

### Empresa que já possui um parceiro de transporte

1. O usuário acessa o sistema com o perfil de empresa contratante.
2. Cadastra o pedido, informando material, fornecedor, origem, destino e prazo combinado.
3. Registra os dados do transporte. Se o parceiro não tiver conta na plataforma, a própria contratante será responsável pelas atualizações.
4. Acompanha as etapas e consulta a estimativa de chegada.
5. Recebe avisos no painel quando houver sinais de atraso ou falta de informação.
6. Confirma o recebimento. A data real passa a fazer parte do histórico.

### Empresa que precisa encontrar transporte

1. A transportadora se cadastra e informa as regiões atendidas, os materiais transportados e sua disponibilidade.
2. A empresa contratante pesquisa no diretório e escolhe uma transportadora compatível com sua necessidade.
3. Envia uma solicitação de transporte para um pedido seu.
4. A transportadora aceita ou recusa. Se recusar, a empresa poderá escolher outra.
5. Com a aceitação, a transportadora fica vinculada ao pedido e passa a atualizar as etapas do transporte.
6. A empresa acompanha a estimativa, os alertas e a conclusão da entrega.

Na primeira versão, a área de transportadoras funcionará como um diretório com solicitação de atendimento. Não estão previstos leilão de frete, pagamento ou contratação financeira pela plataforma.

## 6. Planejamento das previsões e dos alertas

A proposta é buscar estimativas próximas da realidade, sem tratar uma previsão como garantia de chegada. A qualidade dependerá da quantidade e da atualização dos dados disponíveis.

### Informações previstas

- Data de criação do pedido e data prometida para a entrega.
- Fornecedor, transportadora, origem e destino.
- Tipo de material e quantidade, com a unidade informada.
- Etapa atual e data da última atualização.
- Datas das etapas anteriores e data real de recebimento.

As etapas iniciais previstas são: aguardando confirmação, confirmado, em preparação, despachado, em transporte e entregue. O cancelamento será tratado separadamente.

### Funcionamento planejado

O sistema deverá comparar o pedido com entregas anteriores semelhantes, considerando o fornecedor, a transportadora, o percurso e o andamento das etapas. A estimativa será revista quando o pedido receber uma atualização. A faixa estimada e o nível de confiança deverão ser baseados no histórico disponível, e não em percentuais inventados.

Sem histórico suficiente, o sistema mostrará o prazo informado e a indicação de que ainda não há base suficiente para uma previsão histórica. Mesmo assim, poderá alertar sobre prazo vencido e falta de atualização.

Um alerta de risco poderá aparecer antes do vencimento se o andamento do pedido e o tempo restante indicarem dificuldade para cumprir a data combinada. A falta de atualização será identificada como falta de informação, sem afirmar que um atraso foi confirmado.

Exemplo ilustrativo de apresentação, que não representa um cálculo implementado:

> Prazo combinado: 20/11. Chegada estimada: de 22/11 a 24/11. Motivo do alerta: o material ainda não foi despachado e o histórico de pedidos semelhantes indica que o transporte costuma durar mais do que o tempo restante.

O histórico deverá permitir comparar previsões e datas reais, verificando a diferença em dias e a frequência com que as entregas ocorreram dentro da faixa prevista. Esses resultados ajudarão a avaliar e ajustar o cálculo no desenvolvimento posterior.

O [plano de validação com dados reais](docs/validacao-previsoes.md) detalha a coleta, a separação cronológica, as referências de comparação, as métricas e as mensagens de limitação. A validação ainda não foi executada: não há base real fornecida nem cálculo implementado nesta etapa.

**Premissa inicial:** os dados serão cadastrados e atualizados pelos usuários. Não estão previstas, nesta versão, integrações com GPS, sistemas de gestão das empresas ou serviços de clima e trânsito. Os avisos serão exibidos no painel; e-mail e WhatsApp não fazem parte do escopo inicial.

## 7. Regras de negócio previstas

- Somente usuários autorizados da contratante poderão gerenciar seus pedidos.
- Uma solicitação de transporte deverá pertencer a um pedido da empresa solicitante.
- O pedido terá no máximo uma transportadora responsável confirmada por vez.
- A indicação de disponibilidade no diretório não garante atendimento; a transportadora deverá confirmar cada solicitação.
- Uma transportadora não poderá atualizar pedidos que não estejam vinculados a ela.
- A confirmação de recebimento será feita pela empresa contratante, com a data real da chegada.
- Pedidos ainda não iniciados poderão ser excluídos. Após o início do transporte, alterações e cancelamentos deverão preservar o histórico.
- O prazo combinado e as previsões anteriores serão preservados para permitir a comparação com a entrega real.
- A pesquisa de transportadoras mostrará informações comerciais. Pedidos e endereços detalhados não ficarão públicos.
- Os alertas deverão indicar o motivo e a data da última atualização utilizada.


## 8. Entrega 2 concluída no código

Mantidos CommonJS, Node.js/Express e as pastas backend, frontend e sql, com app.js separado de server.js. A referência sistema_RPG foi consultada pela organização, sem copiar sua autenticação de sessões (aqui JWT é obrigatório).

- Esquema MySQL relacional com seis tabelas, chaves, índices e restrições.
- Cadastro transacional: cria organização e usuário juntos, ou desfaz tudo.
- Perfis públicos contratante e transportadora; administrador somente por CLI local.
- Senhas com scrypt da biblioteca nativa node:crypto, salt aleatório de 16 bytes, N=32768, r=8, p=3, comparação em tempo constante; senha de 12 a 128 caracteres.
- JWT HS256 válido por uma hora, com subject, issuer e audience verificados; segredo obrigatório com pelo menos 32 bytes, sem valor padrão.
- API consulta o perfil atual e o estado ativo no banco em cada chamada protegida.
- Login limitado a 30 requisições de autenticação por IP em 15 minutos (cadastro compartilha o limite). Limitador local em memória, adequado à demonstração em uma instância.
- Consultas parametrizadas; e-mail normalizado e único, erros sem SQL/segredos/hash.
- Telas simples com labels, confirmação de senha, mensagens acessíveis, botões desabilitados durante requisições e Fetch na mesma origem.

### Modelo e vínculos

| Tabela | Relações e finalidade |
| --- | --- |
| empresas | Organização contratante; possui vários usuários e pedidos. |
| transportadoras | Organização prestadora; serviços, regiões, tipos de material e disponibilidade preparados para o futuro. |
| usuarios | E-mail único, hash e perfil. Contratante exige empresa; transportadora exige prestadora; admin não tem vínculo. CHECK impede combinações incompatíveis. |
| pedidos | Pertence a uma empresa, com no máximo uma transportadora vinculada. Quantidade positiva e prazo original. |
| solicitacoes_transporte | Liga pedido a prestadora. FK composta pedido/empresa impede atribuir a solicitação a outra empresa. |
| atualizacoes_entrega | Histórico do pedido com usuário autor, etapa, data e observação. |

Todas as tabelas usam InnoDB, PK auto incremental, UTF-8 e FKs sem exclusão em cascata para preservar histórico. O SQL é inicial, idempotente por CREATE IF NOT EXISTS; não migra tabelas de versões anteriores.

Isolamento: o cadastro não aceita empresa_id, transportadora_id ou campos adicionais, e cria uma organização própria. Não há vínculo por nome nem adesão automática a empresas existentes. `/api/usuarios/me` usa exclusivamente o subject autenticado; IDs em query/body não selecionam usuários ou organizações. Nenhuma rota de pedidos/empresas está exposta nesta etapa. Na Entrega 3 cada consulta deverá incluir `empresa_id = req.usuario.empresa_id` para contratantes; prestadoras deverão comprovar vínculo confirmado ao pedido. A FK não substitui essa autorização. Convites para equipes ficam para uma etapa posterior.

### Instalação e execução local

Requer Node.js 22+ e MySQL 8.0.16+ (versão com CHECK aplicado). Na pasta `entrega-radar/backend`:

```bash
npm ci
```

Copie `.env.example` para `.env`. Configure `DB_HOST`, `DB_PORT`, `DB_NAME=entrega_radar`, `DB_USER`, `DB_PASSWORD`, `PORT=3000` e `JWT_SECRET`. Gere um segredo local, mantenha-o privado e cole somente no `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O arquivo `.env` é carregado da pasta backend mesmo se iniciar por outro diretório. Execute o SQL com uma conta local com permissão de criar banco/tabelas:

```bash
npm run db:setup
```

Alternativa: abra `sql/entrega_radar.sql` no MySQL Workbench e execute integralmente. O script usa o nome fixo `entrega_radar`. Depois, use no `.env` uma conta de aplicação limitada a SELECT/INSERT/UPDATE/DELETE nesse banco, sem permissões administrativas ou de DDL.

```bash
npm start
```

Abra **http://localhost:3000**. O Express serve frontend e API juntos; não abra index.html via file://. Cadastro cria a conta; depois faça login. O servidor local escuta apenas 127.0.0.1. A rota `/api` identifica a etapa sem consultar o banco.

JWT fica somente na memória da página; sair remove a referência local e recarregar pede novo login. Não há refresh token ou revogação individual no logout; um token copiado continua válido até expirar. Desativar o usuário no banco bloqueia novas chamadas imediatamente. Não há recuperação de senha nesta entrega. Para uso público futuro: HTTPS, segredo privado, limite distribuído entre instâncias e revisão da gestão de sessões.

### Primeiro administrador

Após preparar o banco, execute no terminal local de backend:

```bash
npm run admin
```

Informe nome e e-mail; digite uma senha de 12–128 caracteres e confirme-a na próxima entrada (ambas ocultas). O CLI insere uma nova conta com hash e perfil administrador. E-mails existentes são rejeitados, sem promover contas públicas. Não existe senha fixa, argumento de senha no shell ou endpoint de criação administrativa. Proteja o acesso ao terminal e ao banco.

### Rotas

| Método e rota | Acesso | Resultado |
| --- | --- | --- |
| GET /api | Público | Identificação da API. |
| POST /api/auth/cadastro | Público | nome, email, senha, perfil, organizacao. 201 ou 400/409. |
| POST /api/auth/login | Público | email, senha; retorna token Bearer e expiração. 200 ou 400/401. |
| GET /api/usuarios/me | Bearer válido | Dados básicos do próprio usuário, sem hash. |
| GET /api/admin/painel | Administrador | Demonstra autorização; perfis públicos recebem 403. |

Exemplo de corpo de cadastro (escolha sua própria senha; valores abaixo são somente ilustrativos):

```json
{"nome":"Pessoa Exemplo","email":"pessoa@example.test","senha":"uma frase privada longa","perfil":"contratante","organizacao":"Empresa Exemplo"}
```

Para transportadoras altere perfil para `transportadora`. Login recebe apenas e-mail e senha. Para testar pelo cliente HTTP, copie o token retornado e envie o header `Authorization: Bearer <token>` na rota `/api/usuarios/me`; repita no painel administrativo para verificar 403. Sem token, adulterado ou expirado deve retornar 401. Não compartilhe tokens em capturas ou commits.

### Verificação executada e limites

```bash
npm test
npm audit --omit=dev
```

Em 06/11/2026: quatro testes aprovados, zero falhas, um teste MySQL real ignorado; auditoria de dependências de produção sem vulnerabilidades reportadas.

Os quatro testes usam banco simulado e verificam validação, rejeição de cadastro admin e IDs externos, hash/salt, duplicidade com rollback, login incorreto/correto, JWT válido/ausente/adulterado/expirado/sem exp/emissor incorreto, usuário inativo, 403 para ambos os perfis públicos e 200 para administrador. Também verificam erro interno sanitizado, JSON inválido e ausência de acesso a `.env`.

O teste de interface usa jsdom, carrega HTML/JS servido pelo Express e executa cadastro → login → minha conta → saída com Fetch HTTP real e banco simulado. Não é teste visual de navegador.

**Pendente de execução:** criação real das tabelas, FKs/CHECK, transações e persistência MySQL. Não havia serviço MySQL acessível em 127.0.0.1:3306 (ECONNREFUSED), cliente MySQL ou Docker disponíveis. O teste de banco real está em `backend/tests/mysql.test.js`. Para executá-lo, com uma instância MySQL disponível e credenciais que possam criar um banco exclusivo, configure `DB_NAME=entrega_radar_test` e `RUN_MYSQL_TESTS=1` no ambiente do processo e execute `npm test`. O teste cria esse banco sem apagar tabelas existentes, insere dados de e-mail aleatório e remove seus registros no final. Nunca aponte esse teste ao banco de uso real. O restante dos testes não requer banco; execute sem RUN_MYSQL_TESTS para ignorá-lo.

Codex Security: revisão estática formal de 19 arquivos de backend/SQL do snapshot inicial, sem vulnerabilidades confirmadas; cobertura parcial, excluindo interface, testes, lockfile e alterações posteriores. Essa revisão não substitui execução do banco nem auditoria futura dos fluxos da Entrega 3.

### Ferramentas e referências

Context7 consultado para Express 5 (propagação de erros async), mysql2/promise (pool, execute e placeholders) e jsonwebtoken (expiração, algoritmos, issuer e audience). Hash fundamentado na [documentação oficial node:crypto](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). Codex Security usado para revisão do diff de backend/SQL. Product Design teve suas orientações consultadas; fluxo foi mantido simples com base na interface existente, sem projeto visual novo.

Figma não foi necessário: não há referência visual fornecida nem redesign solicitado. OpenAI Developers não se aplicou: nenhuma integração IA. Supabase não foi usado porque o banco obrigatório é MySQL. Não foi contratado ou publicado serviço.

Hospedagem futura: manter frontend/API na mesma origem, com processo Node.js/Express e MySQL em host privado. Frontend estático também pode ficar na Vercel, desde que se configure um proxy para a API ou CORS restrito à origem autorizada. A API poderia ser adaptada para Vercel Functions com MySQL externo, pool dimensionado e limites de execução verificados; MySQL não é instalado dentro da Function. Consulte [limites oficiais](https://vercel.com/docs/functions/limitations). A configuração atual é local e não pretende ser um deploy pronto. Orientações de arquitetura da skill Vercel consultadas, sem alteração em conta/projeto.

## 9. Próximas entregas

Entrega 3: CRUD de pedidos com permissões por organização, histórico e integração completa. Etapas posteriores: diretório funcional, solicitações/aceites, etapas de entrega, estimativas, alertas e avaliação das previsões. As tabelas desses fluxos estão preparadas, porém não há endpoints de negócio implementados. Não há IA, GPS, pagamentos ou serviços externos adicionados.

## 10. GitHub

As quatro entregas permanecem na mesma pasta e repositório. `.gitignore` exclui node_modules, .env e temporários. Versionados apenas fonte, SQL, lockfile, testes e documentação. Antes de registrar novos commits, revise `git status` e selecione somente `entrega-radar`.

## 11. Acompanhamento do parecer da Entrega 1

O professor atribuiu **PD - Plenamente Desenvolvido** aos quatro indicadores, considerando o estado de 30/10/2026 no commit `1872a43`. As orientações são manter commits descritivos, atualizar a documentação, preservar a separação de responsabilidades e validar as previsões com dados reais, comunicando suas limitações.

O [acompanhamento das orientações](docs/acompanhamento.md) relaciona cada recomendação às ações tomadas e às pendências. A documentação dos módulos ativos foi atualizada, e a identificação pública da API também passa por rota e controller próprios. A validação real de previsões permanece planejada para as etapas posteriores, sem resultados ou percentuais inventados.
