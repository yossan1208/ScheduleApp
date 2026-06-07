using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class NoteRepository(AppDbContext db) : INoteRepository
{
    public Task<List<Note>> GetByGroupIdAsync(int groupId, bool archived)
        => db.Notes
             .Where(n => n.GroupId == groupId && n.IsArchived == archived)
             .OrderBy(n => n.Id)
             .ToListAsync();

    public Task<Note?> GetByIdAsync(int id, int groupId)
        => db.Notes
             .FirstOrDefaultAsync(n => n.Id == id && n.GroupId == groupId && !n.IsDeleted);

    public async Task<Note> CreateAsync(Note note)
    {
        db.Notes.Add(note);
        await db.SaveChangesAsync();
        return note;
    }

    public async Task UpdateAsync(Note note)
    {
        db.Notes.Update(note);
        await db.SaveChangesAsync();
    }

    public Task ArchiveAsync(int id)
        => db.Notes
             .Where(n => n.Id == id)
             .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsArchived, true));

    public Task SoftDeleteAsync(int id)
        => db.Notes
             .Where(n => n.Id == id)
             .ExecuteUpdateAsync(s => s
                 .SetProperty(n => n.IsDeleted, true)
                 .SetProperty(n => n.DeletedAt, DateTime.UtcNow));
}
