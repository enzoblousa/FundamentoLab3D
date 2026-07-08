# Catálogo: Produtos & Categorias — Tasks

> Depende de: [plan.md](plan.md)
> Status: já implementado — checklist histórico.

## Backend

- [x] Modelos `Product` e `Category` (relação N:1 opcional)
- [x] `GET /product`, `GET /product/{id}` (públicos, com `Category`
      incluída via `Include`)
- [x] `POST /product`, `PUT /product/{id}`, `DELETE /product/{id}`
      (AdminOnly, validações de Name/Price/CategoryId)
- [x] `DELETE /product/{id}` bloqueia (409) exclusão de produto já
      referenciado em algum pedido, em vez de deixar a FK cascatear
- [x] `GET /category` (público)
- [x] `POST /category`, `PUT /category/{id}` (AdminOnly, validação de Name)
- [x] `DELETE /category/{id}` (AdminOnly, orfaniza produtos vinculados
      antes de excluir a categoria)
- [x] Seed de categorias e produtos de exemplo no startup

## Frontend

- [x] `ProductService` e `CategoryService` (HTTP clients finos)
- [x] `ProductGridComponent` reusável (flag `manageable` + checagem de
      `isAdmin` pra mostrar ações de editar/excluir)
- [x] `ProductDetailComponent` (rota pública, trata 404)
- [x] `ProductFormComponent` (criar/editar, rota Admin-only, chip-list de
      cores)
- [x] `CategoryListComponent` (CRUD inline completo, rota Admin-only)
- [x] Placeholder visual determinístico para produto sem `imageUrl`

## Verificação end-to-end

- [x] Fluxo criar categoria → criar produto associado → excluir categoria
      → produto continua visível sem categoria, validado manualmente
      contra os critérios de aceite do `spec.md`.
