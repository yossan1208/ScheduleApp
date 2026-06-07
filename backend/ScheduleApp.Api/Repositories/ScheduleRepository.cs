using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class ScheduleRepository(AppDbContext db) : IScheduleRepository
{
    public Task<List<Schedule>> GetByRangeAsync(int userId, int groupId, DateOnly from, DateOnly to)
        => db.Schedules
             .Include(s => s.Genre)
               .ThenInclude(g => g!.Color)
             .Where(s => !s.IsDeleted
                      && s.Date >= from
                      && s.Date <= to
                      && ((s.Visibility == "private" && s.CreatorId == userId)
                          || (s.Visibility == "group"  && s.GroupId  == groupId)))
             .ToListAsync();

    public Task<Schedule?> GetByIdAsync(int id)
        => db.Schedules
             .Include(s => s.Genre)
               .ThenInclude(g => g!.Color)
             .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

    public async Task<Schedule> CreateAsync(Schedule schedule)
    {
        db.Schedules.Add(schedule);
        await db.SaveChangesAsync();
        return schedule;
    }

    public async Task UpdateAsync(Schedule schedule)
    {
        db.Schedules.Update(schedule);
        await db.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(int id, DateTime deletedAt)
    {
        var schedule = await db.Schedules.FindAsync(id);
        if (schedule is null) return;
        schedule.IsDeleted = true;
        schedule.DeletedAt = deletedAt;
        await db.SaveChangesAsync();
    }

    public Task<List<Schedule>> GetRecentByUserAsync(int userId, int count = 5)
        => db.Schedules
             .Include(s => s.Genre)
               .ThenInclude(g => g!.Color)
             .Where(s => !s.IsDeleted && s.CreatorId == userId)
             .OrderByDescending(s => s.CreatedAt)
             .Take(count)
             .ToListAsync();
}
