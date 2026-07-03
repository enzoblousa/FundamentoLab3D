# Autenticação & Autorização — explicação técnica linha por linha

> Referência de implementação. Para o design original (decisões e trade-offs),
> veja `docs/superpowers/specs/2026-07-01-auth-authorization-design.md`. Este
> documento explica **como** o código funciona, arquivo por arquivo.

## Visão geral

O fluxo é: um usuário faz login (`POST /auth/login`) com email/senha → a API
verifica a senha contra um hash guardado no banco → se bater, devolve um
**JWT** (JSON Web Token) contendo a *role* do usuário → o cliente manda esse
token em todo request futuro, no header `Authorization: Bearer <token>` →
endpoints marcados como protegidos exigem que esse token seja válido e (no
caso de `Product`) que a role seja `Admin`.

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `appsettings.json` | Config do JWT (chave, issuer, audience, expiração) |
| `Model/User.cs` | Entidade do usuário |
| `Data/SysDbContext.cs` | `DbSet<User>` no mesmo `DbContext` de `Product` |
| `Auth/PasswordHasher.cs` | Hash e verificação de senha (PBKDF2) |
| `Model/DTOs/LoginDto.cs` | Request/response do login |
| `Program.cs` | Configuração do pipeline + endpoint de login + proteção das rotas |

---

## `appsettings.json`

```json
"JwtSettings": {
  "Key": "KSlcSOZqy8ULf1Czl09weYoKSlqCquwiE",
  "Issuer": "Fundamento.Api",
  "Audience": "Fundamento.Api",
  "ExpiresMinutes": 60
}
```

- **`Key`** — segredo simétrico usado para *assinar* o token no login e
  *validar a assinatura* em cada request. Quem não sabe essa string não
  consegue forjar um token válido. Precisa ter pelo menos 32 bytes porque o
  algoritmo escolhido (`HmacSha256`, ver mais abaixo) exige uma chave de no
  mínimo 256 bits.
- **`Issuer`** / **`Audience`** — metadados gravados dentro do token dizendo
  "quem emitiu" e "para quem se destina". A validação rejeita tokens cujo
  issuer/audience não batam com o configurado — uma segunda camada de
  checagem além da assinatura.
- **`ExpiresMinutes`** — por quantos minutos, a partir do login, o token
  continua válido.

---

## `Model/User.cs`

```csharp
public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
}
```

- **`Email`** funciona como identificador de login (não existe `Username`
  separado).
- **`PasswordHash`** nunca guarda a senha em texto puro — guarda o resultado
  do `PasswordHasher.Hash(...)` (explicado abaixo), no formato
  `"{salt-base64}:{hash-base64}"`.
- **`Role`** é uma string simples (`"Admin"` ou `"User"`). Não há tabela de
  roles separada porque o conjunto de papéis é fixo e pequeno — modelar como
  tabela relacional seria complexidade sem benefício aqui.

## `Data/SysDbContext.cs`

```csharp
public DbSet<Product> Products => Set<Product>();
public DbSet<User> Users => Set<User>();
```

Um único `DbContext` (`SysDbContext`) expõe as duas tabelas. Não existe um
`DbContext` separado para usuários — é o mesmo banco InMemory, só que agora
com duas entidades.

---

## `Auth/PasswordHasher.cs`

```csharp
static class PasswordHasher
{
    const int SaltSize = 16;
    const int HashSize = 32;
    const int Iterations = 100_000;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);

        return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split(':');
        var salt = Convert.FromBase64String(parts[0]);
        var expectedHash = Convert.FromBase64String(parts[1]);

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
```

Linha por linha:

- **`const int SaltSize = 16` / `HashSize = 32`** — tamanhos em bytes do sal
  (128 bits) e do hash de saída (256 bits). São constantes porque precisam
  ser as mesmas em `Hash` e `Verify`.
- **`const int Iterations = 100_000`** — quantas vezes o algoritmo PBKDF2
  reaplica a função de hash internamente. É isso que torna o cálculo
  deliberadamente "caro": um usuário legítimo não percebe 100 mil iterações
  (leva milissegundos), mas um atacante tentando testar bilhões de senhas
  por segundo (força bruta offline) sente o custo multiplicado por 100 mil.
- **`RandomNumberGenerator.GetBytes(SaltSize)`** — gera 16 bytes aleatórios
  usando um gerador *criptograficamente seguro* (diferente do `Random`
  comum, que é previsível). Esse valor é único por chamada de `Hash`, então
  duas senhas iguais produzem hashes diferentes.
