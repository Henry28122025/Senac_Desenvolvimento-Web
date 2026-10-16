# Joelho de Grilo — comunidade RPG

Protótipo acadêmico de uma rede social para a comunidade da Taverna Joelho de Grilo, com mural, agenda e loja. Usa a mesma organização do projeto da biblioteca: HTML/CSS/JavaScript, Express, rotas, controllers e MySQL.

O endereço, o horário e os tipos de jogos foram extraídos da referência fornecida. A agenda, o catálogo, os preços e a publicação inicial são fictícios. O símbolo de dado é uma identidade provisória, sem substituir o logotipo da comunidade.

## Executar no computador

O MySQL precisa estar iniciado. Neste computador, o arquivo `backend/.env` já está configurado e o banco dedicado `JOELHO_DE_GRILO` já foi criado. O projeto da biblioteca usa seu próprio banco.

A partir da pasta `Sistema_Backend`:

```powershell
cd sistema_RPG/backend
npm start
```

Abra **http://localhost:3001**. O Express entrega tanto a página quanto a API; não é necessário iniciar o Live Server.

Em outra máquina, faça a configuração inicial dentro de `backend`:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edite o `.env` com o acesso ao seu MySQL. Depois execute:

```powershell
npm run db:setup
npm start
```

Também é possível abrir [sql/joelho_de_grilo.sql](sql/joelho_de_grilo.sql) no MySQL Workbench e executar o script. Ele cria as tabelas e os exemplos. `db:setup` aplica esse mesmo script e verifica a compatibilidade com a estrutura inicial do projeto. Nenhuma conta de usuário vem pronta: crie a sua pela tela **Começar minha aventura**.

O Live Server é compatível nas portas **5500 e 5501**. Use o mesmo nome de host no frontend e na API: `localhost` com `localhost`, ou `127.0.0.1` com `127.0.0.1`, para o cookie da sessão funcionar. A abertura direta pelo protocolo `file://` não oferece a API.

## O que está pronto

- Apresentação da comunidade, endereço, horário e link para as redes fornecidas na referência.
- Entrada e cadastro inspirados no vídeo: castelo noturno, azul, dourado, partículas, névoa e transições. A preferência de movimento reduzido do navegador é respeitada.
- Navegação com saída e entrada suaves, animação alternativa para navegadores sem View Transitions e proteção contra trocas rápidas de página.
- Cartões com entrada em sequência, apresentação revelada ao rolar, cabeçalho fixo com fundo translúcido, banners internos e detalhes dourados nos botões e formulários.
- Cadastro e login com senha protegida por `scrypt` e salt; sessão de oito horas em cookie HttpOnly. Logout invalida a sessão no MySQL.
- Perfil com nome, apresentação, sistema favorito, contadores e consulta/cancelamento das próprias inscrições.
- Painel da equipe com visão geral, indicadores do banco, últimos pedidos e produtos com estoque baixo.
- Cadastro e edição de pessoas, concessão e remoção do papel de administrador e definição opcional de uma nova senha.
- Gestão de inscrições de qualquer evento, incluindo reserva de lugares para membros e remoção de inscrições.
- Gestão de todos os pedidos, com situação, dados do comprador, cancelamento e exclusão. Cancelar ou excluir um pedido devolve seu estoque uma única vez.
- Edição da apresentação, nome, endereço, horário e link das redes da comunidade pela própria interface.
- Mural com cadastro, consulta, edição e exclusão. Membros alteram suas próprias publicações; a equipe também pode moderar o mural, preservando a autoria.
- Eventos com CRUD, busca, categorias, inscrição e cancelamento. Inscrições respeitam o limite de vagas e o horário do evento.
- Produtos com CRUD, busca, categorias, preço e estoque.
- Carrinho com quantidades e pedido demonstrativo, sem cobrança, frete ou coleta de dados de cartão.
- Histórico de pedidos vinculado à conta. Nome e preço dos itens são preservados mesmo quando um produto é excluído.
- Validação no frontend e no backend, mensagens de erro, confirmação de exclusão e nova tentativa quando a conexão falha.

**Apenas administradores gerenciam a agenda e o catálogo.** Membros podem publicar, inscrever-se, comprar e cuidar do próprio perfil. A API verifica a permissão mesmo se alguém tentar enviar a requisição fora da interface.

## Liberar o acesso da equipe

Toda conta criada pela página começa como membro. Depois de cadastrar a conta que usará para administrar e demonstrar o CRUD, abra um segundo terminal dentro de `backend` e execute, substituindo o e-mail pelo da conta cadastrada:

