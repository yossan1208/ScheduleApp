using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class UserSettingRepository(AppDbContext db) : IUserSettingRepository
{
    public Task<User?> GetByIdAsync(int userId)
        => db.Users
             .Include(u => u.ThemeColor)
             .FirstOrDefaultAsync(u => u.Id == userId);

    public Task<Color?> GetColorByIdAsync(int colorId)
        => db.Colors.FirstOrDefaultAsync(c => c.Id == colorId);

    public Task UpdateUserAsync(User user)
    {
        db.Users.Update(user);
        return db.SaveChangesAsync();
    }

    public async Task UpdatePasswordAsync(int userId, string newPasswordHash)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is not null)
        {
            user.PasswordHash = newPasswordHash;
            await db.SaveChangesAsync();
        }
    }
}
