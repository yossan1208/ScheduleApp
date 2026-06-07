using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class NotificationService(INotificationRepository repo) : INotificationService
{
    public async Task<List<NotificationSettingResponse>> GetSettingsAsync(int userId)
    {
        var pairs = await repo.GetByUserIdAsync(userId);
        return pairs.Select(p => MapToResponse(p.Setting, p.Genre)).ToList();
    }

    public async Task<NotificationSettingResult> UpdateSettingAsync(int userId, int genreId, NotificationSettingRequest request)
    {
        var setting = await repo.GetByUserAndGenreAsync(userId, genreId);
        if (setting is null)
            return new NotificationSettingResult("NOTIFICATION_NOT_FOUND");

        setting.IsEnabled                 = request.IsEnabled;
        setting.CustomNotificationMinutes = request.CustomNotificationMinutes;

        await repo.UpdateAsync(setting);
        return new NotificationSettingResult(null);
    }

    private static NotificationSettingResponse MapToResponse(UserNotificationSetting s, Genre g) => new()
    {
        GenreId                   = g.Id,
        GenreName                 = g.Name,
        ColorHex                  = g.Color?.HexCode ?? string.Empty,
        IsEnabled                 = s.IsEnabled,
        CustomNotificationMinutes = s.CustomNotificationMinutes,
    };
}
