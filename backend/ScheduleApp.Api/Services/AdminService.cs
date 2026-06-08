using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class AdminService(
    IAdminRepository adminRepo,
    INoteRepository  noteRepo,
    IMemoRepository  memoRepo) : IAdminService
{
    public async Task<List<AdminUserResponse>> GetUsersAsync(bool ungroupedOnly)
    {
        var users = await adminRepo.GetUsersAsync(ungroupedOnly);
        return users.Select(MapToResponse).ToList();
    }

    public async Task<AdminUserResult> CreateUserAsync(AdminUserRequest request)
    {
        if (await adminRepo.LoginIdExistsAsync(request.LoginId))
            return new AdminUserResult(null, "ADMIN_LOGIN_ID_CONFLICT");

        var user = new User
        {
            LoginId      = request.LoginId,
            Name         = request.Name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = request.Role,
            IsActive     = true,
        };

        var created = await adminRepo.CreateUserAsync(user);
        return new AdminUserResult(MapToResponse(created), null);
    }

    public async Task<AdminResult> DeactivateUserAsync(int id)
    {
        var user = await adminRepo.GetUserByIdAsync(id);
        if (user is null)
            return new AdminResult("ADMIN_USER_NOT_FOUND");

        await adminRepo.DeactivateUserAsync(id);
        return new AdminResult(null);
    }

    public async Task<AdminResult> CreateGroupAsync(AdminGroupRequest request)
    {
        if (request.UserIds.Count == 0)
            return new AdminResult("ADMIN_GROUP_USER_REQUIRED");

        // 1. グループ作成
        var group = await adminRepo.CreateGroupAsync(new Group { Name = request.Name });

        // 2. ユーザーのGroupIdを更新
        await adminRepo.AssignUsersToGroupAsync(group.Id, request.UserIds);

        // 3. 重要事項ノート作成
        var note = await noteRepo.CreateAsync(new Note
        {
            Name      = "重要事項",
            Color     = "#9E9E9E",
            GroupId   = group.Id,
            CreatorId = request.UserIds[0],
            IsSystem  = true,
        });

        // 4. メモ作成
        await memoRepo.CreateAsync(new Memo
        {
            NoteId      = note.Id,
            IsImportant = true,
            CreatorId   = request.UserIds[0],
        });

        return new AdminResult(null);
    }

    private static AdminUserResponse MapToResponse(User u) => new()
    {
        UserId   = u.Id,
        LoginId  = u.LoginId,
        Name     = u.Name,
        Role     = u.Role,
        GroupId  = u.GroupId,
        IsActive = u.IsActive,
    };
}
