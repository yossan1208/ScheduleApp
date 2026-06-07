using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class MemoService(INoteRepository noteRepo, IMemoRepository memoRepo) : IMemoService
{
    public async Task<MemoCreateResult> CreateAsync(int noteId, int groupId, int userId)
    {
        var note = await noteRepo.GetByIdAsync(noteId, groupId);
        if (note is null)
            return new MemoCreateResult(null, "NOTE_NOT_FOUND");

        if (note.IsSystem)
            return new MemoCreateResult(null, "NOTE_FORBIDDEN");

        var memo = new Memo
        {
            NoteId    = noteId,
            CreatorId = userId,
        };

        var created = await memoRepo.CreateAsync(memo);
        return new MemoCreateResult(new MemoListItem { Id = created.Id, IsImportant = false }, null);
    }

    public async Task<List<MemoListItem>> GetByNoteIdAsync(int noteId, int groupId)
    {
        var memos = await memoRepo.GetByNoteIdAsync(noteId);
        return memos
            .OrderByDescending(m => m.IsImportant)
            .ThenByDescending(m => m.UpdatedAt ?? DateTime.MinValue)
            .Select(m => new MemoListItem
            {
                Id          = m.Id,
                Title       = m.Title,
                IsImportant = m.IsImportant,
                UpdatedAt   = m.UpdatedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
            })
            .ToList();
    }

    public async Task<MemoDetailResult> GetDetailAsync(int id)
    {
        var found = await memoRepo.GetByIdWithBlocksAsync(id);
        if (found is null)
            return new MemoDetailResult(null, "MEMO_NOT_FOUND");

        var (memo, blocks) = found.Value;
        return new MemoDetailResult(MapToDetail(memo, blocks), null);
    }

    public async Task<MemoResult> SaveAsync(int id, MemoRequest request, int userId)
    {
        var found = await memoRepo.GetByIdWithBlocksAsync(id);
        if (found is null)
            return new MemoResult("MEMO_NOT_FOUND");

        var newBlocks = request.Blocks.Select(b => new MemoBlock
        {
            MemoId    = id,
            Type      = b.Type,
            Content   = b.Content,
            SortOrder = b.SortOrder,
        }).ToList();

        await memoRepo.SaveBlocksAsync(id, userId, newBlocks);
        return new MemoResult(null);
    }

    public async Task<MemoResult> DeleteAsync(int id)
    {
        var found = await memoRepo.GetByIdWithBlocksAsync(id);
        if (found is null)
            return new MemoResult("MEMO_NOT_FOUND");

        var (memo, _) = found.Value;
        if (memo.IsImportant)
            return new MemoResult("MEMO_FORBIDDEN");

        await memoRepo.DeleteAsync(id);
        return new MemoResult(null);
    }

    private static MemoDetail MapToDetail(Memo m, List<MemoBlock> blocks) => new()
    {
        Id          = m.Id,
        Title       = m.Title,
        IsImportant = m.IsImportant,
        UpdatedBy   = m.UpdatedBy,
        UpdatedAt   = m.UpdatedAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
        Blocks      = blocks
            .OrderBy(b => b.SortOrder)
            .Select(b => new MemoBlockResponse
            {
                Id        = b.Id,
                Type      = b.Type,
                Content   = b.Content,
                SortOrder = b.SortOrder,
            })
            .ToList(),
    };
}
