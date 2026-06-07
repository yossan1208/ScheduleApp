using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class AdminRepository(AppDbContext db) : IAdminRepository
{
    public Task<List<User>> GetUsersAsync(bool ungroupedOnly)
    {
        var query = db.Users.AsQueryable();
        if (ungroupedOnly)
            query = query.Where(u => u.GroupId == null);
        return query.OrderBy(u => u.Id).ToListAsync();
    }

    public Task<bool> LoginIdExistsAsync(string loginId)
        => db.Users.AnyAsync(u => u.LoginId == loginId);

    public async Task<User> CreateUserAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public Task<User?> GetUserByIdAsync(int id)
        => db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public async Task DeactivateUserAsync(int id)
    {
        await db.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));
    }

    public async Task<Group> CreateGroupAsync(Group group)
    {
        db.Groups.Add(group);
        await db.SaveChangesAsync();
        return group;
    }

    public async Task AssignUsersToGroupAsync(int groupId, List<int> userIds)
    {
        await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.GroupId, groupId));
    }
}
