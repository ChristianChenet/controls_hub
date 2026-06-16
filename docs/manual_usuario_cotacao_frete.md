# Manual do Usuario - Cotacao de Frete

## Acesso

1. Entre no Control S Hub.
2. Selecione a empresa ativa.
3. Acesse o modulo Cotacao de Frete.

## Kanban

O Kanban mostra o andamento operacional da cotacao:

- Recebido do ERP: documento recebido e elegivel.
- Cotacao Automatica Recebida: retorno automatico ERP/Intelipost disponivel.
- Aguardando Retorno da Transportadora: links enviados e respostas pendentes.
- Em Analise: todas as respostas previstas foram recebidas.
- Aprovado: analista definiu a transportadora vencedora.
- Integrado ao ERP: decisao final disponivel para retorno.
- Aguardando Faturamento, Faturado, Aguardando CTe e CTe Recebido: continuidade operacional vinda da integracao.

Cada card mostra origem, documento, destino, valor da mercadoria, frete da venda, prazo informado na venda, melhor frete, respostas recebidas, SLA vencido, NF-e e CTe quando houver.

## Cotacao

Na tela de cotacoes, clique em um registro para abrir o detalhe. A tela separa:

- Venda: vendedor, frete cobrado e prazo informado na venda.
- Pedido / ERP: dados originais do documento e transportadora definida quando houver.
- Cotacao automatica: valores retornados pelo ERP/Intelipost.
- Resposta por link: retorno informado pela transportadora.
- Aprovado: valor, prazo e transportadora definidos pelo analista.
- CTe recebido: transportadora e valor efetivo recebidos no documento fiscal.

Use o podio para visualizar rapidamente as melhores opcoes. O sistema sugere o menor frete, mas a escolha final continua sendo do analista.

## Links para transportadora

No detalhe da cotacao:

- Gerar novo link: cria novo link seguro para a transportadora.
- Copiar link: copia link ja enviado.
- Visualizar link: abre a mesma tela real que a transportadora acessa.

O link respeita as configuracoes da transportadora, incluindo exibir prazo da venda, exigir prazo de resposta, mostrar produtos, peso, cubagem, valor tabela e menor cotacao.

## Envio em massa

Na tela Selecao e envio de cotacoes:

1. Filtre pedidos ativos, nao enviados ou ja enviados.
2. Use Selecionar todos elegiveis para marcar todos os pedidos ativos da lista.
3. Marque Enviar somente Top 3 quando quiser disparar apenas para as tres melhores transportadoras.
4. Clique em Preparar envio.
5. Revise transportadoras, valores, ranking, reenvios e itens.
6. Envie somente ineditos ou confirme reenvio quando houver envio anterior.

Pedidos cancelados ou excluidos nao sao enviados.

## Transportadoras

No cadastro de transportadoras, configure:

- Aceita cotacao externa.
- Mostrar menor cotacao.
- Mostrar cubagem.
- Mostrar peso.
- Mostrar valor tabela.
- SLA de resposta em horas.
- Mostrar prazo da venda.
- Solicitar prazo no link.
- Prazo obrigatorio.
- Mostrar produtos no link.

## Timeline

Use Registrar observacao no detalhe da cotacao para registrar acompanhamento operacional geral. Em cada transportadora, use Observacao para registrar comentario especifico. Tudo fica auditavel com data, usuario e contexto.

## Fonte da Tela

Para superadmin, o botao Fonte da Tela mostra nome tecnico, fonte, componentes, endpoints e tabelas. O atalho Ctrl + F3 abre o mesmo painel.
