using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IScheduleService
{
    Task<List<ScheduleResponse>> GetSchedulesAsync(int userId, int groupId, DateOnly from, DateOnly to);
    Task<ScheduleResult> GetByIdAsync(int id, int userId, int groupId);
    Task<ScheduleResult> CreateAsync(ScheduleRequest request, int userId, int groupId);
    Task<ScheduleResult> UpdateAsync(int id, ScheduleRequest request, int userId);
    Task<ScheduleResult> DeleteAsync(int id, int userId);
    Task<List<ScheduleResponse>> GetRecentAsync(int userId);
}
