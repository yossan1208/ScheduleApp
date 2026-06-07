namespace ScheduleApp.Api.Models.Dtos;

public record UserProfileResult(UserProfileResponse? Data, string? ErrorCode);

public record UserResult(string? ErrorCode);
