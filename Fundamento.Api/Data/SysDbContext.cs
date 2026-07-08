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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Um produto referenciado em algum pedido não pode ser excluído silenciosamente:
        // isso corromperia o histórico e o total de pedidos antigos (ver Docs/orders-cart/spec.md).
        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.Product)
            .WithMany()
            .HasForeignKey(oi => oi.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}