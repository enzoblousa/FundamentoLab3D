using Microsoft.EntityFrameworkCore;

class SysDbContext : DbContext
{
    public SysDbContext(DbContextOptions<SysDbContext> options)
        : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders =>Set<Order>();
    public DbSet<OrderItem> OrderItems =>Set<OrderItem>();
    public DbSet<Category> Categories => Set<Category>();
}