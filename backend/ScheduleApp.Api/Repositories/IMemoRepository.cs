using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IMemoRepository
{
    Task<List<Memo>>              GetByNoteIdAsync(int noteId);
    Task<(Memo, List<MemoBlock>)?>  GetByIdWithBlocksAsync(int id);
    Task<Memo>                    CreateAsync(Memo memo);
    Task                          SaveBlocksAsync(int memoId, int updatedBy, List<MemoBlock> blocks);
    Task                          DeleteAsync(int id);
}
