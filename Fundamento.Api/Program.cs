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
app.UseAuthentication();
app.UseAuthorization();

var productItems = app.MapGroup("/product");
var authItems = app.MapGroup("/auth");
var orderItems = app.MapGroup("/order");

orderItems.MapGet("/", GetOrder);
orderItems.MapGet("/{id}", GetOrderById);
orderItems.MapPost("/", CreateOrder);
orderItems.MapPut("/{id}", ReplaceOrder).RequireAuthorization("AdminOnly");
orderItems.MapPatch("/{id}", UpdateOrderItemQuantities).RequireAuthorization("AdminOnly");
orderItems.MapDelete("/{id}", DeleteOrder).RequireAuthorization("AdminOnly");
authItems.MapPost("/login", Login);
authItems.MapPost("/register", Register);
productItems.MapGet("/", GetAllProducts);
productItems.MapGet("/{id}", GetProductById);
productItems.MapPost("/", CreateProduct).RequireAuthorization("AdminOnly");
productItems.MapPut("/{id}", UpdateProduct).RequireAuthorization("AdminOnly");
productItems.MapDelete("/{id}", DeleteProduct).RequireAuthorization("AdminOnly");


static async Task<IResult> GetOrder(SysDbContext db)
{
    return TypedResults.Ok(await db.Orders.ToArrayAsync());
}
static async Task<IResult> CreateOrder(List<OrderItemRequest> items, SysDbContext db)
{
    if (items is null || items.Count == 0)
        return TypedResults.BadRequest("O pedido precisa de pelo menos um item.");

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
        OrderItems = orderItems
    };

    db.Orders.Add(order);
    await db.SaveChangesAsync();

    return TypedResults.Created($"/order/{order.Id}", order);
}

static async Task<IResult> GetOrderById(int id, SysDbContext db)
{
    return await db.Orders.FindAsync(id)
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
    return TypedResults.Ok(await db.Products.ToArrayAsync());
}

static async Task<IResult> GetProductById(int id, SysDbContext db)
{
    return await db.Products.FindAsync(id)
        is Product p
            ? TypedResults.Ok(p)
            : TypedResults.NotFound();
}

static async Task<IResult> CreateProduct(Product product, SysDbContext db)
{
    db.Products.Add(product);
    await db.SaveChangesAsync();

    return TypedResults.Created($"/product/{product.Id}", product);
}

static async Task<IResult> UpdateProduct(int id, Product inputProduct, SysDbContext db)
{
    var product = await db.Products.FindAsync(id);

    if (product is null) return TypedResults.NotFound();

    product.Name = inputProduct.Name;
    product.Description = inputProduct.Description;

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

app.Run();