- **`Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize)`**
  — a implementação de PBKDF2 nativa do .NET. Recebe a senha em texto puro,
  o sal, o número de iterações, o algoritmo de hash de base (SHA-256) e o
  tamanho de saída desejado; devolve os bytes do hash.
- **`$"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}"`** —
  concatena sal e hash em uma única string de texto (Base64 porque bytes
  arbitrários não são texto imprimível), separados por `:`, porque é assim
  que o campo `PasswordHash` do `User` guarda os dois valores juntos.
- **`Verify`** refaz exatamente o mesmo cálculo: separa a string salva em
  `parts[0]` (sal) e `parts[1]` (hash esperado), recalcula o hash da senha
  recebida usando o **mesmo sal** que foi salvo, e compara.
- **`CryptographicOperations.FixedTimeEquals(actualHash, expectedHash)`** —
  em vez de `==` ou `SequenceEqual`, essa comparação sempre leva o mesmo
  tempo independente de onde os bytes divergem. Uma comparação "normal" sai
  mais rápido quando o primeiro byte já é diferente — um atacante medindo
  microssegundos de resposta poderia, teoricamente, descobrir o hash byte a
  byte (*timing attack*). `FixedTimeEquals` fecha essa brecha.

---

## `Model/DTOs/LoginDto.cs`

```csharp
public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, DateTime ExpiresAt);
```

- `record` em vez de `class`: são objetos de dados puros (sem comportamento),
  e records já vêm com igualdade por valor e sintaxe posicional concisa —
  idiomático para DTOs em C# moderno.
- `LoginRequest` é o formato que o **cliente envia**; `LoginResponse` é o que
  a API **devolve**. Note que `LoginResponse` nunca inclui nada do `User`
  além do token — não expõe `Id`, `Email`, `Role`, nem muito menos
  `PasswordHash`.

---

## `Program.cs`

### 1. Usings (linhas 1–6)

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
```

- `JwtBearerDefaults` / `AddJwtBearer` vêm de `Authentication.JwtBearer`.
- `TokenValidationParameters` e `SymmetricSecurityKey` vêm de
  `Microsoft.IdentityModel.Tokens`.
- `Encoding.UTF8` (converter a `Key` de string para bytes) vem de
  `System.Text`.
- `JwtSecurityToken` / `JwtSecurityTokenHandler` / `JwtRegisteredClaimNames`
  vêm de `System.IdentityModel.Tokens.Jwt` — é a biblioteca que efetivamente
  monta e serializa o token.
- `Claim` / `ClaimTypes` vêm de `System.Security.Claims` — são o conceito
  genérico do .NET para "afirmações sobre um usuário autenticado" (não é
  específico de JWT; o mesmo tipo é usado em cookies, Windows Auth, etc.).

### 2. Documento OpenAPI + esquema de segurança (linhas 11–27)

```csharp
builder.Services.AddOpenApiDocument(config =>
{
    config.DocumentName = "FundamentoAPI";
    config.Title = "FundamentoAPI v1";
    config.Version = "v1";

    config.AddSecurity("JWT", Enumerable.Empty<string>(), new NSwag.OpenApiSecurityScheme
    {
        Type = NSwag.OpenApiSecuritySchemeType.ApiKey,
        Name = "Authorization",
        In = NSwag.OpenApiSecurityApiKeyLocation.Header,
        Description = "Cole aqui: Bearer {seu token}"
    });

    config.OperationProcessors.Add(
        new NSwag.Generation.Processors.Security.AspNetCoreOperationSecurityScopeProcessor("JWT"));
});
```

Isso não afeta a autenticação em si — é só o que faz o **Swagger UI** saber
exibir o botão "Authorize" (cadeado):

- **`AddSecurity("JWT", ...)`** registra, no documento OpenAPI gerado, um
  esquema de segurança chamado `"JWT"`. `Type = ApiKey` + `Name =
  "Authorization"` + `In = Header` significa "essa API espera um valor
  arbitrário no header HTTP `Authorization`" (por isso você precisa digitar
  `Bearer <token>` completo na UI, e não só o token puro).
- **`AspNetCoreOperationSecurityScopeProcessor("JWT")`** varre os endpoints
  mapeados e, para aqueles que têm `.RequireAuthorization(...)`, anota no
  documento OpenAPI que eles exigem o esquema `"JWT"` — é isso que faz o
  cadeado aparecer *só* nas rotas protegidas.

### 3. Registrar a autenticação JWT (linhas 30–44)

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("JwtSettings");
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!))
        };
    });
```

