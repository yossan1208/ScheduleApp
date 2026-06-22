using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class UserSettingService(IUserSettingRepository repo) : IUserSettingService
{
    public async Task<UserProfileResult> GetProfileAsync(int userId)
    {
        var user = await repo.GetByIdAsync(userId);
        if (user is null)
            return new UserProfileResult(null, "USER_NOT_FOUND");

        var personalColor = await repo.GetColorByIdAsync(user.PersonalColorId);

        return new UserProfileResult(MapToResponse(user, personalColor), null);
    }

    public async Task<UserProfileResult> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await repo.GetByIdAsync(userId);
        if (user is null)
            return new UserProfileResult(null, "USER_NOT_FOUND");

        var personalColor = await repo.GetColorByIdAsync(request.PersonalColorId);
        if (personalColor is null)
            return new UserProfileResult(null, "USER_COLOR_NOT_FOUND");

        if (user.GroupId.HasValue && await repo.IsColorUsedByGenreAsync(request.PersonalColorId, user.GroupId.Value))
            return new UserProfileResult(null, "USER_COLOR_CONFLICT");

        var themeColor = await repo.GetColorByIdAsync(request.ThemeColorId);
        if (themeColor is null)
            return new UserProfileResult(null, "USER_COLOR_NOT_FOUND");

        user.Name            = request.Name;
        user.PersonalColorId = request.PersonalColorId;
        user.ThemeColorId    = request.ThemeColorId;
        user.ThemeColor      = themeColor;

        await repo.UpdateUserAsync(user);

        return new UserProfileResult(MapToResponse(user, personalColor), null);
    }

    public async Task<UserResult> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await repo.GetByIdAsync(userId);
        if (user is null)
            return new UserResult("USER_NOT_FOUND");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return new UserResult("USER_PASSWORD_MISMATCH");

        if (request.NewPassword != request.ConfirmPassword)
            return new UserResult("USER_PASSWORD_CONFIRM_MISMATCH");

        var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await repo.UpdatePasswordAsync(userId, newHash);

        return new UserResult(null);
    }

    private static UserProfileResponse MapToResponse(User user, Color? personalColor) => new()
    {
        UserId           = user.Id,
        LoginId          = user.LoginId,
        Name             = user.Name,
        Role             = user.Role,
        PersonalColorId  = user.PersonalColorId,
        PersonalColorHex = personalColor?.HexCode ?? string.Empty,
        ThemeColorId     = user.ThemeColorId,
        ThemeColorHex    = user.ThemeColor?.HexCode ?? string.Empty,
    };
}
