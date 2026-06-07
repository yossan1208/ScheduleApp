using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IGenreRepository
{
    Task<List<Genre>> GetByGroupIdAsync(int groupId);
    Task<Genre?>      GetByIdAsync(int id, int groupId);
    Task<bool>        IsColorUsedByGenreAsync(int colorId, int groupId, int? excludeGenreId = null);
    Task<bool>        IsColorUsedByUserAsync(int colorId, int groupId);
    Task<List<int>>   GetGroupUserIdsAsync(int groupId);
    Task<Genre>       CreateAsync(Genre genre, List<int> userIds);
    Task              UpdateAsync(Genre genre);
    Task              DisableAsync(int id);
    Task              SoftDeleteAsync(int id);
}
