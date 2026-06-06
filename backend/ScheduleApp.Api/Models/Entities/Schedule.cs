namespace ScheduleApp.Api.Models.Entities;

public class Schedule
{
    public int       Id                   { get; set; }
    public int       CreatorId            { get; set; }
    public int       GroupId              { get; set; }
    public int?      GenreId              { get; set; }
    public DateOnly  Date                 { get; set; }
    public TimeOnly? StartTime            { get; set; }
    public TimeOnly? EndTime              { get; set; }
    public string    Title                { get; set; } = string.Empty;
    public string?   Detail              { get; set; }
    public string    Visibility           { get; set; } = "private";
    public int?      NotificationMinutes  { get; set; }
    public bool      IsDeleted            { get; set; } = false;
    public DateTime? DeletedAt            { get; set; }
}
