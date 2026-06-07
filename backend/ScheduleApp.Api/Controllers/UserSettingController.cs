using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UserSettingController(IUserSettingService userSettingService) : ControllerBase
{
    private static readonly Dictionary<string, (int StatusCode, string Message)> ErrorMap = new()
    {
        ["USER_NOT_FOUND"]               = (StatusCodes.Status404NotFound,   "ユーザーが見つかりません"),
        ["USER_COLOR_NOT_FOUND"]         = (StatusCodes.Status400BadRequest,  "指定されたカラーが見つかりません"),
        ["USER_PASSWORD_MISMATCH"]       = (StatusCodes.Status400BadRequest,  "現在のパスワードが正しくありません"),
        ["USER_PASSWORD_CONFIRM_MISMATCH"] = (StatusCodes.Status400BadRequest, "新しいパスワードと確認用パスワードが一致しません"),
    };

    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    private IActionResult ToErrorResponse(string errorCode)
    {
        if (ErrorMap.TryGetValue(errorCode, out var info))
            return StatusCode(info.StatusCode, new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError(errorCode, info.Message),
            });

        return StatusCode(StatusCodes.Status500InternalServerError, new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError(errorCode, errorCode),
        });
    }

    // GET /api/users/me
    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await userSettingService.GetProfileAsync(userId);
        if (result.ErrorCode is not null)
            return ToErrorResponse(result.ErrorCode);

        return Ok(new ApiEnvelope<UserProfileResponse> { Success = true, Data = result.Data });
    }

    // PUT /api/users/me
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await userSettingService.UpdateProfileAsync(userId, request);
        if (result.ErrorCode is not null)
            return ToErrorResponse(result.ErrorCode);

        return Ok(new ApiEnvelope<UserProfileResponse> { Success = true, Data = result.Data });
    }

    // PUT /api/users/me/password
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await userSettingService.ChangePasswordAsync(userId, request);
        if (result.ErrorCode is not null)
            return ToErrorResponse(result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