```powershell
npm run admin -- seu-email@exemplo.com
```

Atualize a página. O perfil passa a mostrar **Equipe da taverna**, com acesso à gestão. Esse comando altera uma conta existente; não cria usuário nem muda a senha. O primeiro acesso de equipe pode ser concedido pelo terminal. Depois, administradores usam **Painel da taverna → Pessoas & equipe → Tornar admin**, revisam o cadastro e salvam a permissão. Também podem cadastrar uma nova pessoa já como administradora. O cadastro público continua criando apenas membros. O painel preserva pelo menos um administrador para a comunidade.

Para retirar o acesso:

```powershell
npm run admin -- seu-email@exemplo.com --remover
```

Se já tinha o banco da versão anterior, execute `npm run db:setup` antes de reiniciar o servidor para adicionar os novos campos. Os registros existentes são preservados. As contas existentes passam a ser membros até que seu responsável conceda acesso à gestão.

## Organização dos arquivos

```text
sistema_RPG/
├── backend/
│   ├── controllers/       # Validação, regras e consultas SQL
│   ├── database/          # Conexão e preparação do banco
│   ├── middlewares/       # CORS, sessão e respostas de erro
│   ├── routes/            # Métodos HTTP e caminhos da API
│   ├── tests/             # Integração com MySQL isolado
│   ├── .env.example       # Modelo de configuração sem credenciais
│   ├── app.js             # Configura o Express e conecta as rotas
│   ├── package.json       # Dependências e comandos
│   └── server.js          # Verifica o banco e inicia o servidor
├── frontend/
│   ├── assets/            # Fundo de fantasia e símbolo provisório
│   ├── index.html         # Telas e formulários
│   ├── script.js          # Fetch, navegação, listas e carrinho
│   ├── admin.js           # Painel, equipe, pedidos e apresentação da comunidade
│   └── style.css          # Estilo, animações e responsividade
├── sql/
│   └── joelho_de_grilo.sql
└── docs/
    └── apresentacao.md    # Roteiro de demonstração e perguntas
```

`node_modules`, `.env` e `.tools` ficam fora do Git. `.tools` contém apenas ferramentas e capturas usadas no desenvolvimento; o sistema não depende dela para funcionar.

## API e CRUD

A API responde em JSON sob `/api`.

| Recurso | Listar | Buscar por ID | Cadastrar | Atualizar | Excluir |
| --- | --- | --- | --- | --- | --- |
| Publicações | `GET /api/publicacoes` | `GET /api/publicacoes/:id` | `POST /api/publicacoes` | `PUT /api/publicacoes/:id` | `DELETE /api/publicacoes/:id` |
| Eventos | `GET /api/eventos` | `GET /api/eventos/:id` | `POST /api/eventos` | `PUT /api/eventos/:id` | `DELETE /api/eventos/:id` |
| Produtos | `GET /api/produtos` | `GET /api/produtos/:id` | `POST /api/produtos` | `PUT /api/produtos/:id` | `DELETE /api/produtos/:id` |

As consultas desses três recursos são públicas. As operações de escrita exigem sessão; produtos e eventos também exigem administrador. Uma publicação pode ser editada ou excluída por seu autor ou pela equipe.

| Ação | Método e rota |
| --- | --- |
| Criar conta | `POST /api/auth/cadastro` |
| Entrar | `POST /api/auth/login` |
| Consultar conta e inscrições | `GET /api/auth/me` |
| Consultar perfil, contadores e encontros | `GET /api/auth/perfil` |
| Atualizar nome, apresentação e sistema | `PUT /api/auth/perfil` |
| Sair | `POST /api/auth/logout` |
| Inscrever-se | `POST /api/eventos/:id/inscricoes` |
| Cancelar inscrição | `DELETE /api/eventos/:id/inscricoes` |
| Fazer pedido demonstrativo | `POST /api/pedidos` |
| Consultar os próprios pedidos | `GET /api/pedidos` |
| Verificar conexão | `GET /api/saude` |

Exemplo do corpo de cadastro de produto:

```json
{
  "nome": "Dados da apresentação",
  "descricao": "Conjunto fictício para demonstrar o cadastro.",
  "categoria": "Dados",
  "preco": 29.90,
  "estoque": 10
}
```

`200` indica consulta ou alteração concluída; `201`, criação; `400`, entrada inválida; `401`, ausência de sessão; `403`, ação não permitida; `404`, registro inexistente; `409`, conflito como estoque ou vagas insuficientes; `500`, falha interna ou no banco.

