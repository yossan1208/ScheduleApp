using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IUserSettingRepository
{
    Task<User?>  GetByIdAsync(int userId);
    Task<Color?> GetColorByIdAsync(int colorId);
    Task         UpdateUserAsync(User user);
    Task         UpdatePasswordAsync(int userId, string newPasswordHash);
}
