using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/schedules")]
public class ScheduleController(IScheduleService scheduleService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["SCHEDULE_NOT_FOUND"] = "スケジュールが見つかりません",
        ["SCHEDULE_FORBIDDEN"] = "この操作を行う権限がありません",
        ["SCHEDULE_INVALID"]   = "入力内容が正しくありません",
    };

    private IActionResult ToErrorResponse(int statusCode, string errorCode)
    {
        var message = ErrorMessages.TryGetValue(errorCode, out var msg) ? msg : errorCode;
        return StatusCode(statusCode, new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError(errorCode, message),
        });
    }

    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    // GET /api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD
    [HttpGet]
    public async Task<IActionResult> GetSchedules([FromQuery] string? from, [FromQuery] string? to)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        if (!DateOnly.TryParse(from, out var fromDate) || !DateOnly.TryParse(to, out var toDate))
            return BadRequest(new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError("SCHEDULE_INVALID", "from/to は YYYY-MM-DD 形式で指定してください"),
            });

        var results = await scheduleService.GetSchedulesAsync(userId, groupId, fromDate, toDate);
        return Ok(new ApiEnvelope<List<ScheduleResponse>> { Success = true, Data = results });
    }

    // GET /api/schedules/recent  ← must be defined before /{id:int} — but :int constraint handles disambiguation anyway
    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent()
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var results = await scheduleService.GetRecentAsync(userId);
        return Ok(new ApiEnvelope<List<ScheduleResponse>> { Success = true, Data = results });
    }

    // GET /api/schedules/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var result = await scheduleService.GetByIdAsync(id, userId, groupId);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<ScheduleResponse> { Success = true, Data = result.Data });
    }

    // POST /api/schedules
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ScheduleRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        if (string.IsNullOrWhiteSpace(request.Date)
            || string.IsNullOrWhiteSpace(request.Title)
            || string.IsNullOrWhiteSpace(request.Visibility)
            || request.GenreId == 0
            || string.IsNullOrWhiteSpace(request.NotificationTime))
        {
            return BadRequest(new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError("SCHEDULE_INVALID", "必須項目が不足しています"),
            });
        }

        var result = await scheduleService.CreateAsync(request, userId, groupId);

        if (result.ErrorCode is not null)
            return BadRequest(new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError(result.ErrorCode,
                    ErrorMessages.TryGetValue(result.ErrorCode, out var m) ? m : result.ErrorCode),
            });

        return Ok(new ApiEnvelope<ScheduleResponse> { Success = true, Data = result.Data });
    }

    // PUT /api/schedules/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ScheduleRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await scheduleService.UpdateAsync(id, request, userId);

        if (result.ErrorCode == "SCHEDULE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        if (result.ErrorCode == "SCHEDULE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status400BadRequest, result.ErrorCode);

        return Ok(new ApiEnvelope<ScheduleResponse> { Success = true, Data = result.Data });
    }

    // DELETE /api/schedules/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await scheduleService.DeleteAsync(id, userId);

        if (result.ErrorCode == "SCHEDULE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        if (result.ErrorCode == "SCHEDULE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
