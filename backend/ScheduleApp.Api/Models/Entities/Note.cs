namespace ScheduleApp.Api.Models.Entities;

public class Note
{
    public int       Id         { get; set; }
    public string?   Name       { get; set; }
    public string?   Color      { get; set; }
    public int?      GroupId    { get; set; }
    public int       CreatorId  { get; set; }
    public DateTime? CreatedAt  { get; set; }
    public bool      IsArchived { get; set; } = false;
    public int?      UpdatedBy  { get; set; }
    public DateTime? UpdatedAt  { get; set; }
}
