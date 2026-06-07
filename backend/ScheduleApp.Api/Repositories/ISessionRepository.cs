using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface ISessionRepository
{
    Task CreateAsync(Session session);
    Task<Session?> FindByTokenAsync(string token);
    Task DeleteAsync(int sessionId);
    Task UpdateLastActiveAsync(int sessionId, DateTime expiresAt, DateTime lastActiveAt);
}
