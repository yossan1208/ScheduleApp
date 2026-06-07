namespace ScheduleApp.Api.Models.Dtos;

public class ScheduleResponse
{
    public int               Id               { get; set; }
    public int               CreatorId        { get; set; }
    public string            Date             { get; set; } = string.Empty;
    public string?           StartTime        { get; set; }
    public string?           EndTime          { get; set; }
    public string            Title            { get; set; } = string.Empty;
    public string?           Detail           { get; set; }
    public string            Visibility       { get; set; } = string.Empty;
    public string            NotificationTime { get; set; } = string.Empty;
    public ScheduleGenreDto? Genre            { get; set; }
}
