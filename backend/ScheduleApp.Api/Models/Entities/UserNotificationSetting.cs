namespace ScheduleApp.Api.Models.Entities;

public class UserNotificationSetting
{
    public int  Id                        { get; set; }
    public int  UserId                    { get; set; }
    public int  GenreId                   { get; set; }
    public bool IsEnabled                 { get; set; } = true;
    public int? CustomNotificationMinutes { get; set; }
}
