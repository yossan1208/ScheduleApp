namespace ScheduleApp.Api.Models.Dtos;

public class MemoDetail
{
    public int                    Id          { get; set; }
    public string?                Title       { get; set; }
    public bool                   IsImportant { get; set; }
    public int?                   UpdatedBy   { get; set; }
    public string?                UpdatedAt   { get; set; }
    public List<MemoBlockResponse> Blocks     { get; set; } = [];
}
