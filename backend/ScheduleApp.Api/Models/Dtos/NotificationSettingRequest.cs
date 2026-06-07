namespace ScheduleApp.Api.Models.Dtos;

public class NotificationSettingRequest
{
    public bool IsEnabled                 { get; set; }
    public int? CustomNotificationMinutes { get; set; }
}
