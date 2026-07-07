public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Preparing = "Preparing";
    public const string Shipped = "Shipped";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All = [Pending, Preparing, Shipped, Delivered, Cancelled];
}

public class Order
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = OrderStatus.Pending;
    public int? UserId { get; set; }
    public User? User { get; set; }
    public List<OrderItem> OrderItems { get; set; } = new();
}