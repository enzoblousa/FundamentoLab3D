# Carrinho & Pedidos — Plan

> Depende de: [spec.md](spec.md)

## Visão geral da solução

Carrinho é um `signal` do Angular persistido em `localStorage`, sem
contraparte no backend. Ao finalizar, o frontend manda só `{ productId,
quantity }[]` pro backend, que resolve preço, valida existência do produto
e cria um `Order` com `OrderItems` cujo preço é travado
(`UnitPriceAtPurchase`). Gestão pós-venda (status, edição, exclusão) é
Admin-only.

## Modelo de dados (backend)

```
Order
- Id: int (PK)
- CreatedAt: DateTime
- Total: decimal — soma calculada no servidor, nunca recebida do cliente
- Status: string — Pending | Preparing | Shipped | Delivered | Cancelled (default Pending)
- UserId: int? (FK → User)
- OrderItems: List<OrderItem>

OrderItem
- Id: int (PK)
- OrderId: int (FK → Order, obrigatório)
- ProductId: int (FK → Product, obrigatório, DeleteBehavior.Restrict — corrigido em 2026-07-07, era Cascade)
- Quantity: int
- UnitPriceAtPurchase: decimal — cópia imutável do Product.Price no momento da compra
```

Migração `20260707200436_RestrictProductDeleteWhenOrdered` — troca a FK
`OrderItem.ProductId` de `Cascade` para `Restrict` (configurada via
`OnModelCreating` em `SysDbContext`, que antes não tinha override nenhum e
dependia do comportamento default do EF Core para FK obrigatória).

## Endpoints (backend)

Grupo `/order`:

| Método | Rota | Autorização | Request | Response | Descrição |
|---|---|---|---|---|---|
| GET | `/order` | AdminOnly | — | `Order[]` (com `OrderItems` e `User` incluídos) | Lista todos os pedidos |
| GET | `/order/{id}` | AdminOnly | — | `Order` / 404 | Detalhe de um pedido |
| POST | `/order` | autenticado (qualquer role) | `OrderItemRequest[]` | 201 `Order` / 400 | Checkout — cria o pedido |
| PUT | `/order/{id}` | AdminOnly | `OrderItemRequest[]` | 200 `Order` / 400 / 404 | Substitui todos os itens do pedido |
| PATCH | `/order/{id}` | AdminOnly | `UpdateOrderItemQuantityRequest[]` | 200 `Order` / 400 / 404 | Ajusta quantidade de itens específicos |
| PATCH | `/order/{id}/status` | AdminOnly | `{ status }` | 200 `Order` / 400 / 404 | Muda status |
| DELETE | `/order/{id}` | AdminOnly | — | 204 / 404 | Exclui pedido e seus itens |

`OrderItemRequest(ProductId, Quantity)`.
`UpdateOrderItemQuantityRequest(OrderItemId, Quantity)`.
`UpdateOrderStatusRequest(Status)` — validado contra `OrderStatus.All`.

**Lógica de `POST /order` (checkout)**: para cada item, busca o `Product`
pelo id (400 se não existir), usa `Product.Price` atual como
`UnitPriceAtPurchase`, acumula `Total`. `UserId` vem do claim `sub` do JWT
(`ClaimTypes.NameIdentifier`), nunca do corpo da requisição. Tudo dentro de
um único `SaveChangesAsync`.

## Frontend

- **Serviço de carrinho**: `core/services/cart.service.ts` (`CartService`)
  - Estado: `signal<CartItem[]>` (`{ productId, quantity }`), exposto
    como `items` (readonly) e `count` (computed).
  - Persistência: `localStorage`, chave `fundamento_cart_<userId>` — uma
    chave por usuário.
  - `effect()` reage a mudanças em `AuthService.userId()`: troca de conta
    recarrega o carrinho daquele usuário (ou array vazio se deslogado).
  - `add`/`setQuantity`/`remove`/`clear` — todos são no-op silencioso se
    não houver usuário logado (a UI já impede isso antes: ver
    `ProductGridComponent.addToCart`, que checa `auth.isLoggedIn()`
    primeiro e oferece ir pro login).

