using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface INoteRepository
{
    Task<List<Note>> GetByGroupIdAsync(int groupId, bool archived);
    Task<Note?>      GetByIdAsync(int id, int groupId);
    Task<Note>       CreateAsync(Note note);
    Task             UpdateAsync(Note note);
    Task             ArchiveAsync(int id);
    Task             SoftDeleteAsync(int id);
}
