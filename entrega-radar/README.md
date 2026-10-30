# EntregaRadar

Previsão de entregas de materiais e conexão entre empresas e transportadoras.

**Aluno:** Henry Matheus da Silveira  
**Trabalho:** individual  
**Etapa:** Entrega 1 - Problema e estrutura inicial  
**Data:** 30/10/2026

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

As funcionalidades desta seção serão desenvolvidas nas próximas etapas. Nesta entrega, elas estão apenas planejadas.

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

## 8. Tecnologias e organização

Serão utilizadas as tecnologias solicitadas no trabalho: HTML, CSS, JavaScript, manipulação do DOM, Fetch, Node.js, Express, MySQL, API REST, JWT e controle de acesso.

O código inicial segue o padrão de módulos CommonJS do projeto de referência da atividade, com `require` e `module.exports`. A organização também segue o projeto `sistema_RPG` deste repositório: `backend`, `frontend` e `sql`, com rotas, controllers, middlewares e arquivos de banco separados. No backend, `app.js` configura a aplicação e `server.js` inicia o servidor.

| Caminho | Responsabilidade |
| --- | --- |
| `backend/app.js` | Configuração inicial do Express e ligação com as rotas implementadas. |
| `backend/server.js` | Inicialização do servidor. |
| `backend/routes/` | Associação entre os caminhos da API e os controllers. |
| `backend/controllers/` | Tratamento das requisições e, futuramente, regras dos pedidos e demais recursos. |
| `backend/middlewares/` | Local previsto para autenticação, autorização e validações compartilhadas. |
| `backend/database/` | Local previsto para a conexão com o MySQL. |
| `backend/tests/` | Pasta reservada para os testes das próximas etapas. |
| `backend/.env.example` | Modelo sem credenciais para a configuração futura do banco e do JWT. Ainda não é carregado pelo servidor. |
| `backend/package.json` | Identificação do back-end, dependências iniciais e comandos de execução. |
| `frontend/` | Estrutura inicial da interface em HTML, CSS e JavaScript. |
| `frontend/css/` | Estilos da interface. |
| `frontend/js/` | Scripts da interface e futura integração com a API por Fetch. |
| `frontend/assets/` | Imagens e outros recursos visuais futuros. |
| `sql/` | Local reservado para os scripts do banco de dados das próximas entregas. |
| `README.md` | Documentação do projeto, atualizada a cada entrega. |
| `.gitignore` | Exclusão de dependências, configurações privadas e arquivos temporários do Git. |

### Arquivos iniciais por módulo

Os módulos abaixo já possuem seus arquivos de rotas e controllers criados. Eles estão reservados para implementação posterior e ainda não oferecem endpoints funcionais.

| Módulo | Arquivo em `backend/routes/` | Arquivo em `backend/controllers/` |
| --- | --- | --- |
| Autenticação | `authRoutes.js` | `authControllers.js` |
| Usuários | `usuariosRoutes.js` | `usuariosControllers.js` |
| Administração | `adminRoutes.js` | `adminControllers.js` |
| Empresas contratantes | `empresasRoutes.js` | `empresasControllers.js` |
| Transportadoras | `transportadorasRoutes.js` | `transportadorasControllers.js` |
| Pedidos de materiais | `pedidosRoutes.js` | `pedidosControllers.js` |
| Solicitações de transporte | `solicitacoesRoutes.js` | `solicitacoesControllers.js` |
| Acompanhamento das entregas | `entregasRoutes.js` | `entregasControllers.js` |
| Previsões | `previsoesRoutes.js` | `previsoesControllers.js` |
| Alertas | `alertasRoutes.js` | `alertasControllers.js` |

A rota pública de identificação continua em `inicioRoutes.js` e `inicioController.js`. Os arquivos de autenticação, autorização, CORS e tratamento de erros estão reservados em `middlewares`. A conexão está reservada em `database/conexao.js`, e o script futuro em `sql/entrega_radar.sql`.

No frontend, `css`, `js` e `assets` já estão criadas. As pastas reservadas contêm um arquivo inicial ou `.gitkeep`, pois o Git não registra pastas vazias.

### Dados previstos para as próximas etapas

O planejamento inicial considera usuários, empresas contratantes, transportadoras, pedidos, solicitações de transporte e atualizações das entregas. Cada pedido pertencerá a uma empresa e poderá ser vinculado a uma transportadora. As solicitações e atualizações terão relação com o pedido correspondente.

Essa é uma visão inicial dos dados. As tabelas, as chaves e o script SQL serão definidos e implementados na Entrega 2.

## 9. Estado desta entrega

### Incluído na Entrega 1

- Definição do problema, do público e da justificativa.
- Proposta de solução, objetivos e funcionalidades previstas.
- Perfis de usuários, ações, fluxo e regras iniciais.
- Planejamento das estimativas e das limitações de dados.
- Pastas do projeto e separação inicial do back-end, incluindo os arquivos reservados de cada módulo previsto.
- Página inicial de identificação e uma rota de apresentação da API.
- README e `.gitignore`.

### Ainda não implementado

Banco MySQL, cadastro, login, JWT, permissões, CRUD dos pedidos, diretório funcional, solicitações de transporte, cálculo de previsões e alertas. Esses itens estão planejados e não devem ser apresentados como prontos nesta etapa.

## 10. Como conferir a estrutura inicial

A página de identificação pode ser aberta pelo arquivo `frontend/index.html`. Ela apenas apresenta o projeto e a etapa atual.

Para iniciar a API, instale o Node.js em versão compatível com o Express 5 e, dentro da pasta deste projeto, execute:

```bash
cd backend
npm install
npm start
```

Abra `http://localhost:3000/`. A resposta será um JSON identificando o projeto e a Entrega 1. Essa rota não consulta banco, não faz previsões e não exige credenciais. Para parar o servidor, use `Ctrl+C`.

## 11. Uso do GitHub

O projeto será mantido na pasta [`entrega-radar`](https://github.com/Henry28122025/Senac_Desenvolvimento-Web/tree/main/entrega-radar) do repositório [`Senac_Desenvolvimento-Web`](https://github.com/Henry28122025/Senac_Desenvolvimento-Web). As quatro entregas deverão evoluir nessa mesma pasta e nesse mesmo repositório.

Para registrar novas alterações, os comandos abaixo devem ser executados na raiz do repositório local:

```bash
git status
git add entrega-radar
git diff --cached --stat
git commit -m "Atualiza o projeto EntregaRadar"
git push
```

Confira no GitHub se a pasta, os arquivos e o commit foram publicados. Não envie `node_modules`, arquivos `.env`, senhas ou tokens. Se já existirem outras alterações preparadas para commit, revise a seleção antes de confirmar.

O histórico deve registrar o desenvolvimento real. A avaliação considera os arquivos publicados no GitHub até o prazo de cada entrega.
