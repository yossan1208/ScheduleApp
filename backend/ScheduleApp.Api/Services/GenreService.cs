using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class GenreService(IGenreRepository repo) : IGenreService
{
    public async Task<List<GenreResponse>> GetGenresAsync(int groupId)
    {
        var genres = await repo.GetByGroupIdAsync(groupId);
        return genres
            .Where(g => !g.IsDeleted)
            .Select(MapToResponse)
            .ToList();
    }

    public async Task<GenreResult> CreateAsync(GenreRequest request, int groupId)
    {
        if (await repo.IsColorUsedByGenreAsync(request.ColorId, groupId, null))
            return new GenreResult(null, "GENRE_COLOR_CONFLICT");

        if (await repo.IsColorUsedByUserAsync(request.ColorId, groupId))
            return new GenreResult(null, "GENRE_COLOR_CONFLICT");

        var userIds = await repo.GetGroupUserIdsAsync(groupId);

        var genre = new Genre
        {
            Name                   = request.Name,
            ColorId                = request.ColorId,
            GroupId                = groupId,
            DefaultNotificationTime = request.DefaultNotificationTime is null
                ? null
                : TimeOnly.Parse(request.DefaultNotificationTime),
            IsActive  = true,
            IsDeleted = false,
        };

        var created = await repo.CreateAsync(genre, userIds);
        return new GenreResult(MapToResponse(created), null);
    }

    public async Task<GenreResult> UpdateAsync(int id, GenreRequest request, int groupId)
    {
        var genre = await repo.GetByIdAsync(id, groupId);
        if (genre is null)
            return new GenreResult(null, "GENRE_NOT_FOUND");

        if (genre.IsSystem)
            return new GenreResult(null, "GENRE_SYSTEM_PROTECTED");

        if (await repo.IsColorUsedByGenreAsync(request.ColorId, groupId, id))
            return new GenreResult(null, "GENRE_COLOR_CONFLICT");

        genre.Name                   = request.Name;
        genre.ColorId                = request.ColorId;
        genre.DefaultNotificationTime = request.DefaultNotificationTime is null
            ? null
            : TimeOnly.Parse(request.DefaultNotificationTime);

        await repo.UpdateAsync(genre);
        return new GenreResult(MapToResponse(genre), null);
    }

    public async Task<GenreResult> DisableAsync(int id, int groupId)
    {
        var genre = await repo.GetByIdAsync(id, groupId);
        if (genre is null)
            return new GenreResult(null, "GENRE_NOT_FOUND");

        if (genre.IsSystem)
            return new GenreResult(null, "GENRE_SYSTEM_PROTECTED");

        await repo.DisableAsync(id);
        return new GenreResult(null, null);
    }

    public async Task<GenreResult> DeleteAsync(int id, int groupId)
    {
        var genre = await repo.GetByIdAsync(id, groupId);
        if (genre is null)
            return new GenreResult(null, "GENRE_NOT_FOUND");

        if (genre.IsSystem)
            return new GenreResult(null, "GENRE_SYSTEM_PROTECTED");

        await repo.SoftDeleteAsync(id);
        return new GenreResult(null, null);
    }

    private static GenreResponse MapToResponse(Genre g) => new()
    {
        Id                      = g.Id,
        Name                    = g.Name,
        ColorId                 = g.ColorId,
        ColorHex                = g.Color?.HexCode ?? string.Empty,
        DefaultNotificationTime = g.DefaultNotificationTime?.ToString("HH:mm"),
        IsActive                = g.IsActive,
        IsDeleted               = g.IsDeleted,
        IsSystem                = g.IsSystem,
    };
}
