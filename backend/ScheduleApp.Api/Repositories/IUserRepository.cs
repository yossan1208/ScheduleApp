using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IUserRepository
{
    Task<User?> FindByLoginIdAsync(string loginId);
}
