# Autenticação e Autorização — Spec

> Status: implementado (retroativo)
> Última atualização: 2026-07-07

## Contexto

A loja precisa diferenciar clientes comuns de administradores: clientes
navegam o catálogo e fazem pedidos, administradores gerenciam produtos,
categorias e o ciclo de vida dos pedidos. O sistema usa autenticação por
email/senha com token JWT emitido pelo backend e guardado pelo navegador —
não há sessão de servidor, cada requisição autenticada carrega o token.

## Escopo

Em escopo:

- Cadastro de conta (sempre como cliente comum)
- Login com email/senha, emissão de JWT
- Autorização por role (`User` / `Admin`) em endpoints e rotas do frontend
- Logout (client-side)

Fora de escopo (não implementado):

- Recuperação/redefinição de senha ("esqueci minha senha")
- Verificação de email
- Refresh token / renovação de sessão sem novo login
- Criação de contas Admin via API (hoje só existe via seed inicial do banco)
- Login social (Google, etc.)
- Rate limiting / bloqueio de conta após tentativas falhas de login

## Requisitos funcionais

1. Como visitante, eu posso criar uma conta informando email e senha, para
   poder fazer login e comprar.
2. Como usuário cadastrado, eu posso entrar com email e senha, para receber
   um token que me identifica nas próximas requisições.
3. Como usuário logado, minha sessão expira automaticamente depois de um
   tempo configurado — depois disso preciso logar de novo.
4. Como usuário logado, eu posso sair, o que invalida meu acesso no
   navegador imediatamente (o token continua tecnicamente válido no
   backend até expirar, mas o frontend descarta e para de enviá-lo).
5. Como Admin, eu tenho acesso a telas e endpoints que um usuário comum não
   tem (gestão de produtos, categorias e pedidos).
6. Toda nova conta é criada com a role `User` — não existe fluxo de
   autocadastro como `Admin`.

## Regras de negócio

- Email é único por conta. Tentar cadastrar um email já existente é
  rejeitado (não sobrescreve, não faz login automático).
- Senha nunca é armazenada em texto puro nem retornada em nenhuma resposta
  da API (o hash é explicitamente excluído da serialização).
- Verificação de senha é feita com hash+salt (não há comparação de texto
  puro em nenhum momento).
- O token carrega identidade (`sub` = id do usuário), email e role. O
  frontend decide o que mostrar/permitir decodificando esses claims —
  **não há endpoint `/auth/me`**; a fonte de verdade de "quem eu sou" é o
  próprio token.
- Expiração do token é controlada por configuração do backend
  (`JwtSettings:ExpiresMinutes`), não por uma escolha do usuário ("lembrar
  de mim" não existe).
- As duas contas seed (`admin@fundamento.com` / `user@fundamento.com`) só
  existem em ambiente de desenvolvimento, criadas automaticamente se a
  tabela de usuários estiver vazia no startup.

## Atores e permissões

| Ator | Pode |
|---|---|
| Visitante (não logado) | Ver catálogo de produtos, cadastrar conta, fazer login |
| User | Tudo do visitante + montar carrinho, finalizar pedido, ver seus próprios pedidos (via token) |
| Admin | Tudo do User + gerenciar produtos, categorias, e ver/editar/excluir qualquer pedido |

## Critérios de aceite

- [ ] Dado um email já cadastrado, quando tento cadastrar de novo com o
      mesmo email, então recebo erro de conflito e nenhuma conta nova é
      criada.
- [ ] Dado um cadastro com sucesso, quando ele termina, então **não** sou
      logado automaticamente — preciso ir para a tela de login.
- [ ] Dado email/senha corretos, quando faço login, então recebo um token
      válido e sou reconhecido como logado no frontend.
- [ ] Dado email ou senha incorretos, quando tento logar, então recebo erro
      genérico "Email ou senha inválidos" (sem revelar se o email existe).
- [ ] Dado que não estou logado, quando tento acessar uma rota que exige
      login (ex: carrinho), então sou redirecionado para `/login`.
- [ ] Dado que estou logado como `User`, quando tento acessar uma rota
      Admin-only (ex: `/admin`), então sou redirecionado para a home.
- [ ] Dado que meu token expirou, quando faço qualquer requisição
      autenticada, então sou deslogado automaticamente e redirecionado
      para `/login`.
- [ ] Dado que faço logout, quando navego pra uma rota protegida, então sou
      tratado como não-logado.

## Perguntas em aberto

- Não existe forma de promover um usuário existente a Admin nem de criar
  novos Admins fora do seed — isso é intencional para o estágio atual do
  projeto, ou é uma lacuna a resolver em uma fase futura?
- A regra de senha mínima de 6 caracteres só é validada no frontend
  (formulário de cadastro); a API aceita qualquer senha não vazia. Se o
  frontend for contornado (chamada direta à API), essa regra não é
  garantida — vale mover a validação para o backend?
