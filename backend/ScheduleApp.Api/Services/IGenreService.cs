using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IGenreService
{
    Task<List<GenreResponse>> GetGenresAsync(int groupId);
    Task<GenreResult>         CreateAsync(GenreRequest request, int groupId);
    Task<GenreResult>         UpdateAsync(int id, GenreRequest request, int groupId);
    Task<GenreResult>         DisableAsync(int id, int groupId);
    Task<GenreResult>         DeleteAsync(int id, int groupId);
}
