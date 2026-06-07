using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IUserSettingService
{
    Task<UserProfileResult> GetProfileAsync(int userId);
    Task<UserProfileResult> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<UserResult>        ChangePasswordAsync(int userId, ChangePasswordRequest request);
}
