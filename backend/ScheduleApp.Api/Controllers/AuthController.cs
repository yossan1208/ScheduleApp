using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["AUTH_INVALID_CREDENTIALS"] = "IDまたはパスワードが違います",
        ["AUTH_ACCOUNT_DISABLED"]    = "アカウントが無効です",
        ["AUTH_NO_GROUP"]            = "グループに加入してください",
    };

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await authService.LoginAsync(request);

        if (result.ErrorCode is not null)
        {
            var message = ErrorMessages.TryGetValue(result.ErrorCode, out var msg)
                ? msg
                : result.ErrorCode;

            return Unauthorized(new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError(result.ErrorCode, message),
            });
        }

        Response.Cookies.Append("jwt", result.Token!, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure   = true,
        });

        return Ok(new ApiEnvelope<LoginResponse>
        {
            Success = true,
            Data    = result.Response,
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var token = Request.Cookies["jwt"];

        if (token is not null)
        {
            await authService.LogoutAsync(token);
        }

        Response.Cookies.Delete("jwt");

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
