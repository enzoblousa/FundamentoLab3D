# Autenticação e Autorização — Plan

> Depende de: [spec.md](spec.md)

## Visão geral da solução

Login/senha tradicional. Backend gera JWT assinado (HMAC-SHA256) contendo
id, email e role do usuário; o frontend guarda o token no `localStorage`,
decodifica o payload client-side pra saber quem está logado e qual a role,
e anexa o token em toda requisição via interceptor HTTP.

## Modelo de dados (backend)

```
User
- Id: int (PK)
- Email: string
- PasswordHash: string — "{saltBase64}:{hashBase64}", nunca serializado no JSON ([JsonIgnore])
- Role: string — "User" (default) | "Admin"
```

Sem migração pendente — modelo já existe e está em produção (dev).

## Endpoints (backend)

Grupo de rota: `/auth`

| Método | Rota | Autorização | Request | Response | Descrição |
|---|---|---|---|---|---|
| POST | `/auth/register` | pública | `{ email, password }` | 201 `{ id, email, role }` / 409 se email já existe | Cria usuário com role fixa `User` |
| POST | `/auth/login` | pública | `{ email, password }` | 200 `{ token, expiresAt }` / 401 se credenciais inválidas | Emite JWT |

Hashing: PBKDF2-HMAC-SHA256, 100.000 iterações, salt de 16 bytes, hash de
32 bytes (`Fundamento.Api/Auth/PasswordHasher.cs`). Verificação usa
comparação em tempo constante (`CryptographicOperations.FixedTimeEquals`).

JWT: claims `sub` (id), `email`, role (`ClaimTypes.Role`). Assinado com a
chave simétrica de `JwtSettings:Key`; issuer/audience/expiração também vêm
de `JwtSettings` (`appsettings`). Validado globalmente via
`AddJwtBearer` no pipeline (`Program.cs`).

Autorização por policy: `AdminOnly` = `RequireRole("Admin")`, aplicada nos
endpoints de produtos, categorias e pedidos (ver specs correspondentes).

## Frontend

- **Serviço**: `core/services/auth.service.ts` (`AuthService`)
  - `login(email, password)`: `POST /auth/login`, grava token no
    `localStorage` (`fundamento_token`) e atualiza um `signal` interno.
  - `register(email, password)`: `POST /auth/register`, **não** loga
    automaticamente.
  - `logout()`: limpa `localStorage` e o signal.
  - Signals derivados (`computed`) decodificando o payload do JWT (base64,
    sem verificar assinatura client-side — a assinatura só importa pro
    backend): `isLoggedIn`, `userId`, `email`, `role`, `isAdmin`.
  - Ao instanciar, lê o token salvo e descarta automaticamente se `exp` já
    passou.

- **Guards** (`core/guards/auth.guard.ts`):
  - `authGuard`: exige `isLoggedIn()`, senão redireciona `/login`.
  - `adminGuard`: exige `isLoggedIn()` **e** `isAdmin()`; se logado mas não
    admin, redireciona `/` (não `/login`, pra não sugerir que precisa logar
    de novo).

- **Interceptor** (`core/interceptors/auth.interceptor.ts`):
  Anexa `Authorization: Bearer <token>` em toda requisição HTTP saindo do
  app, se houver token. Em resposta `401` **com** token presente, assume
  sessão expirada/inválida: faz logout e redireciona `/login`. Um `401`
  sem token (ex: login errado) não dispara esse fluxo — é tratado
  localmente pelo componente de login.

- **Rotas** (`app.routes.ts`): `/login` e `/register` são públicas;
  `/admin`, `/products/new`, `/products/:id/edit`, `/orders`,
  `/categories` usam `adminGuard`; `/cart` usa `authGuard`.

## Fluxo de dados

**Cadastro**: form de registro → `AuthService.register` → `POST
/auth/register` → backend valida unicidade de email, hasheia senha, salva
`User` com role `User` → resposta 201 → frontend mostra snackbar e navega
pra `/login` (usuário precisa logar manualmente).

**Login**: form de login → `AuthService.login` → `POST /auth/login` →
backend verifica hash, gera JWT → frontend salva token, `AuthService`
recomputa os signals de identidade a partir do payload decodificado →
navega pra `/`.

**Requisição autenticada**: interceptor injeta o header `Authorization` em
toda chamada HTTP → backend valida assinatura/expiração via middleware
`UseAuthentication`/`UseAuthorization` antes do handler → policy
`AdminOnly` barra o endpoint com 403 se a role não bater.

**Expiração**: não há refresh silencioso. Ao expirar, a próxima chamada
autenticada recebe 401 → interceptor desloga e redireciona.

## Decisões técnicas e alternativas descartadas

- **Decisão**: token JWT stateless, sem sessão no servidor.
  **Alternativa descartada**: cookie de sessão com store server-side.
  **Motivo**: simplicidade para o estágio atual do projeto; sem
  necessidade de invalidação de sessão no servidor até agora.

- **Decisão**: `register` sempre cria role `User`; não existe endpoint para
  criar Admin.
  **Alternativa descartada**: campo `role` no `RegisterRequest`.
  **Motivo**: evita que qualquer visitante se autopromova a Admin — mas
  isso deixa em aberto como Admins são criados fora do seed (ver "Perguntas
  em aberto" na spec).

- **Decisão**: decodificar o JWT no frontend para leitura de claims, sem
  chamar um endpoint `/auth/me`.
  **Alternativa descartada**: endpoint dedicado que devolve o usuário
  autenticado.
  **Motivo**: menos uma chamada de rede; o token já carrega tudo que o
  frontend precisa mostrar. Tradeoff: se os claims do token mudarem depois
  de emitido (ex: promover a Admin), o frontend só vê a mudança após um
  novo login.

## Testes

Sem suíte automatizada no momento (xUnit no backend, `ng test`/e2e no
frontend). Verificação manual recomendada:

- Cadastro com email duplicado → 409, sem novo registro no banco.
- Login com senha errada → 401, mensagem genérica.
- Acesso a `/admin` como `User` → redireciona pra `/`.
- Acesso a `/cart` deslogado → redireciona pra `/login`.
- Token expirado (ajustar `ExpiresMinutes` baixo em dev) → próxima chamada
  autenticada desloga e redireciona.
