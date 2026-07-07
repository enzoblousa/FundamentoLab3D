public record ProductRequest(string Name, string? Description, decimal Price, int? CategoryId, List<string>? Colors, string? ImageUrl);
