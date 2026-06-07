using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface INotificationRepository
{
    Task<List<(UserNotificationSetting Setting, Genre Genre)>> GetByUserIdAsync(int userId);
    Task<UserNotificationSetting?> GetByUserAndGenreAsync(int userId, int genreId);
    Task UpdateAsync(UserNotificationSetting setting);
}
