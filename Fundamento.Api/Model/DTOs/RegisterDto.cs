public record RegisterRequest(string Email, string Password);

public record RegisterResponse(int Id, string Email, string Role);
