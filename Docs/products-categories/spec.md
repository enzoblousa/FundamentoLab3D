# Catálogo: Produtos & Categorias — Spec

> Status: implementado (retroativo)
> Última atualização: 2026-07-08 (atalho de compra via WhatsApp adicionado
> nesta data)

## Contexto

O catálogo é o coração da loja: uma lista de brinquedos/objetos impressos
em 3D que qualquer visitante pode navegar, e que só administradores podem
criar, editar ou remover. Categoria é um agrupamento opcional usado para
filtrar/organizar produtos — ver definições em [`../../CONTEXT.md`](../../CONTEXT.md).

## Escopo

Em escopo:

- CRUD de produtos (nome, descrição, preço, categoria opcional, cores
  disponíveis, imagem)
- CRUD de categorias (nome)
- Navegação pública do catálogo (listagem e detalhe)
- Gestão do catálogo restrita a Admin
- Atalho para comprar um produto via WhatsApp (abre uma conversa com o
  número fixo da loja, com nome e preço do produto pré-preenchidos),
  disponível tanto na listagem quanto no detalhe do produto, sem exigir
  login

Fora de escopo (não implementado):

- Controle de estoque/quantidade disponível
- Upload de imagem (é só uma URL/caminho de string; a imagem em si precisa
  já existir em `wwwroot` ou ser externa)
- Múltiplas imagens por produto (é uma `ImageUrl` só)
- Busca/filtro de produtos por categoria no frontend público (a busca por
  texto existe hoje só na tela de admin)
- Avaliações/reviews de produto

## Requisitos funcionais

1. Como visitante ou usuário logado, eu posso ver a lista de todos os
   produtos e o detalhe de um produto específico, sem precisar estar
   logado.
2. Como Admin, eu posso criar, editar e excluir produtos.
3. Como Admin, eu posso criar, renomear e excluir categorias.
4. Como Admin, ao criar/editar um produto, eu posso opcionalmente
   associá-lo a uma categoria existente, ou deixá-lo sem categoria.
5. Como Admin, eu posso adicionar uma lista de cores disponíveis a um
   produto (texto livre, não uma lista fechada).
6. Como visitante ou usuário logado, eu posso abrir uma conversa de
   WhatsApp pré-preenchida com o nome e o preço de um produto específico,
   direto da listagem ou do detalhe, sem precisar estar logado.

## Regras de negócio

- Nome do produto e nome da categoria são obrigatórios (não podem ser
  vazios/só espaço).
- Preço deve ser maior que zero.
- Se um `categoryId` for informado ao criar/editar produto, a categoria
  precisa existir — senão a operação é rejeitada.
- **Excluir uma categoria não exclui nem bloqueia os produtos associados a
  ela** — os produtos ficam sem categoria (órfãos), continuam existindo e
  continuam visíveis no catálogo.
- **Excluir um produto que já foi comprado em algum pedido é bloqueado**
  (não órfão, não cascata) — protege o histórico de pedidos. Ver
  [`../orders-cart/spec.md`](../orders-cart/spec.md).
- Cores são uma lista de strings livres por produto (sem catálogo fixo de
  cores nem validação de valores permitidos).
- Um produto sem imagem definida ainda é exibido normalmente no catálogo
  (o frontend desenha um placeholder ilustrativo no lugar da foto).
- O botão de WhatsApp no catálogo é um atalho de contato, não um canal de
  compra registrado pelo backend — não cria pedido nem qualquer registro
  de interesse; é só um link `https://wa.me/...` com mensagem
  pré-preenchida montado inteiramente no frontend.
- O número de WhatsApp da loja é fixo, hardcoded no frontend — não é
  configurável por Admin nem varia por ambiente.

## Atores e permissões

| Ator | Pode |
|---|---|
| Visitante / User | Ver lista de produtos e detalhe de produto, ver lista de categorias (usada para exibir a tag do produto) |
| Admin | Tudo do User + criar/editar/excluir produto, criar/renomear/excluir categoria |

## Critérios de aceite

- [ ] Dado um produto sem `categoryId`, quando é criado, então é salvo
      normalmente e aparece no catálogo sem categoria.
- [ ] Dado um `categoryId` que não existe, quando tento criar ou editar um
      produto com ele, então a operação é rejeitada.
- [ ] Dado um preço `0` ou negativo, quando tento criar ou editar um
      produto, então a operação é rejeitada.
- [ ] Dado um produto associado a uma categoria, quando essa categoria é
      excluída, então o produto continua existindo, sem categoria.
- [x] Dado um produto que já foi comprado em algum pedido, quando um Admin
      tenta excluí-lo, então a operação é rejeitada (409) e o produto
      continua existindo.
- [ ] Dado que não sou Admin, quando tento chamar qualquer endpoint de
      escrita de produto ou categoria diretamente, então recebo 401/403 —
      independente do que a UI esconde.
- [ ] Dado um usuário não-Admin navegando o catálogo, quando ele acessa a
      home ou a página de um produto, então vê a listagem/detalhe
      normalmente, sem os controles de editar/excluir.
- [x] Dado um produto qualquer, quando clico no botão de WhatsApp na
      listagem ou no detalhe, então uma nova aba abre para `wa.me` com o
      número fixo da loja e uma mensagem pré-preenchida contendo o nome e
      o preço formatado (BRL) do produto.
- [x] Dado que não estou logado, quando clico no botão de WhatsApp de um
      produto, então o link abre normalmente — diferente de "Colocar na
      sacola", esse atalho não exige login.

## Perguntas em aberto

- Existe um `ProductPatchDto` (`Name`, `Description`) no código que não
  está associado a nenhum endpoint — é resquício de um PATCH parcial
  planejado e não implementado? Se não for necessário, vale remover; se
  for, falta a rota.
- Não há paginação em `GET /product` nem `GET /category` — aceitável
  enquanto o catálogo for pequeno, mas deve ser revisitado se o volume de
  produtos crescer.
