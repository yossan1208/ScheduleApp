using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface INotificationService
{
    Task<List<NotificationSettingResponse>> GetSettingsAsync(int userId);
    Task<NotificationSettingResult>         UpdateSettingAsync(int userId, int genreId, NotificationSettingRequest request);
}