- **`AddAuthentication(JwtBearerDefaults.AuthenticationScheme)`** registra o
  esquema de autenticação padrão da aplicação como "JWT Bearer" — ou seja,
  toda vez que o pipeline precisar autenticar um request, ele vai usar o
  handler configurado a seguir.
- **`.AddJwtBearer(options => ...)`** registra o handler em si: o código que
  sabe ler o header `Authorization: Bearer <token>`, decodificar o JWT e
  validá-lo.
- **`jwtSettings["Issuer"]` / `["Audience"]` / `["Key"]`** — lidos direto de
  `IConfiguration`, isto é, do `appsettings.json` (seção `JwtSettings`).
- **`TokenValidationParameters`** são as regras que decidem se um token é
  aceito:
  - `ValidateIssuer` / `ValidIssuer` — o campo `iss` do token precisa bater
    com `"Fundamento.Api"`.
  - `ValidateAudience` / `ValidAudience` — o campo `aud` precisa bater com
    `"Fundamento.Api"`.
  - `ValidateLifetime` — rejeita token cujo `exp` (expiração) já passou.
  - `ValidateIssuerSigningKey` + `IssuerSigningKey` — **a checagem mais
    importante**: recalcula a assinatura do token usando a mesma `Key`
    (convertida de string para bytes via `Encoding.UTF8.GetBytes`) e
    confirma que bate com a assinatura que veio no token. Sem essa
    validação batendo, qualquer um poderia editar o payload do token (por
    exemplo, trocar `"role":"User"` por `"role":"Admin"`) e a API aceitaria.

### 4. Registrar a policy de autorização (linhas 46–47)

```csharp
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
```

- Isso é uma coisa **diferente** de autenticação: autenticação responde "quem
  é você?" (feito pelo `AddJwtBearer` acima); autorização responde "você tem
  permissão pra isso?".
- **`AddAuthorizationBuilder()`** é a API mais recente (substitui o antigo
  `services.AddAuthorization(options => ...)`) pra registrar políticas.
- **`.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"))`** define
  uma política nomeada `"AdminOnly"` cuja única exigência é: o usuário
  autenticado precisa ter uma claim de role igual a `"Admin"`. Essa política
  é referenciada mais abaixo via `.RequireAuthorization("AdminOnly")`.

### 5. Seed de usuários (linhas 49–70)

```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SysDbContext>();
    db.Database.EnsureCreated();

    if (!db.Users.Any())
    {
        db.Users.Add(new User { Email = "admin@fundamento.com", PasswordHash = PasswordHasher.Hash("Admin123!"), Role = "Admin" });
        db.Users.Add(new User { Email = "user@fundamento.com", PasswordHash = PasswordHasher.Hash("User123!"), Role = "User" });
        db.SaveChanges();
    }
}
```

- **`app.Services.CreateScope()`** — `SysDbContext` é registrado como serviço
  *scoped* (uma instância por request HTTP, normalmente). Como este código
  roda no *startup*, fora de qualquer request, é preciso abrir manualmente
  um escopo pra conseguir pedir uma instância via `GetRequiredService`. O
  `using` garante que o escopo é descartado corretamente ao sair do bloco.
- **`db.Database.EnsureCreated()`** — garante que o schema do banco (mesmo
  sendo InMemory) já existe antes de consultar `db.Users`.
- **`if (!db.Users.Any())`** — evita duplicar os dois usuários toda vez que
  o código rodasse mais de uma vez sobre o mesmo banco (com InMemory isso
  não se sustenta entre restarts, mas é o mesmo padrão que valeria com um
  banco persistente).
- **`PasswordHasher.Hash("Admin123!")`** — a senha em texto puro só existe
  neste ponto do código-fonte (dado de seed); o que vai pro banco é sempre
  o hash.

### 6. Ordem do pipeline de middleware (linhas 72–84)

```csharp
if (app.Environment.IsDevelopment()) { /* swagger */ }
app.UseAuthentication();
app.UseAuthorization();

var productItems = app.MapGroup("/product");
```

