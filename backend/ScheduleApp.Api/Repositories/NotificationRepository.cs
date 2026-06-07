using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class NotificationRepository(AppDbContext db) : INotificationRepository
{
    public async Task<List<(UserNotificationSetting Setting, Genre Genre)>> GetByUserIdAsync(int userId)
    {
        var settings = await db.UserNotificationSettings
            .Where(s => s.UserId == userId)
            .ToListAsync();

        var genreIds = settings.Select(s => s.GenreId).ToList();
        var genres = await db.Genres
            .Include(g => g.Color)
            .Where(g => genreIds.Contains(g.Id) && !g.IsDeleted)
            .ToListAsync();

        return settings
            .Join(genres, s => s.GenreId, g => g.Id, (s, g) => (s, g))
            .ToList();
    }

    public Task<UserNotificationSetting?> GetByUserAndGenreAsync(int userId, int genreId)
        => db.UserNotificationSettings
             .FirstOrDefaultAsync(s => s.UserId == userId && s.GenreId == genreId);

    public async Task UpdateAsync(UserNotificationSetting setting)
    {
        db.UserNotificationSettings.Update(setting);
        await db.SaveChangesAsync();
    }
}
