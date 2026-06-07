using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IAdminService
{
    Task<List<AdminUserResponse>> GetUsersAsync(bool ungroupedOnly);
    Task<AdminUserResult>         CreateUserAsync(AdminUserRequest request);
    Task<AdminResult>             DeactivateUserAsync(int id);
    Task<AdminResult>             CreateGroupAsync(AdminGroupRequest request);
}