- **`app.UseAuthentication()`** — middleware que roda em *todo* request:
  olha o header `Authorization`, e se houver um Bearer token, tenta validá-lo
  (usando a configuração da seção 3). Se válido, popula `HttpContext.User`
  com as claims do token (id, email, role). Se não houver token, ou for
  inválido, `HttpContext.User` fica "anônimo" — mas o request **continua**
  (autenticação não bloqueia nada sozinha).
- **`app.UseAuthorization()`** — middleware que checa, pra cada endpoint, se
  ele exige alguma política (`.RequireAuthorization(...)`) e se o
  `HttpContext.User` (populado no passo anterior) cumpre essa política. Se
  não cumprir, curto-circuita a resposta com `401` ou `403` antes de chegar
  no handler do endpoint.
- **Por que a ordem importa:** essas duas linhas precisam vir **antes** de
  `app.MapGroup(...)`/`Map*(...)`. Em minimal APIs, a posição das chamadas
  `Use...` relativa às chamadas `Map...` define a ordem real do pipeline. Se
  `UseAuthentication`/`UseAuthorization` fossem registrados depois dos
  `Map...`, os endpoints ficariam efetivamente fora da proteção — o
  middleware de autorização nunca teria a chance de rodar antes deles.

### 7. Endpoint de login (linhas 90 e 97–130)

```csharp
authItems.MapPost("/login", Login);
...
static async Task<IResult> Login(LoginRequest request, SysDbContext db, IConfiguration config)
{
    var user = await db.Users.SingleOrDefaultAsync(u => u.Email == request.Email);

    if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
    {
        return TypedResults.Unauthorized();
    }

    var jwtSettings = config.GetSection("JwtSettings");
    var expires = DateTime.UtcNow.AddMinutes(jwtSettings.GetValue<int>("ExpiresMinutes"));

    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(ClaimTypes.Role, user.Role)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: jwtSettings["Issuer"],
        audience: jwtSettings["Audience"],
        claims: claims,
        expires: expires,
        signingCredentials: credentials
    );

    var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

    return TypedResults.Ok(new LoginResponse(tokenString, expires));
}
```

- **Parâmetros do método (`LoginRequest request, SysDbContext db,
  IConfiguration config`)** — minimal APIs usam *dependency injection* nos
  parâmetros: `request` vem do corpo JSON do POST, `db` e `config` são
  resolvidos automaticamente a partir dos serviços registrados no `builder`.
- **`db.Users.SingleOrDefaultAsync(u => u.Email == request.Email)`** —
  procura um usuário por email. `SingleOrDefaultAsync` devolve `null` se não
  achar nenhum (e lançaria exceção se achasse mais de um — não é o caso
  aqui, já que email deveria ser único).
- **`user is null || !PasswordHasher.Verify(...)`** — as duas causas de
  falha (email não existe / senha errada) caem no **mesmo** `return
  TypedResults.Unauthorized()`. Isso é intencional: a resposta não pode
  diferenciar "email não encontrado" de "senha errada", senão um atacante
  consegue descobrir quais emails têm conta no sistema testando um por um.
- **`jwtSettings.GetValue<int>("ExpiresMinutes")`** — lê o número de minutos
  do `appsettings.json` e calcula `expires` somando a partir de
  `DateTime.UtcNow` (sempre UTC, nunca hora local, para não haver ambiguidade
  de fuso horário).
- **O array `claims`** é o "conteúdo" do token — as afirmações sobre o
  usuário que ele carrega:
  - `JwtRegisteredClaimNames.Sub` ("subject") — convenção padrão de JWT para
    o identificador do usuário.
  - `JwtRegisteredClaimNames.Email` — também um nome padrão de claim JWT.
  - `ClaimTypes.Role` — **não** é um nome "custom" tipo `"role"`; é o tipo
    de claim específico que o ASP.NET Core já sabe procurar por padrão
    quando você chama `RequireRole("Admin")`. Usar exatamente esse tipo
    evita ter que configurar mapeamento de claims manualmente.
- **`SymmetricSecurityKey` + `SigningCredentials(key,
  SecurityAlgorithms.HmacSha256)`** — monta o objeto de assinatura: a mesma
  `Key` do `appsettings.json`, usada com o algoritmo HMAC-SHA256, que também
  é o algoritmo que a validação (seção 3) espera.
- **`new JwtSecurityToken(issuer, audience, claims, expires,
  signingCredentials)`** — monta o token propriamente dito, com todos os
  metadados e a assinatura.
