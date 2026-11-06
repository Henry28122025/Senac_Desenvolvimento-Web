# Controllers

Tratam as requisições e montam as respostas HTTP. As rotas apenas associam caminhos aos controllers e middlewares.

| Arquivo | Estado e responsabilidade |
| --- | --- |
| `inicioController.js` | Identifica o projeto e a Entrega 2 em `GET /api`. |
| `authControllers.js` | Cadastro transacional e login com credenciais do MySQL; geração do JWT. |
| `usuariosControllers.js` | Retorna os dados básicos do usuário identificado pelo middleware. |
| `adminControllers.js` | Demonstra acesso restrito ao administrador. |
| Demais controllers | Reservados para as próximas entregas; não expõem funcionalidades de negócio. |

Validação reutilizável e proteção de senhas ficam em `services/`. A conexão fica em `database/`; autenticação e autorização, em `middlewares/`. Não colocar consultas SQL nas rotas ou no frontend.
