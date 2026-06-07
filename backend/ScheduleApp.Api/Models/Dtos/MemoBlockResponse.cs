namespace ScheduleApp.Api.Models.Dtos;

public class MemoBlockResponse
{
    public int     Id        { get; set; }
    public string  Type      { get; set; } = string.Empty;
    public string? Content   { get; set; }
    public int     SortOrder { get; set; }
}
