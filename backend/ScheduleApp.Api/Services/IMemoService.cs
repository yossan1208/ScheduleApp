using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IMemoService
{
    Task<MemoCreateResult> CreateAsync(int noteId, int groupId, int userId);
    Task<List<MemoListItem>> GetByNoteIdAsync(int noteId, int groupId);
    Task<MemoDetailResult>   GetDetailAsync(int id);
    Task<MemoResult>         SaveAsync(int id, MemoRequest request, int userId);
    Task<MemoResult>         DeleteAsync(int id);
}
