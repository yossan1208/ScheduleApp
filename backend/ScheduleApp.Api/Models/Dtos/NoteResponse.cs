namespace ScheduleApp.Api.Models.Dtos;

public class NoteResponse
{
    public int       Id         { get; set; }
    public string    Name       { get; set; } = string.Empty;
    public string    Color      { get; set; } = string.Empty;
    public int       GroupId    { get; set; }
    public int       CreatorId  { get; set; }
    public string    CreatedAt  { get; set; } = string.Empty;
    public bool      IsArchived { get; set; }
    public bool      IsSystem   { get; set; }
    public int?      UpdatedBy  { get; set; }
    public string?   UpdatedAt  { get; set; }
}
