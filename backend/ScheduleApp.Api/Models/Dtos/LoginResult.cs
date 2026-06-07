namespace ScheduleApp.Api.Models.Dtos;

public record LoginResult(LoginResponse? Response, string? Token, string? ErrorCode);
