namespace ScheduleApp.Api.Models.Entities;

public class Memo
{
    public int       Id          { get; set; }
    public int       NoteId      { get; set; }
    public string?   Title       { get; set; }
    public int?      CreatorId   { get; set; }
    public bool      IsImportant { get; set; } = false;
    public int?      UpdatedBy   { get; set; }
    public DateTime? UpdatedAt   { get; set; }
}
