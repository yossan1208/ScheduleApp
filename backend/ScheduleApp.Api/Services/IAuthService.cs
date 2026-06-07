using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IAuthService
{
    Task<LoginResult> LoginAsync(LoginRequest request);
    Task LogoutAsync(string token);
}
