# Rotas

As rotas associam método e caminho ao controller e aplicam os middlewares necessários. O `app.js` conecta os routers, configura o Express e serve o frontend; o `server.js` inicia a escuta HTTP.

| Router | Caminho completo | Proteção |
| --- | --- | --- |
| `inicioRoutes.js` | `GET /api` | Público. |
| `authRoutes.js` | `POST /api/auth/cadastro` e `POST /api/auth/login` | Validação no backend e limite de tentativas. |
| `usuariosRoutes.js` | `GET /api/usuarios/me` | JWT válido e usuário ativo no banco. |
| `adminRoutes.js` | `GET /api/admin/painel` | JWT válido, usuário ativo e perfil administrador. |

Os outros routers são arquivos reservados e não estão conectados ao `app.js`. Não há CRUD de pedidos ou cálculo de previsões nesta etapa. Ao implementar uma rota de negócio, atualizar este arquivo, o README principal e os testes correspondentes no mesmo commit.
