namespace ScheduleApp.Api.Models.Dtos;

public class GenreResponse
{
    public int     Id                      { get; set; }
    public string  Name                    { get; set; } = string.Empty;
    public int     ColorId                 { get; set; }
    public string  ColorHex                { get; set; } = string.Empty;
    public string? DefaultNotificationTime { get; set; }
    public bool    IsActive                { get; set; }
    public bool    IsDeleted               { get; set; }
}
