# Acompanhamento das orientações da Entrega 1

Parecer recebido: **PD - Plenamente Desenvolvido** nos quatro indicadores. O documento do professor considera a Entrega 1 em 30/10/2026, no commit `1872a43`; não avalia a implementação posterior da Entrega 2.

As observações indicam práticas a manter nas próximas etapas. Este acompanhamento foi registrado em 06/11/2026, sem alterar a avaliação recebida.

| Orientação do professor | Ação no projeto | Situação |
| --- | --- | --- |
| Manter commits progressivos e descritivos. | Separar banco/autenticação, telas/documentação e legibilidade em commits com mensagens específicas; manter novos ajustes no histórico real. | Aplicada e contínua. |
| Atualizar a documentação conforme os módulos forem implementados. | README principal descreve o estado da Entrega 2, rotas, instalação, modelo, testes e limites. Documentação de routes/controllers atualizada para os arquivos realmente ativos. | Aplicada; atualizar a cada módulo. |
| Preservar a separação de responsabilidades. | `app.js` configura/monta; `server.js` inicia; routes encaminham; controllers respondem; middlewares autenticam/autorizam; database conecta; services reúne validações e senhas. Identificação da API também passa por router/controller. | Aplicada. |
| Validar critérios de previsão com dados reais e comunicar limitações. | [Plano de validação](validacao-previsoes.md) define coleta, comparação, métricas, avaliação cronológica e mensagens para dados insuficientes. | Plano documentado; execução pendente de dados reais e implementação das previsões. |

## Como manter nas próximas entregas

1. Implementar um módulo na camada correspondente e aplicar autorização na API.
2. Executar as verificações pertinentes e registrar separadamente o que passou, falhou ou não pôde ser executado.
3. Atualizar o estado do módulo, suas rotas, configuração e limitações na documentação.
4. Revisar os arquivos selecionados, criar commit descritivo e conferir a publicação no GitHub.

Não reescrever o histórico para simular progresso. Exemplos fictícios e testes com banco simulado não comprovam funcionamento com dados reais.

## Pendências técnicas já conhecidas

- Executar o esquema e a suíte de integração com MySQL real disponível e configurado.
- Implementar o CRUD e as permissões por organização na Entrega 3.
- Implementar os fluxos de transporte, registros das previsões e validação histórica nas etapas posteriores.

Essas pendências não são apontamentos de reprovação da Entrega 1: são o estado atual do desenvolvimento.
