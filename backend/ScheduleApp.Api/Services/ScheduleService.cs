using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Utils;

namespace ScheduleApp.Api.Services;

public class ScheduleService(IScheduleRepository repo) : IScheduleService
{
    public async Task<List<ScheduleResponse>> GetSchedulesAsync(
        int userId, int groupId, DateOnly from, DateOnly to)
    {
        var schedules = await repo.GetByRangeAsync(userId, groupId, from, to);
        return schedules.Select(MapToResponse).ToList();
    }

    public async Task<ScheduleResult> GetByIdAsync(int id, int userId, int groupId)
    {
        var schedule = await repo.GetByIdAsync(id);
        if (schedule is null)
            return new ScheduleResult(null, "SCHEDULE_NOT_FOUND");

        if (schedule.Visibility == "private" && schedule.CreatorId != userId)
            return new ScheduleResult(null, "SCHEDULE_NOT_FOUND");

        if (schedule.Visibility == "group" && schedule.GroupId != groupId)
            return new ScheduleResult(null, "SCHEDULE_NOT_FOUND");

        return new ScheduleResult(MapToResponse(schedule), null);
    }

    public async Task<ScheduleResult> CreateAsync(ScheduleRequest request, int userId, int groupId)
    {
        if (!DateOnly.TryParse(request.Date, out var date))
            return new ScheduleResult(null, "SCHEDULE_INVALID");
        if (!TimeOnly.TryParse(request.NotificationTime, out var notificationTime))
            return new ScheduleResult(null, "SCHEDULE_INVALID");
        if (request.StartTime is not null && !TimeOnly.TryParse(request.StartTime, out _))
            return new ScheduleResult(null, "SCHEDULE_INVALID");
        if (request.EndTime is not null && !TimeOnly.TryParse(request.EndTime, out _))
            return new ScheduleResult(null, "SCHEDULE_INVALID");

        var schedule = new Schedule
        {
            CreatorId        = userId,
            GroupId          = groupId,
            GenreId          = request.GenreId,
            Date             = date,
            Title            = request.Title,
            Detail           = request.Detail,
            Visibility       = request.Visibility,
            StartTime        = request.StartTime is null ? null : TimeOnly.Parse(request.StartTime),
            EndTime          = request.EndTime   is null ? null : TimeOnly.Parse(request.EndTime),
            NotificationTime = notificationTime,
            CreatedAt        = JstClock.Now,
        };

        var created = await repo.CreateAsync(schedule);
        return new ScheduleResult(MapToResponse(created), null);
    }

    public async Task<ScheduleResult> UpdateAsync(int id, ScheduleRequest request, int userId)
    {
        var schedule = await repo.GetByIdAsync(id);
        if (schedule is null)
            return new ScheduleResult(null, "SCHEDULE_NOT_FOUND");

        if (schedule.CreatorId != userId)
            return new ScheduleResult(null, "SCHEDULE_FORBIDDEN");

        if (!DateOnly.TryParse(request.Date, out var date))
            return new ScheduleResult(null, "SCHEDULE_INVALID");
        if (!TimeOnly.TryParse(request.NotificationTime, out var notificationTime))
            return new ScheduleResult(null, "SCHEDULE_INVALID");
        if (request.StartTime is not null && !TimeOnly.TryParse(request.StartTime, out _))
            return new ScheduleResult(null, "SCHEDULE_INVALID");
        if (request.EndTime is not null && !TimeOnly.TryParse(request.EndTime, out _))
            return new ScheduleResult(null, "SCHEDULE_INVALID");

        schedule.GenreId          = request.GenreId;
        schedule.Date             = date;
        schedule.Title            = request.Title;
        schedule.Detail           = request.Detail;
        schedule.Visibility       = request.Visibility;
        schedule.StartTime        = request.StartTime is null ? null : TimeOnly.Parse(request.StartTime);
        schedule.EndTime          = request.EndTime   is null ? null : TimeOnly.Parse(request.EndTime);
        schedule.NotificationTime = notificationTime;

        await repo.UpdateAsync(schedule);
        return new ScheduleResult(MapToResponse(schedule), null);
    }

    public async Task<ScheduleResult> DeleteAsync(int id, int userId)
    {
        var schedule = await repo.GetByIdAsync(id);
        if (schedule is null)
            return new ScheduleResult(null, "SCHEDULE_NOT_FOUND");

        if (schedule.CreatorId != userId)
            return new ScheduleResult(null, "SCHEDULE_FORBIDDEN");

        await repo.SoftDeleteAsync(id, JstClock.Now);
        return new ScheduleResult(null, null);
    }

    public async Task<List<ScheduleResponse>> GetRecentAsync(int userId)
    {
        var schedules = await repo.GetRecentByUserAsync(userId, 5);
        return schedules.Select(MapToResponse).ToList();
    }

    private static ScheduleResponse MapToResponse(Schedule s) => new()
    {
        Id               = s.Id,
        CreatorId        = s.CreatorId,
        Date             = s.Date.ToString("yyyy-MM-dd"),
        StartTime        = s.StartTime?.ToString("HH:mm"),
        EndTime          = s.EndTime?.ToString("HH:mm"),
        Title            = s.Title,
        Detail           = s.Detail,
        Visibility       = s.Visibility,
        NotificationTime = s.NotificationTime.ToString("HH:mm"),
        Genre            = s.Genre is null || s.Genre.IsDeleted ? null : new ScheduleGenreDto
        {
            Id       = s.Genre.Id,
            Name     = s.Genre.Name,
            ColorHex = s.Genre.Color?.HexCode ?? string.Empty,
        },
    };
}
