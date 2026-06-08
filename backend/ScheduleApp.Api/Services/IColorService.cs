using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IColorService
{
    Task<List<ColorResponse>> GetAllAsync();
}
