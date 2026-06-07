using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IAdminRepository
{
    Task<List<User>>  GetUsersAsync(bool ungroupedOnly);
    Task<bool>        LoginIdExistsAsync(string loginId);
    Task<User>        CreateUserAsync(User user);
    Task<User?>       GetUserByIdAsync(int id);
    Task              DeactivateUserAsync(int id);
    Task<Group>       CreateGroupAsync(Group group);
    Task              AssignUsersToGroupAsync(int groupId, List<int> userIds);
}
