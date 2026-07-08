# Carrinho & Pedidos — Spec

> Status: implementado (retroativo)
> Última atualização: 2026-07-08 (atalho de checkout via WhatsApp
> adicionado nesta data; bug de cascade delete corrigido em 2026-07-07)

## Contexto

O cliente monta um carrinho de compras antes de decidir comprar; ao
confirmar, o carrinho vira um Pedido (Order) durável no backend, com preços
travados no momento da compra. Ver definições de Cart e Order em
[`../../CONTEXT.md`](../../CONTEXT.md) — Cart é conceito puramente
client-side, Order é o registro oficial da compra.

## Escopo

Em escopo:

- Carrinho client-side (por usuário logado, sobrevive a refresh)
- Checkout: carrinho → Order real no backend, com preço travado por item
- Atalho para finalizar o pedido via WhatsApp: abre uma conversa com o
  número fixo da loja, com todos os itens do carrinho, quantidades e
  total, como alternativa ao checkout que persiste o Order no backend
- Gestão administrativa de pedidos: listar, ver detalhe, editar itens,
  mudar status, excluir

Fora de escopo (não implementado):

- Cliente ver o próprio histórico de pedidos ("meus pedidos") — hoje só
  Admin enxerga a lista/detalhe de pedidos
- Pagamento real (nenhum processador de pagamento é integrado — "finalizar
  pedido" já persiste o pedido como se o pagamento tivesse acontecido)
- Controle de estoque (nada impede comprar mais unidades do que existem,
  porque não existe conceito de estoque)
- Cancelamento de pedido iniciado pelo próprio cliente (só Admin muda
  status, incluindo para `Cancelled`)
- Notificação (email/push) de mudança de status

## Requisitos funcionais

1. Como usuário logado, eu posso adicionar produtos ao carrinho, ajustar
   quantidade e remover itens, e isso persiste entre visitas (mesmo
   navegador).
2. Como visitante não logado, ao tentar adicionar algo ao carrinho, eu sou
   convidado a fazer login antes.
3. Como usuário logado, eu posso finalizar o carrinho como um pedido; ao
   confirmar, o carrinho local é esvaziado.
4. Como usuário logado, meu carrinho é individual — se eu trocar de conta
   no mesmo navegador, vejo o carrinho da conta atual, não o de outra.
5. Como usuário logado, eu posso abrir uma conversa de WhatsApp com o
   resumo do meu carrinho (itens, quantidades, subtotais e total), como
   alternativa a finalizar o pedido pelo backend.
6. Como Admin, eu posso ver todos os pedidos feitos, com os itens,
   quantidades e preços de cada um.
7. Como Admin, eu posso mudar o status de um pedido ao longo do fluxo
   (Pendente → Preparando → Enviado → Entregue, ou Cancelado a qualquer
   momento).
8. Como Admin, eu posso ajustar as quantidades dos itens de um pedido já
   feito, ou excluir o pedido inteiro.

## Regras de negócio

- **O preço de cada item do pedido é travado no momento da compra**
  (`UnitPriceAtPurchase`) — se o produto for repreçado depois, pedidos já
  feitos não mudam de valor.
- **O total do pedido é sempre calculado no backend**, a partir do preço
  atual do produto no banco no momento do checkout — o valor de preço
  enviado pelo cliente (se houver) nunca é confiável nem usado.
- Um pedido precisa ter pelo menos um item.
- Quantidade de cada item precisa ser maior que zero, tanto na criação
  quanto em qualquer atualização.
- Todo produto referenciado no pedido precisa existir no momento do
  checkout — se não existir, o pedido inteiro é rejeitado (não é criado
  parcialmente).
- Status do pedido só pode ser um dos valores fixos: `Pending`,
  `Preparing`, `Shipped`, `Delivered`, `Cancelled`.
- O carrinho não existe no backend — é inteiramente local (armazenamento
  do navegador), então não é compartilhado entre dispositivos e é perdido
  se o navegador limpar os dados.
- **Um produto que já foi comprado (existe em algum `OrderItem`) não pode
  ser excluído do catálogo** — a exclusão é bloqueada (409) para proteger
  o histórico e o total de pedidos antigos. Ver regra espelhada em
  [`../products-categories/spec.md`](../products-categories/spec.md).
- **O botão "Fazer pedido via WhatsApp" não cria um Order no backend nem
  esvazia o carrinho** — é só um atalho de contato; o carrinho permanece
  intacto depois de usá-lo, diferente de "Finalizar pedido".
- O número de WhatsApp da loja é fixo, hardcoded no frontend — não é
  configurável por Admin nem varia por ambiente. Ver regra espelhada em
  [`../products-categories/spec.md`](../products-categories/spec.md).

## Atores e permissões

| Ator | Pode |
|---|---|
| Visitante (não logado) | Nada (não vê nem monta carrinho) |
| User | Montar/editar carrinho próprio, finalizar pedido (criar Order) |
| Admin | Tudo do User (pode comprar também) + listar todos os pedidos, ver detalhe, editar itens/quantidades, mudar status, excluir pedido |

Nota: não existe uma visão de "meus pedidos" para o User — ele não
consegue consultar pedidos que já fez através da UI ou API hoje.

## Critérios de aceite

- [ ] Dado um carrinho com 2 produtos, quando finalizo o pedido, então um
      Order é criado com 2 OrderItems, o total bate com a soma dos preços
      atuais × quantidades, e o carrinho local é esvaziado.
- [ ] Dado um item do carrinho cujo produto foi excluído do catálogo antes
      do checkout, quando tento finalizar, então o pedido inteiro é
      rejeitado com uma mensagem clara (não cria pedido parcial).
- [ ] Dado que não estou logado, quando acesso `/cart`, então sou
      redirecionado para `/login`.
- [ ] Dado que troco de conta no mesmo navegador, quando volto pro
      carrinho, então vejo o carrinho da conta atual (vazio se nunca
      comprei nada nela), não o da conta anterior.
- [ ] Dado um pedido existente, quando um Admin muda seu status para um
      valor fora da lista permitida, então a operação é rejeitada.
- [ ] Dado que não sou Admin, quando tento listar todos os pedidos ou
      mudar o status de um pedido via API diretamente, então recebo
      401/403.
- [x] Dado um carrinho com itens, quando clico em "Fazer pedido via
      WhatsApp", então uma nova aba abre para `wa.me` com uma mensagem
      listando cada item (quantidade, nome, subtotal) e o total do
      carrinho.
- [x] Dado que clico em "Fazer pedido via WhatsApp", quando volto pra
      loja, então o carrinho continua com os mesmos itens — diferente de
      "Finalizar pedido", esse atalho não esvazia o carrinho nem cria um
      Order.

## Critérios de aceite (adicional)

- [x] Dado um produto que já foi comprado em algum pedido, quando um Admin
      tenta excluí-lo, então a operação é rejeitada com 409 e o produto,
      o pedido e seus itens continuam intactos.

## Perguntas em aberto

- Não existe "meus pedidos" pro cliente — é escopo futuro deliberado ou
  lacuna a priorizar?
- Com a exclusão de produto agora bloqueada quando há pedidos associados,
  não existe hoje nenhuma forma de "aposentar" um produto do catálogo sem
  perder o histórico (ex: um campo `Discontinued`/`Active`). Vale
  considerar se isso vira necessário.
- `PUT /order/{id}` (substituição completa dos itens) e
  `PATCH /order/{id}` (ajuste pontual de quantidades) coexistem com
  propósitos sobrepostos — qual é o fluxo de admin real que usa cada um?
- O checkout via WhatsApp não deixa nenhum rastro no backend (não vira
  Order, não aparece pro Admin em `/orders`) — isso é aceitável enquanto
  for só um atalho de contato, ou faz sentido registrar esses pedidos de
  alguma forma (mesmo que com status "aguardando confirmação manual")?
