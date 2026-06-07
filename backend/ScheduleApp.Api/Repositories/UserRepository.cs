using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> FindByLoginIdAsync(string loginId)
        => db.Users
             .Include(u => u.ThemeColor)
             .FirstOrDefaultAsync(u => u.LoginId == loginId);
}
