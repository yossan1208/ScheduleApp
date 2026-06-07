namespace ScheduleApp.Api.Models.Dtos;

public class GenreRequest
{
    public string  Name                    { get; set; } = string.Empty;
    public int     ColorId                 { get; set; }
    public string? DefaultNotificationTime { get; set; }
}
