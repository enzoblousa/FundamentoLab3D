# Painel de Admin — Tasks

> Depende de: [plan.md](plan.md)
> Status: já implementado — checklist histórico.

## Frontend

- [x] Rota `/admin` com `adminGuard`
- [x] `AdminDashboardComponent` — carrega produtos, busca client-side por
      nome, contador pluralizado
- [x] Reuso de `ProductGridComponent` em modo `manageable`
- [x] Atalhos de navegação pra `/categories`, `/orders`, `/products/new`
- [x] Estados vazios: prateleira vazia (sem produtos) e busca sem
      resultado (com botão de limpar)

## Verificação end-to-end

- [x] Fluxo abrir `/admin` → buscar → editar/excluir produto validado
      manualmente contra os critérios de aceite do `spec.md`.
