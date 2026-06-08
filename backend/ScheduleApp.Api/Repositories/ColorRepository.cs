using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class ColorRepository(AppDbContext db) : IColorRepository
{
    public Task<List<Color>> GetAllAsync()
        => db.Colors.OrderBy(c => c.SortOrder).ToListAsync();
}