- **Serviço de pedidos**: `core/services/order.service.ts`
  (`OrderService`) — `getAll`, `getById`, `create(items)`, `delete(id)`,
  `updateStatus(id, status)`. Todos batem direto no grupo `/order`.

- **Componentes**:
  - `features/cart/cart.component.ts` — rota `/cart`, `authGuard`. Junta
    `cart.items()` com os dados de produto (busca todos os produtos via
    `ProductService.getAll` e faz o join em memória) pra montar linhas com
    nome/preço/subtotal. `submit()` chama `OrderService.create`, limpa o
    carrinho (`cart.clear()`) e navega pra home em caso de sucesso;
    mostra a mensagem de erro vinda do backend (texto puro) se o checkout
    falhar.
  - `features/orders/order-list.component.ts` — rota `/orders`,
    `adminGuard`. Lista todos os pedidos (tabela de itens por pedido),
    menu de mudança de status (usa `ORDER_STATUSES`/`ORDER_STATUS_LABELS`/
    `ORDER_STATUS_COLORS` de `core/models.ts`), botão de excluir.

## Fluxo de dados

**Montar carrinho**: grid/detalhe de produto → `CartService.add` →
grava em `localStorage` sob a chave do usuário atual → `count` (badge)
atualiza reativamente via signal.

**Checkout**: `CartComponent` → junta linhas com dados de produto
(`ProductService.getAll`) → `OrderService.create([{productId, quantity}])`
→ backend recalcula preço/total server-side, persiste `Order` +
`OrderItems`, retorna o pedido criado → frontend limpa o carrinho local e
navega pra home. Se o backend rejeitar (ex: produto não existe mais), o
carrinho **não** é limpo, e o erro é mostrado inline.

**Gestão admin**: `OrderListComponent` carrega pedidos + produtos em
paralelo (`forkJoin`) só pra resolver nome de produto por id (o
`OrderItem` retornado não inclui `Product` navegado na listagem) →
mudanças de status/exclusão disparam `OrderService` e recarregam a lista.

## Decisões técnicas e alternativas descartadas

- **Decisão**: preço do item travado em `UnitPriceAtPurchase` no momento
  da criação do pedido.
  **Alternativa descartada**: sempre mostrar o preço atual do produto,
  mesmo em pedidos antigos.
  **Motivo**: histórico de compra tem que refletir o que o cliente pagou,
  não o preço de hoje.

- **Decisão**: carrinho 100% client-side, sem persistência no backend.
  **Alternativa descartada**: entidade `Cart` no banco.
  **Motivo**: decisão de design já registrada em `CONTEXT.md` — o carrinho
  é estado transitório e vira registro durável só como `Order`.

- **Decisão**: FK `OrderItem.ProductId` como `Restrict` delete (corrigido
  de `Cascade`, que era o default herdado do EF Core sem override
  explícito).
  **Alternativa descartada**: manter `Cascade`, ou copiar um snapshot do
  nome do produto pro `OrderItem` e permitir excluir o produto livremente.
  **Motivo**: `Cascade` apagava silenciosamente itens de pedidos antigos
  ao excluir um produto, corrompendo histórico e total. `Restrict` bloqueia
  a exclusão na origem — o endpoint `DELETE /product/{id}` agora checa
  `OrderItems` antes de apagar e retorna 409 com mensagem clara, em vez de
  deixar o banco estourar uma exceção de FK. Copiar um snapshot do nome
  foi descartado por ora para não aumentar o escopo desta correção.

## Testes

Sem suíte automatizada no momento. Verificação manual recomendada:

- Checkout com 2+ itens → total do `Order` bate com soma
  `preço-no-momento × quantidade`.
- Checkout enviando `quantity <= 0` → 400, nenhum pedido criado.
- Checkout referenciando `productId` inexistente → 400, nenhum pedido
  criado (nem parcial).
- Trocar de usuário logado no mesmo navegador → carrinho muda para o da
  nova conta.
- **Regressão a cobrir manualmente até o bug de cascade ser corrigido**:
  criar pedido com produto X, excluir produto X, verificar que o pedido
  fica com item/total corrompido — documentar o resultado observado.
