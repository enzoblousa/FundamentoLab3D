using System.Text.Json.Serialization;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; } //fk
    [JsonIgnore]
    public Order? Order { get; set; }
    public int ProductId { get; set; } //fk
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPriceAtPurchase { get; set; }
}