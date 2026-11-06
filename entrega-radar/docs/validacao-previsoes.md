# Plano de validação das previsões de entrega

**Estado em 06/11/2026:** plano para as próximas etapas. O cálculo das previsões não está implementado, não foi fornecido um conjunto de entregas reais e nenhuma precisão foi medida. Não apresentar este documento como validação concluída.

## Dados necessários

Usar registros reais de pedidos e entregas, com autorização da organização responsável. Para avaliação e demonstração, substituir nomes e identificadores comerciais por códigos; não publicar endereços, contatos ou dados operacionais privados no repositório.

| Informação | Finalidade |
| --- | --- |
| Código do pedido e organização | Rastrear o registro sem misturar o acesso de organizações diferentes. |
| Fornecedor e transportadora codificados | Comparar entregas de características semelhantes. |
| Origem/destino por região e tipo de material | Caracterizar a rota e a carga, evitando endereços detalhados na base de avaliação. |
| Criação e prazo combinado original | Definir o início e a referência prometida, sem sobrescrevê-los depois. |
| Etapas com data do evento e data do registro | Saber o que aconteceu e quais informações estavam disponíveis no instante da previsão. |
| Data real de recebimento | Comparar previsão e resultado confirmado pela contratante. |
| Instante, versão do critério, data central e faixa de cada previsão | Reproduzir e medir estimativas anteriores sem substituí-las pelo cálculo mais recente. |

O esquema da Entrega 2 prepara pedidos e atualizações. O armazenamento versionado de previsões e os controles de coleta ainda precisarão ser implementados. O prazo combinado e a chegada real devem permanecer separados da estimativa.

Antes de calcular: conferir datas faltantes, registros duplicados, sequência das etapas, unidades e região. Marcar registros incompletos e documentar exclusões. Cancelados e pedidos sem recebimento confirmado não entram no cálculo de erro de chegada, mas suas quantidades devem constar do relatório. Definir o fuso e a contagem em dias corridos antes de comparar resultados.

## Procedimento de avaliação

1. Reservar as entregas mais recentes para avaliação e usar apenas as anteriores como histórico. Não escolher a amostra de teste depois de ver os resultados.
2. Para cada previsão histórica, usar somente eventos que já estavam registrados até seu instante de emissão. Não usar a data real de recebimento nem atualizações futuras no cálculo.
3. Documentar como pedidos semelhantes são selecionados: rota/região, tipo de material, fornecedor, transportadora e etapa. Definir previamente a quantidade mínima de exemplos e os critérios de ampliação do grupo; ainda não há um limiar validado.
4. Comparar o critério candidato com duas referências simples: prazo originalmente informado e duração mediana do histórico elegível. Calcular resultados sobre o mesmo conjunto de pedidos e instante de comparação.
5. Preservar as previsões avaliadas e registrar a versão do cálculo. Na primeira avaliação, usar um instante previamente definido por pedido para não dar mais peso aos pedidos com muitas atualizações; avaliar revisões posteriores separadamente.
6. Calcular as métricas abaixo, separadas por região, prestadora e grupo quando houver amostra suficiente. Mostrar contagem e período em cada resultado.
7. Só alterar o critério depois de documentar os resultados. Avaliar a alteração em um período posterior, sem reutilizar o teste como ajuste e comprovação ao mesmo tempo.

O histórico de uma empresa não deve ficar disponível a outra. Para a primeira versão, usar somente dados autorizados da própria organização; eventual uso agregado entre organizações exigirá definição específica de autorização e anonimização.

## Métricas a registrar

| Medida | Cálculo ou interpretação |
| --- | --- |
| Erro médio absoluto em dias | Média de `abs(data central prevista - data real)`; calcular também para as referências. |
| Tendência de antecipar ou atrasar | Média de `data central prevista - data real`; valor positivo indica previsão posterior à chegada real. |
| Cobertura da faixa | Entregas cuja data real ficou entre os limites previstos, inclusive, divididas pelo total com faixa e recebimento válidos. |
| Largura média da faixa | Média de `limite final - limite inicial`, em dias. Evita interpretar uma faixa muito ampla como boa precisão. |
| Proporção sem previsão histórica | Pedidos sem histórico elegível suficiente divididos pelo total avaliado. |
| Alertas de risco | Registrar alertas corretos, falsos alertas e atrasos sem alerta, além da antecedência do aviso em relação ao prazo original. |

Para avaliar alerta de atraso, o resultado confirmado é `recebimento real > prazo combinado original`. Aviso de falta de atualização é uma categoria distinta e não deve ser contado como confirmação de atraso.

Não definir uma meta percentual ou anunciar um nível de confiança antes de medir os dados. Uma faixa com boa cobertura em poucos pedidos não comprova desempenho para todas as rotas ou transportadoras.

## Comunicação na interface futura

- Sempre distinguir **prazo combinado**, **estimativa** e **recebimento confirmado**.
- Mostrar faixa, motivo, instante da última atualização usada e quantidade de exemplos elegíveis.
- Sem histórico suficiente: “Ainda não há histórico suficiente para estimar. Prazo informado: [data].”
- Informação desatualizada: “Sem atualização desde [data]. A chegada ainda não foi confirmada.”
- Com estimativa: “Chegada estimada entre [início] e [fim], com base em [quantidade] entregas semelhantes. Atualizada em [data]. A estimativa pode mudar.”

Os textos acima são modelos planejados, não resultados do sistema atual. Enquanto não houver avaliação concluída, usar a indicação “Critério em validação”, sem prometer uma data garantida.

## Evidência para concluir a validação

Registrar período, origem autorizada, quantidade de registros elegíveis/excluídos, versão dos critérios, divisão cronológica, referências, resultados por métrica, limitações e decisão de manter ou revisar o cálculo. Publicar somente resumo sem dados privados. Até esse registro existir, manter a validação como pendente.
