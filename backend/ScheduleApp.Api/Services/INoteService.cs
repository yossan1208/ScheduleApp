using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface INoteService
{
    Task<List<NoteResponse>> GetNotesAsync(int groupId, bool archived);
    Task<NoteResult>         CreateAsync(NoteRequest request, int groupId, int userId);
    Task<NoteResult>         UpdateAsync(int id, NoteRequest request, int groupId, int userId);
    Task<NoteResult>         ArchiveAsync(int id, int groupId);
    Task<NoteResult>         DeleteAsync(int id, int groupId);
}
