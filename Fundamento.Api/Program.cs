using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<SysDbContext>(opt => opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddEndpointsApiExplorer();
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

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SysDbContext>();
    db.Database.Migrate();

    if (!db.Users.Any())
    {
        db.Users.Add(new User
        {
            Email = "admin@fundamento.com",
            PasswordHash = PasswordHasher.Hash("Admin123!"),
            Role = "Admin"
        });
        db.Users.Add(new User
        {
            Email = "user@fundamento.com",
            PasswordHash = PasswordHasher.Hash("User123!"),
            Role = "User"
        });
        db.SaveChanges();
    }

    // Backfill de imagens de exemplo para os produtos já cadastrados.
    var productsByName = db.Products.ToDictionary(p => p.Name!, p => p);
    void BackfillImage(string name, string imageUrl)
    {
        if (productsByName.TryGetValue(name, out var existing) && existing.ImageUrl is null)
            existing.ImageUrl = imageUrl;
    }
    BackfillImage("Polvo Articulado", "/products/polvo-articulado.svg");
    BackfillImage("Cubo de Calibração 3D", "/products/cubo-calibracao.svg");
    BackfillImage("Polvo Crochê", "/products/polvo-croche.svg");

    // Produtos de exemplo adicionais, para popular a loja com imagens.
    var categoriesByName = db.Categories.ToDictionary(c => c.Name, c => c.Id);
    int? CategoryId(string name) => categoriesByName.TryGetValue(name, out var id) ? id : null;

    var exampleProducts = new[]
    {
        new Product
        {
            Name = "T-Rex Articulado",
            Description = "Dinossauro com juntas móveis, imprimido em uma peça só.",
            Price = 34.9m,
            CategoryId = CategoryId("Bonecos"),
            Colors = new List<string> { "Verde" },
            ImageUrl = "/products/trex-articulado.svg"
        },
        new Product
        {
            Name = "Suporte de Celular Geométrico",
            Description = "Suporte facetado para deixar o celular em pé na mesa.",
            Price = 24.5m,
            CategoryId = CategoryId("Decoração"),
            Colors = new List<string> { "Azul" },
            ImageUrl = "/products/suporte-celular.svg"
        },
        new Product
        {
            Name = "Jogo da Velha de Bolso",
            Description = "Tabuleiro compacto com peças X e O para levar pra qualquer lugar.",
            Price = 19.9m,
            CategoryId = CategoryId("Jogos"),
            Colors = new List<string> { "Vermelho", "Amarelo" },
            ImageUrl = "/products/jogo-da-velha.svg"
        },
        new Product
        {
            Name = "Mascote Robô",
            Description = "Robozinho fofo com antena e olhos grandes, feito de peças montáveis.",
            Price = 29.9m,
            CategoryId = CategoryId("Personagens"),
            Colors = new List<string> { "Azul", "Roxo" },
            ImageUrl = "/products/mascote-robo.svg"
        },
        new Product
        {
            Name = "Vaso Espiral",
            Description = "Vaso decorativo impresso em espiral contínua, ideal para suculentas.",
            Price = 27.9m,
            CategoryId = CategoryId("Decoração"),
            Colors = new List<string> { "Vermelho" },
            ImageUrl = "/products/vaso-espiral.svg"
        }
    };

    foreach (var product in exampleProducts)
    {
        if (!productsByName.ContainsKey(product.Name!))
            db.Products.Add(product);
    }

    db.SaveChanges();
}

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi(config =>
    {
        config.DocumentTitle = "FundamentoAPI";
        config.Path = "/swagger";
        config.DocumentPath = "/swagger/{documentName}/swagger.json";
        config.DocExpansion = "list";
    });
}
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

var productItems = app.MapGroup("/product");
var authItems = app.MapGroup("/auth");
var orderItems = app.MapGroup("/order");
var categoryItems = app.MapGroup("/category");

orderItems.MapGet("/", GetOrder).RequireAuthorization("AdminOnly");
orderItems.MapGet("/{id}", GetOrderById).RequireAuthorization("AdminOnly");
orderItems.MapPost("/", CreateOrder).RequireAuthorization();
orderItems.MapPut("/{id}", ReplaceOrder).RequireAuthorization("AdminOnly");
orderItems.MapPatch("/{id}", UpdateOrderItemQuantities).RequireAuthorization("AdminOnly");
orderItems.MapPatch("/{id}/status", UpdateOrderStatus).RequireAuthorization("AdminOnly");
orderItems.MapDelete("/{id}", DeleteOrder).RequireAuthorization("AdminOnly");
authItems.MapPost("/login", Login);
authItems.MapPost("/register", Register);
productItems.MapGet("/", GetAllProducts);
productItems.MapGet("/{id}", GetProductById);
productItems.MapPost("/", CreateProduct).RequireAuthorization("AdminOnly");
productItems.MapPut("/{id}", UpdateProduct).RequireAuthorization("AdminOnly");
productItems.MapDelete("/{id}", DeleteProduct).RequireAuthorization("AdminOnly");
categoryItems.MapGet("/", GetAllCategories);
categoryItems.MapPost("/", CreateCategory).RequireAuthorization("AdminOnly");
categoryItems.MapPut("/{id}", UpdateCategory).RequireAuthorization("AdminOnly");
categoryItems.MapDelete("/{id}", DeleteCategory).RequireAuthorization("AdminOnly");

