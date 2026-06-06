namespace ScheduleApp.Api.Models.Entities;

public class Session
{
    public int      Id           { get; set; }
    public int      UserId       { get; set; }
    public string   Token        { get; set; } = string.Empty;
    public DateTime ExpiresAt    { get; set; }
    public DateTime LastActiveAt { get; set; }
}
