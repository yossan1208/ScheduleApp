namespace ScheduleApp.Api.Models.Dtos;

public class ScheduleRequest
{
    public string  Date             { get; set; } = string.Empty;
    public string  Title            { get; set; } = string.Empty;
    public string  Visibility       { get; set; } = string.Empty;
    public int     GenreId          { get; set; }
    public string? StartTime        { get; set; }
    public string? EndTime          { get; set; }
    public string  NotificationTime { get; set; } = string.Empty;
    public string? Detail           { get; set; }
}
