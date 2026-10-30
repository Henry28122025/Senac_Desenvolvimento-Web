# Rotas

Nesta etapa existe apenas `GET /`, que apresenta o projeto.

Os arquivos de autenticação, usuários, administração, empresas, transportadoras, pedidos, solicitações, entregas, previsões e alertas já estão criados. Cada um contém um router vazio, ainda não ligado à aplicação.

Nas próximas entregas, cada rota encaminhará a requisição ao controller responsável. As operações privadas passarão pelos middlewares de autenticação e autorização. Nesta etapa, somente `inicioRoutes.js` é utilizado por `app.js`.