## Administração pelo site

Ao entrar com uma conta administrativa, a página abre o painel. O link **Painel da taverna** também fica disponível no cabeçalho.

| Área | O que a equipe pode fazer |
| --- | --- |
| Visão geral | Consultar totais do banco, pedidos recentes e estoque baixo |
| Produtos | Adicionar, editar e excluir itens, preços e estoque |
| Eventos | Criar, editar e excluir encontros; consultar, adicionar e remover inscrições |
| Pessoas & equipe | Adicionar pessoas, editar seus dados, conceder/remover administração, definir nova senha e excluir contas |
| Mural | Criar, editar e excluir publicações; a autoria original é preservada na moderação |
| Pedidos | Consultar todos os pedidos, editar comprador e situação, cancelar ou excluir |
| A comunidade | Publicar alterações de nome, apresentação, endereço, horário e redes |

As rotas abaixo exigem administrador. O cadastro público e a edição do próprio perfil não permitem escolher ou alterar esse papel.

| Recurso | Rotas |
| --- | --- |
| Indicadores | `GET /api/admin/resumo` |
| Pessoas | `GET/POST /api/admin/membros`, `PUT/DELETE /api/admin/membros/:id` |
| Pedidos | `GET /api/admin/pedidos`, `PUT/DELETE /api/admin/pedidos/:id` |
| Inscrições | `GET/POST /api/admin/eventos/:id/inscricoes`, `DELETE /api/admin/inscricoes/:id` |
| Apresentação | `PUT /api/admin/comunidade`; a consulta pública é `GET /api/comunidade` |

O painel impede remover o último administrador. Definir uma nova senha encerra as sessões da pessoa. Excluir uma pessoa remove suas publicações e inscrições e preserva os pedidos. Cancelar ou excluir pedidos restitui o estoque dos produtos que ainda existem; um pedido cancelado não pode ser reaberto e a restituição não é repetida.

## Banco e compra demonstrativa

| Tabela | Informações |
| --- | --- |
| `comunidade` | Nome, apresentação, endereço, horário e link das redes |
| `usuarios` | Nome, e-mail único, hash da senha, papel, apresentação e sistema favorito |
| `sessoes` | Hash do token, usuário e expiração |
| `publicacoes` | Autor, conteúdo, categoria, usuário e data |
| `eventos` | Título, descrição, categoria, data local, local e vagas |
| `inscricoes` | Evento e membro inscrito, com unicidade por evento e usuário |
| `produtos` | Nome, descrição, categoria, preço e estoque |
| `pedidos` | Comprador, conta, valor total, status demonstrativo e data |
| `pedido_itens` | Produto, nome e preço no momento do pedido e quantidade |

As consultas utilizam parâmetros `?`, como no projeto da biblioteca. O preço de uma compra vem do MySQL. O backend bloqueia as linhas dos produtos com `FOR UPDATE`, verifica o estoque e confirma pedido, itens e baixa de estoque em uma transação. Se alguma etapa falhar, executa `rollback` e nenhuma dessas alterações é confirmada.

Os eventos usam `DATETIME` no horário da taverna, `America/Sao_Paulo`. Datas de criação e sessões são tratadas em UTC e exibidas na interface no horário de São Paulo.

## Verificar

Dentro de `backend`:

```powershell
npm test
```

A suíte verifica quatorze cenários de integração, incluindo conexão, sessão, permissões, perfil, CRUDs, autoria, equipe, apresentação da comunidade, inscrições, histórico, cancelamento com devolução de estoque, transação, concorrência e logout. Cria um banco `JG_TEST_...` para a execução e o remove ao terminar. O usuário MySQL configurado precisa poder criar e remover esse banco temporário.

Para demonstrar os critérios do PDF, siga [docs/apresentacao.md](docs/apresentacao.md).

## Próxima etapa com a comunidade

Antes de usar com clientes reais, alinhar com a Joelho de Grilo o logotipo, os textos, as fotos, a agenda e o catálogo; definir entrega ou retirada; integrar um provedor de pagamento e confirmar pagamentos no servidor; preparar hospedagem HTTPS, recuperação de conta, limites de tentativas e tratamento de dados pessoais. A versão atual permite apresentar a proposta e testar o fluxo sem movimentar dinheiro.

A arte do fundo está em [frontend/assets/taverna-noturna.png](frontend/assets/taverna-noturna.png). Foi criada com a ferramenta Imagegen; o prompt está em [frontend/assets/README.md](frontend/assets/README.md).
