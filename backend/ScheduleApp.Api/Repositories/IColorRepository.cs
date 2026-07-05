using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IColorRepository
{
    Task<List<Color>> GetAllAsync();
    Task<Color?>      GetReservedAsync();
}
