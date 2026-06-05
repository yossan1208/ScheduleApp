namespace ScheduleApp.Api.Models.Entities;

public class Genre
{
    public int    Id                           { get; set; }
    public string Name                         { get; set; } = string.Empty;
    public int    ColorId                      { get; set; }
    public int?   DefaultNotificationMinutes   { get; set; }
    public int    GroupId                      { get; set; }
}
