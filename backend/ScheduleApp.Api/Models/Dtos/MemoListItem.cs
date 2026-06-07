namespace ScheduleApp.Api.Models.Dtos;

public class MemoListItem
{
    public int     Id          { get; set; }
    public string? Title       { get; set; }
    public bool    IsImportant { get; set; }
    public string? UpdatedAt   { get; set; }
}
