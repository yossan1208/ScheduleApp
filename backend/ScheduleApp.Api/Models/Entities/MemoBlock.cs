namespace ScheduleApp.Api.Models.Entities;

public class MemoBlock
{
    public int     Id        { get; set; }
    public int     MemoId    { get; set; }
    public string? Type      { get; set; }
    public string? Content   { get; set; }
    public int?    SortOrder { get; set; }
}
