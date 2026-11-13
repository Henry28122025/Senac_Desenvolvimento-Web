# Rotas

As rotas associam método e caminho ao controller e aplicam os middlewares necessários. O `app.js` conecta os routers, configura o Express e serve o frontend; o `server.js` inicia a escuta HTTP.

| Router | Caminho completo | Proteção |
| --- | --- | --- |
| `inicioRoutes.js` | `GET /api` | Público. |
| `authRoutes.js` | `POST /api/auth/cadastro` e `POST /api/auth/login` | Validação no backend e limite de tentativas. |
| `usuariosRoutes.js` | `GET /api/usuarios/me` | JWT válido e usuário ativo no banco. |
| `adminRoutes.js` | `GET /api/admin/painel` | JWT válido, usuário ativo e perfil administrador. |
| `pedidosRoutes.js` | `GET /api/pedidos`, `POST /api/pedidos`, `GET /api/pedidos/:id`, `PUT /api/pedidos/:id`, `DELETE /api/pedidos/:id` | JWT válido, perfil contratante e vínculo com a empresa do pedido. |

O controller de pedidos usa o vínculo da sessão para acessar somente pedidos da própria empresa. Ao implementar uma rota de negócio, atualize esta documentação, o README principal e os testes correspondentes.