- **`new JwtSecurityTokenHandler().WriteToken(token)`** — serializa o objeto
  `JwtSecurityToken` para a string compacta no formato
  `header.payload.assinatura` (Base64Url em cada parte) — é essa string que
  vai na resposta e que o cliente vai reenviar depois em
  `Authorization: Bearer <string>`.
- **`TypedResults.Ok(new LoginResponse(tokenString, expires))`** — devolve
  `200` com o token e a data de expiração. Note que a resposta nunca inclui
  `user.Role` nem `user.Id` diretamente — essas informações já estão
  *dentro* do token (nas claims), não precisam ser repetidas no corpo da
  resposta.

### 8. Proteção das rotas de escrita (linhas 92–96)

```csharp
productItems.MapGet("/", GetAllProducts);
productItems.MapGet("/{id}", GetProductById);
productItems.MapPost("/", CreateProduct).RequireAuthorization("AdminOnly");
productItems.MapPut("/{id}", UpdateProduct).RequireAuthorization("AdminOnly");
productItems.MapDelete("/{id}", DeleteProduct).RequireAuthorization("AdminOnly");
```

- `MapPost`/`MapPut`/`MapDelete` devolvem um `RouteHandlerBuilder`, que tem o
  método de extensão `.RequireAuthorization("AdminOnly")` — isso anexa a
  *essa rota específica* a exigência da política registrada na seção 4.
- Os dois `MapGet` não têm `.RequireAuthorization(...)` — continuam
  acessíveis sem token nenhum.
- Em runtime, o efeito é: `UseAuthentication` decodifica o token (se houver)
  → `UseAuthorization` olha o endpoint alvo, vê que ele exige `"AdminOnly"`,
  e checa se `HttpContext.User` tem a claim de role `"Admin"` → só então o
  handler (`CreateProduct` etc.) roda. Sem token: `401`. Com token mas role
  errada: `403`.

---

## Resumo do ciclo de uma request autenticada

```
Cliente                          API
  |  POST /auth/login              |
  |-------------------------------->|  Login(): verifica hash, gera JWT
  |  200 { token, expiresAt }      |
  |<--------------------------------|
  |                                 |
  |  POST /product                 |
  |  Authorization: Bearer <token> |
  |-------------------------------->|  UseAuthentication: valida assinatura/issuer/audience/exp,
  |                                 |  popula HttpContext.User com as claims
  |                                 |  UseAuthorization: policy "AdminOnly" -> RequireRole("Admin")
  |                                 |  CreateProduct(): roda só se passou na policy
  |  201 Created                   |
  |<--------------------------------|
```

---

## Referências

**Autenticação/Autorização no ASP.NET Core**

- [Overview de autenticação e autorização no ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/)
- [Autenticação JWT Bearer](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt-authn)
- [Autorização baseada em políticas (`AddAuthorizationBuilder`, `AddPolicy`)](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies)
- [Autorização baseada em roles (`RequireRole`)](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/roles)
- [`RequireAuthorization` em minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis#authorization)
- [Ordem do middleware no ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/#middleware-order)
- [Minimal APIs — visão geral](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis)
- [Dependency injection e `CreateScope` para serviços *scoped*](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection#scoped)

**JWT em si**

- [RFC 7519 — JSON Web Token (JWT), especificação oficial](https://www.rfc-editor.org/rfc/rfc7519)
- [`JwtSecurityToken` (classe usada para montar o token)](https://learn.microsoft.com/en-us/dotnet/api/system.identitymodel.tokens.jwt.jwtsecuritytoken)
- [`TokenValidationParameters` (regras de validação)](https://learn.microsoft.com/en-us/dotnet/api/microsoft.identitymodel.tokens.tokenvalidationparameters)
- [jwt.io — decodificador de JWT para inspecionar o token gerado](https://jwt.io/)

**Hash de senha (PBKDF2)**

- [`Rfc2898DeriveBytes.Pbkdf2` (método usado no `PasswordHasher`)](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.rfc2898derivebytes.pbkdf2)
- [`CryptographicOperations.FixedTimeEquals` (comparação resistente a timing attack)](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

**EF Core**

- [`DbContext` e ciclo de vida (por que é um serviço *scoped*)](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/)
- [`EnsureCreated` vs. Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/ensure-created)

**Swagger/NSwag**

- [Documentação do NSwag](https://github.com/RicoSuter/NSwag/wiki)
- [OpenAPI Specification — Security Schemes](https://swagger.io/docs/specification/authentication/)
