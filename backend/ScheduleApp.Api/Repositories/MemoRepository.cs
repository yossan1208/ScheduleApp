using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class MemoRepository(AppDbContext db) : IMemoRepository
{
    public Task<List<Memo>> GetByNoteIdAsync(int noteId)
        => db.Memos
             .Where(m => m.NoteId == noteId)
             .ToListAsync();

    public async Task<(Memo, List<MemoBlock>)?> GetByIdWithBlocksAsync(int id)
    {
        var memo = await db.Memos.FirstOrDefaultAsync(m => m.Id == id);
        if (memo is null) return null;

        var blocks = await db.MemoBlocks
            .Where(b => b.MemoId == id)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        return (memo, blocks);
    }

    public async Task<Memo> CreateAsync(Memo memo)
    {
        db.Memos.Add(memo);
        await db.SaveChangesAsync();
        return memo;
    }

    public async Task SaveBlocksAsync(int memoId, int updatedBy, List<MemoBlock> blocks)
    {
        await db.MemoBlocks.Where(b => b.MemoId == memoId).ExecuteDeleteAsync();
        db.MemoBlocks.AddRange(blocks);

        var title = blocks
            .OrderBy(b => b.SortOrder)
            .Select(b => b.Content)
            .FirstOrDefault(c => !string.IsNullOrWhiteSpace(c));

        await db.Memos
            .Where(m => m.Id == memoId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(m => m.Title,     title != null ? title[..Math.Min(30, title.Length)] : null)
                .SetProperty(m => m.UpdatedBy, updatedBy)
                .SetProperty(m => m.UpdatedAt, DateTime.UtcNow));

        await db.SaveChangesAsync();
    }

    public Task DeleteAsync(int id)
        => db.Memos.Where(m => m.Id == id).ExecuteDeleteAsync();
}
