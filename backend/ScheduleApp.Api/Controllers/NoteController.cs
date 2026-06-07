using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
public class NoteController(INoteService noteService, IMemoService memoService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["NOTE_NOT_FOUND"]    = "ノートが見つかりません",
        ["NOTE_FORBIDDEN"]    = "この操作は許可されていません",
        ["NOTE_NOT_ARCHIVED"] = "アーカイブ済みのノートのみ削除できます",
        ["MEMO_NOT_FOUND"]    = "メモが見つかりません",
        ["MEMO_FORBIDDEN"]    = "この操作は許可されていません",
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

    // GET /api/notes
    [HttpGet("api/notes")]
    public async Task<IActionResult> GetNotes([FromQuery] bool archived = false)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var results = await noteService.GetNotesAsync(groupId, archived);
        return Ok(new ApiEnvelope<List<NoteResponse>> { Success = true, Data = results });
    }

    // POST /api/notes
    [HttpPost("api/notes")]
    public async Task<IActionResult> Create([FromBody] NoteRequest request)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await noteService.CreateAsync(request, groupId, userId);
        return Ok(new ApiEnvelope<NoteResponse> { Success = true, Data = result.Data });
    }

    // PUT /api/notes/{id}
    [HttpPut("api/notes/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] NoteRequest request)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await noteService.UpdateAsync(id, request, groupId, userId);
        if (result.ErrorCode == "NOTE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<NoteResponse> { Success = true, Data = result.Data });
    }

    // PATCH /api/notes/{id}/archive
    [HttpPatch("api/notes/{id:int}/archive")]
    public async Task<IActionResult> Archive(int id)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var result = await noteService.ArchiveAsync(id, groupId);
        if (result.ErrorCode == "NOTE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);
        if (result.ErrorCode == "NOTE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }

    // DELETE /api/notes/{id}
    [HttpDelete("api/notes/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var result = await noteService.DeleteAsync(id, groupId);
        if (result.ErrorCode == "NOTE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);
        if (result.ErrorCode == "NOTE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);
        if (result.ErrorCode == "NOTE_NOT_ARCHIVED")
            return ToErrorResponse(StatusCodes.Status409Conflict, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }

    // GET /api/notes/{noteId}/memos
    [HttpGet("api/notes/{noteId:int}/memos")]
    public async Task<IActionResult> GetMemos(int noteId)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var results = await memoService.GetByNoteIdAsync(noteId, groupId);
        return Ok(new ApiEnvelope<List<MemoListItem>> { Success = true, Data = results });
    }

    // POST /api/notes/{noteId}/memos
    [HttpPost("api/notes/{noteId:int}/memos")]
    public async Task<IActionResult> CreateMemo(int noteId)
    {
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await memoService.CreateAsync(noteId, groupId, userId);
        if (result.ErrorCode == "NOTE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);
        if (result.ErrorCode == "NOTE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        return Ok(new ApiEnvelope<MemoListItem> { Success = true, Data = result.Data });
    }

    // GET /api/memos/{id}
    [HttpGet("api/memos/{id:int}")]
    public async Task<IActionResult> GetMemoDetail(int id)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();

        var result = await memoService.GetDetailAsync(id);
        if (result.ErrorCode == "MEMO_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<MemoDetail> { Success = true, Data = result.Data });
    }

    // PUT /api/memos/{id}
    [HttpPut("api/memos/{id:int}")]
    public async Task<IActionResult> SaveMemo(int id, [FromBody] MemoRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await memoService.SaveAsync(id, request, userId);
        if (result.ErrorCode == "MEMO_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }

    // DELETE /api/memos/{id}
    [HttpDelete("api/memos/{id:int}")]
    public async Task<IActionResult> DeleteMemo(int id)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();

        var result = await memoService.DeleteAsync(id);
        if (result.ErrorCode == "MEMO_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);
        if (result.ErrorCode == "MEMO_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
