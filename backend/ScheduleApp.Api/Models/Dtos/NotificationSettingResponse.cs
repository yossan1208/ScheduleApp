namespace ScheduleApp.Api.Models.Dtos;

public class NotificationSettingResponse
{
    public int     GenreId                   { get; set; }
    public string  GenreName                 { get; set; } = string.Empty;
    public string  ColorHex                  { get; set; } = string.Empty;
    public bool    IsEnabled                 { get; set; }
    public int?    CustomNotificationMinutes { get; set; }
}