// COMO DEVERIA SER
static async Task<IResult> Register(RegisterRequest registerRequest, SysDbContext db)
{
    // 1. Verifica se email já existe
    var exists = await db.Users.AnyAsync(u => u.Email == registerRequest.Email);
    if (exists)
        return TypedResults.Conflict("Email já cadastrado.");

    // 2. Cria a entidade User a partir do DTO
    var user = new User
    {
        Email = registerRequest.Email,
        PasswordHash = PasswordHasher.Hash(registerRequest.Password), // hash aqui!
        Role = "User"
    };

    // 3. Salva no banco
    db.Users.Add(user);
    await db.SaveChangesAsync();

    // 4. Retorna apenas o que o cliente precisa saber (sem PasswordHash!)
    return TypedResults.Created($"/auth/{user.Id}", new { user.Id, user.Email, user.Role });
}


static async Task<IResult> GetOrder(SysDbContext db)
{
    return TypedResults.Ok(await db.Orders.Include(o => o.OrderItems).Include(o => o.User).ToArrayAsync());
}
static async Task<IResult> CreateOrder(List<OrderItemRequest> items, SysDbContext db, ClaimsPrincipal principal)
{
    if (items is null || items.Count == 0)
        return TypedResults.BadRequest("O pedido precisa de pelo menos um item.");

    var userId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var orderItems = new List<OrderItem>();
    decimal total = 0;

    foreach (var item in items)
    {
        if (item.Quantity <= 0)
            return TypedResults.BadRequest("Quantity precisa ser maior que zero.");

        var product = await db.Products.FindAsync(item.ProductId);
        if (product is null)
            return TypedResults.BadRequest($"Product {item.ProductId} não existe.");

        var unitPrice = product.Price;
        total += unitPrice * item.Quantity;

        orderItems.Add(new OrderItem
        {
            ProductId = product.Id,
            Quantity = item.Quantity,
            UnitPriceAtPurchase = unitPrice
        });
    }

    var order = new Order
    {
        CreatedAt = DateTime.UtcNow,
        Total = total,
        UserId = userId,
        OrderItems = orderItems
    };

    db.Orders.Add(order);
    await db.SaveChangesAsync();

    return TypedResults.Created($"/order/{order.Id}", order);
}

static async Task<IResult> GetOrderById(int id, SysDbContext db)
{
    return await db.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == id)
        is Order o
            ? TypedResults.Ok(o)
            : TypedResults.NotFound();
}

static async Task<IResult> ReplaceOrder(int id, List<OrderItemRequest> items, SysDbContext db)
{
    var order = await db.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return TypedResults.NotFound();

    if (items is null || items.Count == 0)
        return TypedResults.BadRequest("O pedido precisa de pelo menos um item.");

    var newItems = new List<OrderItem>();
    decimal total = 0;

    foreach (var item in items)
    {
        if (item.Quantity <= 0)
            return TypedResults.BadRequest("Quantity precisa ser maior que zero.");

        var product = await db.Products.FindAsync(item.ProductId);
        if (product is null)
            return TypedResults.BadRequest($"Product {item.ProductId} não existe.");

        var unitPrice = product.Price;
        total += unitPrice * item.Quantity;

        newItems.Add(new OrderItem
        {
            OrderId = order.Id,
            ProductId = product.Id,
            Quantity = item.Quantity,
            UnitPriceAtPurchase = unitPrice
        });
    }

    db.OrderItems.RemoveRange(order.OrderItems);
    order.OrderItems = newItems;
    order.Total = total;

    await db.SaveChangesAsync();

    return TypedResults.Ok(order);
}

static async Task<IResult> UpdateOrderItemQuantities(int id, List<UpdateOrderItemQuantityRequest> updates, SysDbContext db)
{
    var order = await db.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return TypedResults.NotFound();

    foreach (var update in updates)
    {
        if (update.Quantity <= 0)
            return TypedResults.BadRequest("Quantity precisa ser maior que zero.");

        var item = order.OrderItems.FirstOrDefault(i => i.Id == update.OrderItemId);
        if (item is null)
            return TypedResults.BadRequest($"OrderItem {update.OrderItemId} não pertence a este pedido.");

        item.Quantity = update.Quantity;
    }

    order.Total = order.OrderItems.Sum(i => i.UnitPriceAtPurchase * i.Quantity);

    await db.SaveChangesAsync();

    return TypedResults.Ok(order);
}

