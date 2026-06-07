namespace ScheduleApp.Api.Models.Entities;

public class Schedule
{
    public int       Id               { get; set; }
    public int       CreatorId        { get; set; }
    public int       GroupId          { get; set; }
    public int       GenreId          { get; set; }
    public DateOnly  Date             { get; set; }
    public TimeOnly? StartTime        { get; set; }
    public TimeOnly? EndTime          { get; set; }
    public string    Title            { get; set; } = string.Empty;
    public string?   Detail           { get; set; }
    public string    Visibility       { get; set; } = string.Empty;
    public TimeOnly  NotificationTime { get; set; }
    public bool      IsDeleted        { get; set; }
    public DateTime? DeletedAt        { get; set; }
    public DateTime  CreatedAt        { get; set; }

    public Genre?    Genre            { get; set; }
}
