using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IScheduleRepository
{
    Task<List<Schedule>> GetByRangeAsync(int userId, int groupId, DateOnly from, DateOnly to);
    Task<Schedule?> GetByIdAsync(int id);
    Task<Schedule> CreateAsync(Schedule schedule);
    Task UpdateAsync(Schedule schedule);
    Task SoftDeleteAsync(int id, DateTime deletedAt);
    Task<List<Schedule>> GetRecentByUserAsync(int userId, int count = 5);
}
