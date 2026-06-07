using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class NoteService(INoteRepository repo) : INoteService
{
    public async Task<List<NoteResponse>> GetNotesAsync(int groupId, bool archived)
    {
        var notes = await repo.GetByGroupIdAsync(groupId, archived);
        return notes
            .Where(n => !n.IsDeleted)
            .Select(MapToResponse)
            .ToList();
    }

    public async Task<NoteResult> CreateAsync(NoteRequest request, int groupId, int userId)
    {
        var note = new Note
        {
            Name      = request.Name,
            Color     = request.Color,
            GroupId   = groupId,
            CreatorId = userId,
            CreatedAt = DateTime.UtcNow,
            IsSystem  = false,
        };

        var created = await repo.CreateAsync(note);
        return new NoteResult(MapToResponse(created), null);
    }

    public async Task<NoteResult> UpdateAsync(int id, NoteRequest request, int groupId, int userId)
    {
        var note = await repo.GetByIdAsync(id, groupId);
        if (note is null)
            return new NoteResult(null, "NOTE_NOT_FOUND");

        note.Name      = request.Name;
        note.Color     = request.Color;
        note.UpdatedBy = userId;
        note.UpdatedAt = DateTime.UtcNow;

        await repo.UpdateAsync(note);
        return new NoteResult(MapToResponse(note), null);
    }

    public async Task<NoteResult> ArchiveAsync(int id, int groupId)
    {
        var note = await repo.GetByIdAsync(id, groupId);
        if (note is null)
            return new NoteResult(null, "NOTE_NOT_FOUND");

        if (note.IsSystem)
            return new NoteResult(null, "NOTE_FORBIDDEN");

        await repo.ArchiveAsync(id);
        return new NoteResult(null, null);
    }

    public async Task<NoteResult> DeleteAsync(int id, int groupId)
    {
        var note = await repo.GetByIdAsync(id, groupId);
        if (note is null)
            return new NoteResult(null, "NOTE_NOT_FOUND");

        if (note.IsSystem)
            return new NoteResult(null, "NOTE_FORBIDDEN");

        if (!note.IsArchived)
            return new NoteResult(null, "NOTE_NOT_ARCHIVED");

        await repo.SoftDeleteAsync(id);
        return new NoteResult(null, null);
    }

    private static NoteResponse MapToResponse(Note n) => new()
    {
        Id         = n.Id,
        Name       = n.Name,
        Color      = n.Color,
        GroupId    = n.GroupId,
        CreatorId  = n.CreatorId,
        CreatedAt  = n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
        IsArchived = n.IsArchived,
        IsSystem   = n.IsSystem,
        UpdatedBy  = n.UpdatedBy,
        UpdatedAt  = n.UpdatedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
    };
}
