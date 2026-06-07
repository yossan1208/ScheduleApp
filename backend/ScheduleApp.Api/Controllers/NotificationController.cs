using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationController(INotificationService notificationService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["NOTIFICATION_NOT_FOUND"] = "通知設定が見つかりません",
    };

    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    private IActionResult ToErrorResponse(int statusCode, string errorCode)
    {
        var message = ErrorMessages.TryGetValue(errorCode, out var msg) ? msg : errorCode;
        return StatusCode(statusCode, new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError(errorCode, message),
        });
    }

    // GET /api/notifications/settings
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var results = await notificationService.GetSettingsAsync(userId);
        return Ok(new ApiEnvelope<List<NotificationSettingResponse>> { Success = true, Data = results });
    }

    // PUT /api/notifications/settings/{genreId}
    [HttpPut("settings/{genreId:int}")]
    public async Task<IActionResult> UpdateSetting(int genreId, [FromBody] NotificationSettingRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await notificationService.UpdateSettingAsync(userId, genreId, request);
        if (result.ErrorCode == "NOTIFICATION_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
