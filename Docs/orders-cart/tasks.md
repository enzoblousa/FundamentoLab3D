# Carrinho & Pedidos — Tasks

> Depende de: [plan.md](plan.md)
> Status: já implementado — checklist histórico.

## Backend

- [x] Modelos `Order` e `OrderItem` (`Status` com enum de strings fixas em
      `OrderStatus`)
- [x] `POST /order` (checkout) — valida itens não vazios, quantidade > 0,
      produto existente; calcula preço e total server-side; associa
      `UserId` do token
- [x] `GET /order`, `GET /order/{id}` (AdminOnly)
- [x] `PUT /order/{id}` (substituição completa de itens, AdminOnly)
- [x] `PATCH /order/{id}` (ajuste de quantidade por item, AdminOnly)
- [x] `PATCH /order/{id}/status` (AdminOnly, valida contra `OrderStatus.All`)
- [x] `DELETE /order/{id}` (AdminOnly)
- [x] **Corrigido**: FK `OrderItem.ProductId` trocada de `Cascade` para
      `Restrict` (`SysDbContext.OnModelCreating` + migração
      `RestrictProductDeleteWhenOrdered`), e `DELETE /product/{id}` agora
      checa `OrderItems` antes de excluir, retornando 409 com mensagem
      clara em vez de deixar o banco estourar exceção de FK.

## Frontend

- [x] `CartService` — carrinho por usuário em `localStorage`, reativo a
      troca de conta via `effect()`
- [x] `OrderService` — `getAll`, `getById`, `create`, `delete`,
      `updateStatus`
- [x] `CartComponent` (rota `/cart`, `authGuard`) — junta carrinho com
      dados de produto, checkout, limpa carrinho só em caso de sucesso
- [x] `OrderListComponent` (rota `/orders`, `adminGuard`) — lista,
      mudança de status via menu, exclusão

## Verificação end-to-end

- [x] Fluxo montar carrinho → checkout → pedido aparece pro Admin com
      total correto, validado manualmente contra os critérios de aceite
      do `spec.md`.
- [x] Regressão do bug de cascade: migração aplicada no banco de dev
      (`dotnet ef database update`); falta apenas confirmar via API
      (tentar excluir um produto com pedido associado e ver o 409).
