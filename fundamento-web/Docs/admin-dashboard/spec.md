# Painel de Admin — Spec

> Status: implementado (retroativo)
> Última atualização: 2026-07-07
> Escopo: feature interna do `fundamento-web` — não introduz nem depende
> de endpoint novo. Consome as APIs já descritas em
> [`../../../Docs/products-categories/`](../../../Docs/products-categories/spec.md)
> e referencia
> [`../../../Docs/orders-cart/`](../../../Docs/orders-cart/spec.md).

## Contexto

Admin precisa de um lugar central pra gerenciar o catálogo e navegar pras
outras telas de gestão (categorias, pedidos). Esta spec cobre só a tela
`/admin` em si — o dashboard — não as telas de categoria/pedido, que já
têm spec própria como parte de suas features.

## Escopo

Em escopo:

- Tela `/admin`: lista de produtos com busca por nome, atalho pra criar
  produto novo, atalho pra editar/excluir cada produto (reusando o grid
  público em modo "gerenciável")
- Links de atalho pras telas de Categorias e Pedidos

Fora de escopo:

- Métricas/KPIs (faturamento, pedidos pendentes, etc.) — o dashboard hoje
  é só um hub de navegação + gestão de produtos, não um painel analítico
- Gestão de categorias e pedidos em si (specs próprias)

## Requisitos funcionais

1. Como Admin, ao acessar `/admin`, eu vejo a lista completa de produtos
   cadastrados.
2. Como Admin, eu posso buscar produtos por nome dentro dessa lista.
3. Como Admin, eu posso ir direto pra criar um produto novo.
4. Como Admin, eu posso editar ou excluir qualquer produto direto da
   lista, sem precisar abrir o detalhe público do produto.
5. Como Admin, eu tenho atalhos visíveis pra ir às telas de Categorias e
   de Pedidos.
6. Como não-Admin (ou visitante), eu não consigo acessar `/admin`.

## Regras de negócio

- A busca é só client-side, por substring no nome do produto,
  case-insensitive — não bate na API, filtra a lista já carregada.
- Excluir um produto pela lista do dashboard pede confirmação antes (ver
  spec de Products & Categories pra regra de negócio da exclusão em si).

## Atores e permissões

| Ator | Pode |
|---|---|
| Visitante / User | Nenhum acesso — `adminGuard` bloqueia a rota |
| Admin | Acesso completo à tela |

## Critérios de aceite

- [ ] Dado que não sou Admin, quando tento acessar `/admin` diretamente
      pela URL, então sou redirecionado.
- [ ] Dado que não há produtos cadastrados, quando abro `/admin`, então
      vejo uma mensagem de prateleira vazia com atalho pra cadastrar o
      primeiro.
- [ ] Dado uma busca que não bate com nenhum produto, quando digito no
      campo de busca, então vejo mensagem de "nenhum encontrado" com opção
      de limpar a busca.
- [ ] Dado um produto existente, quando clico em excluir na lista do
      dashboard, então (após confirmar) ele some da lista sem precisar
      recarregar a página manualmente.

## Perguntas em aberto

- O dashboard não mostra nenhum resumo de pedidos (ex: "3 pedidos
  pendentes") — isso é uma evolução natural desejada, ou o hub de
  navegação simples é suficiente por ora?
