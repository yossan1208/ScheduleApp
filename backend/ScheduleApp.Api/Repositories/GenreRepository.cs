using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class GenreRepository(AppDbContext db) : IGenreRepository
{
    public Task<List<Genre>> GetByGroupIdAsync(int groupId)
        => db.Genres
             .Include(g => g.Color)
             .Where(g => g.GroupId == groupId && !g.IsDeleted)
             .OrderBy(g => g.Id)
             .ToListAsync();

    public Task<Genre?> GetByIdAsync(int id, int groupId)
        => db.Genres
             .Include(g => g.Color)
             .FirstOrDefaultAsync(g => g.Id == id && g.GroupId == groupId && !g.IsDeleted);

    public Task<bool> IsColorUsedByGenreAsync(int colorId, int groupId, int? excludeGenreId = null)
        => db.Genres.AnyAsync(g =>
            g.ColorId  == colorId &&
            g.GroupId  == groupId &&
            !g.IsDeleted &&
            (excludeGenreId == null || g.Id != excludeGenreId));

    public Task<bool> IsColorUsedByUserAsync(int colorId, int groupId)
        => db.Users.AnyAsync(u => u.PersonalColorId == colorId && u.GroupId == groupId);

    public Task<List<int>> GetGroupUserIdsAsync(int groupId)
        => db.Users
             .Where(u => u.GroupId == groupId && u.IsActive)
             .Select(u => u.Id)
             .ToListAsync();

    public async Task<Genre> CreateAsync(Genre genre, List<int> userIds)
    {
        db.Genres.Add(genre);
        await db.SaveChangesAsync();

        var settings = userIds.Select(uid => new UserNotificationSetting
        {
            UserId    = uid,
            GenreId   = genre.Id,
            IsEnabled = true,
        });
        db.UserNotificationSettings.AddRange(settings);
        await db.SaveChangesAsync();

        await db.Entry(genre).Reference(g => g.Color).LoadAsync();
        return genre;
    }

    public async Task UpdateAsync(Genre genre)
    {
        db.Genres.Update(genre);
        await db.SaveChangesAsync();
    }

    public async Task DisableAsync(int id)
    {
        await db.Genres
            .Where(g => g.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.IsActive, false));
    }

    public async Task SoftDeleteAsync(int id)
    {
        await db.Genres
            .Where(g => g.Id == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(g => g.IsDeleted, true)
                .SetProperty(g => g.DeletedAt, DateTime.UtcNow));
    }
}