static async Task<IResult> UpdateOrderStatus(int id, UpdateOrderStatusRequest request, SysDbContext db)
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return TypedResults.NotFound();

    if (!OrderStatus.All.Contains(request.Status))
        return TypedResults.BadRequest($"Status inválido. Use um de: {string.Join(", ", OrderStatus.All)}.");

    order.Status = request.Status;
    await db.SaveChangesAsync();

    return TypedResults.Ok(order);
}

static async Task<IResult> DeleteOrder(int id, SysDbContext db)
{
    var order = await db.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return TypedResults.NotFound();

    db.OrderItems.RemoveRange(order.OrderItems);
    db.Orders.Remove(order);
    await db.SaveChangesAsync();

    return TypedResults.NoContent();
}



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

static async Task<IResult> GetAllProducts(SysDbContext db)
{
    return TypedResults.Ok(await db.Products.Include(p => p.Category).ToArrayAsync());
}

static async Task<IResult> GetProductById(int id, SysDbContext db)
{
    return await db.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == id)
        is Product p
            ? TypedResults.Ok(p)
            : TypedResults.NotFound();
}

static async Task<IResult> CreateProduct(ProductRequest request, SysDbContext db)
{
    if (string.IsNullOrWhiteSpace(request.Name))
        return TypedResults.BadRequest("Name é obrigatório.");

    if (request.Price <= 0)
        return TypedResults.BadRequest("Price precisa ser maior que zero.");

    if (request.CategoryId is int categoryId && !await db.Categories.AnyAsync(c => c.Id == categoryId))
        return TypedResults.BadRequest($"Category {categoryId} não existe.");

    var product = new Product
    {
        Name = request.Name,
        Description = request.Description,
        Price = request.Price,
        CategoryId = request.CategoryId,
        Colors = request.Colors ?? new List<string>(),
        ImageUrl = request.ImageUrl
    };

    db.Products.Add(product);
    await db.SaveChangesAsync();

    return TypedResults.Created($"/product/{product.Id}", product);
}

static async Task<IResult> UpdateProduct(int id, ProductRequest request, SysDbContext db)
{
    var product = await db.Products.FindAsync(id);

    if (product is null) return TypedResults.NotFound();

    if (string.IsNullOrWhiteSpace(request.Name))
        return TypedResults.BadRequest("Name é obrigatório.");

    if (request.Price <= 0)
        return TypedResults.BadRequest("Price precisa ser maior que zero.");

    if (request.CategoryId is int categoryId && !await db.Categories.AnyAsync(c => c.Id == categoryId))
        return TypedResults.BadRequest($"Category {categoryId} não existe.");

    product.Name = request.Name;
    product.Description = request.Description;
    product.Price = request.Price;
    product.CategoryId = request.CategoryId;
    product.Colors = request.Colors ?? new List<string>();
    product.ImageUrl = request.ImageUrl;

    await db.SaveChangesAsync();

    return TypedResults.NoContent();
}

static async Task<IResult> DeleteProduct(int id, SysDbContext db)
{
    if (await db.Products.FindAsync(id) is Product product)
    {
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return TypedResults.NoContent();
    }

    return TypedResults.NotFound();
}

static async Task<IResult> GetAllCategories(SysDbContext db)
{
    return TypedResults.Ok(await db.Categories.ToArrayAsync());
}

static async Task<IResult> CreateCategory(CategoryRequest request, SysDbContext db)
{
    if (string.IsNullOrWhiteSpace(request.Name))
        return TypedResults.BadRequest("Name é obrigatório.");

    var category = new Category { Name = request.Name };

    db.Categories.Add(category);
    await db.SaveChangesAsync();

    return TypedResults.Created($"/category/{category.Id}", category);
}

static async Task<IResult> UpdateCategory(int id, CategoryRequest request, SysDbContext db)
{
    var category = await db.Categories.FindAsync(id);

    if (category is null) return TypedResults.NotFound();

    if (string.IsNullOrWhiteSpace(request.Name))
        return TypedResults.BadRequest("Name é obrigatório.");

    category.Name = request.Name;

    await db.SaveChangesAsync();

    return TypedResults.NoContent();
}

static async Task<IResult> DeleteCategory(int id, SysDbContext db)
{
    var category = await db.Categories.FindAsync(id);
    if (category is null) return TypedResults.NotFound();

    var products = await db.Products.Where(p => p.CategoryId == id).ToListAsync();
    foreach (var product in products) product.CategoryId = null;

    db.Categories.Remove(category);
    await db.SaveChangesAsync();

    return TypedResults.NoContent();
}

app.Run();