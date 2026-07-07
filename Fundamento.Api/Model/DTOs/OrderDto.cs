public record OrderItemRequest(int ProductId, int Quantity);
public record UpdateOrderItemQuantityRequest(int OrderItemId, int Quantity);
public record UpdateOrderStatusRequest(string Status);
