using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/genres")]
public class GenreController(IGenreService genreService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["GENRE_NOT_FOUND"]      = "ジャンルが見つかりません",
        ["GENRE_COLOR_CONFLICT"] = "この色はすでに使用されています",
        ["GENRE_FORBIDDEN"]      = "この操作を行う権限がありません",
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
            Error   = new ApiError("GENRE_FORBIDDEN", ErrorMessages["GENRE_FORBIDDEN"]),
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

    private bool IsAdminOrLeader(out short role)
    {
        if (HttpContext.Items["Role"] is short r)
        {
            role = r;
            return r <= 1;
        }
        role = 2;
        return false;
    }

    // GET /api/genres
    [HttpGet]
    public async Task<IActionResult> GetGenres()
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var results = await genreService.GetGenresAsync(groupId);
        return Ok(new ApiEnvelope<List<GenreResponse>> { Success = true, Data = results });
    }

    // POST /api/genres
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GenreRequest request)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (!IsAdminOrLeader(out _))
            return Forbidden403();

        var result = await genreService.CreateAsync(request, groupId);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status409Conflict, result.ErrorCode);

        return Ok(new ApiEnvelope<GenreResponse> { Success = true, Data = result.Data });
    }

    // PUT /api/genres/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] GenreRequest request)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (!IsAdminOrLeader(out _))
            return Forbidden403();

        var result = await genreService.UpdateAsync(id, request, groupId);
        if (result.ErrorCode == "GENRE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status409Conflict, result.ErrorCode);

        return Ok(new ApiEnvelope<GenreResponse> { Success = true, Data = result.Data });
    }

    // PATCH /api/genres/{id}/disable
    [HttpPatch("{id:int}/disable")]
    public async Task<IActionResult> Disable(int id)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (!IsAdminOrLeader(out _))
            return Forbidden403();

        var result = await genreService.DisableAsync(id, groupId);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }

    // DELETE /api/genres/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (!IsAdminOrLeader(out _))
            return Forbidden403();

        var result = await genreService.DeleteAsync(id, groupId);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
