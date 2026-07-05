using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class ColorService(IColorRepository repo) : IColorService
{
    public async Task<List<ColorResponse>> GetAllAsync()
    {
        var colors = await repo.GetAllAsync();
        return colors
            .Where(c => !c.IsReserved)
            .Select(c => new ColorResponse
            {
                ColorId     = c.Id,
                HexCode     = c.HexCode,
                DisplayName = c.DisplayName,
            })
            .ToList();
    }
}
