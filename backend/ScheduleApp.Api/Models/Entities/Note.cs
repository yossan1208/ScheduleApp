namespace ScheduleApp.Api.Models.Entities;

public class Note
{
    public int       Id         { get; set; }
    public string    Name       { get; set; } = string.Empty;
    public string    Color      { get; set; } = string.Empty;
    public int       GroupId    { get; set; }
    public int       CreatorId  { get; set; }
    public DateTime  CreatedAt  { get; set; }
    public bool      IsArchived { get; set; } = false;
    public bool      IsSystem   { get; set; } = false;
    public int?      UpdatedBy  { get; set; }
    public DateTime? UpdatedAt  { get; set; }
    public bool      IsDeleted  { get; set; } = false;
    public DateTime? DeletedAt  { get; set; }
}
