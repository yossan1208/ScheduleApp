using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class SessionRepository(AppDbContext db) : ISessionRepository
{
    public async Task CreateAsync(Session session)
    {
        db.Sessions.Add(session);
        await db.SaveChangesAsync();
    }

    public Task<Session?> FindByTokenAsync(string token)
        => db.Sessions.FirstOrDefaultAsync(s => s.Token == token);

    public async Task DeleteAsync(int sessionId)
    {
        var session = await db.Sessions.FindAsync(sessionId);
        if (session != null)
        {
            db.Sessions.Remove(session);
            await db.SaveChangesAsync();
        }
    }

    public async Task UpdateLastActiveAsync(int sessionId, DateTime expiresAt, DateTime lastActiveAt)
    {
        await db.Sessions
            .Where(s => s.Id == sessionId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.ExpiresAt,    expiresAt)
                .SetProperty(x => x.LastActiveAt, lastActiveAt));
    }
}
