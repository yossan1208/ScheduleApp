using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(IAdminService adminService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["ADMIN_LOGIN_ID_CONFLICT"]   = "このログインIDはすでに使用されています",
        ["ADMIN_USER_NOT_FOUND"]      = "ユーザーが見つかりません",
        ["ADMIN_GROUP_USER_REQUIRED"] = "グループには1人以上のユーザーが必要です",
        ["ADMIN_FORBIDDEN"]           = "この操作を行う権限がありません",
    };

    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    private IActionResult Forbidden403() => StatusCode(StatusCodes.Status403Forbidden,
        new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError("ADMIN_FORBIDDEN", ErrorMessages["ADMIN_FORBIDDEN"]),
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

    // GET /api/admin/users?ungrouped=true
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] bool ungrouped = false)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.GetUsersAsync(ungrouped);
        return Ok(new ApiEnvelope<List<AdminUserResponse>> { Success = true, Data = result });
    }

    // POST /api/admin/users
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminUserRequest request)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.CreateUserAsync(request);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status409Conflict, result.ErrorCode);

        return Ok(new ApiEnvelope<AdminUserResponse> { Success = true, Data = result.Data });
    }

    // PATCH /api/admin/users/{id}/deactivate
    [HttpPatch("users/{id:int}/deactivate")]
    public async Task<IActionResult> DeactivateUser(int id)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.DeactivateUserAsync(id);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }

    // POST /api/admin/groups
    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] AdminGroupRequest request)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.CreateGroupAsync(request);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status400BadRequest, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
