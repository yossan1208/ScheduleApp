using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class ScheduleServiceTests
{
    private readonly Mock<IScheduleRepository> _repoMock = new();
    private readonly IScheduleService _sut;

    public ScheduleServiceTests()
    {
        _sut = new ScheduleService(_repoMock.Object);
    }

    private static Schedule MakeSchedule(
        int id = 1, int creatorId = 1, int groupId = 1,
        string visibility = "group", bool genreDeleted = false) => new()
    {
        Id               = id,
        CreatorId        = creatorId,
        GroupId          = groupId,
        GenreId          = 1,
        Date             = DateOnly.Parse("2026-06-10"),
        Title            = "テストスケジュール",
        Visibility       = visibility,
        NotificationTime = TimeOnly.Parse("08:45"),
        CreatedAt        = DateTime.UtcNow,
        Genre            = genreDeleted
            ? new Genre { Id = 1, Name = "業務", ColorId = 1, IsDeleted = true }
            : new Genre { Id = 1, Name = "業務", ColorId = 1,
                          Color = new Color { HexCode = "#3F51B5" } },
    };

    // 1. 自分のprivateスケジュールは取得できる
    [Fact]
    public async Task GetByIdAsync_OwnPrivate_ReturnsSchedule()
    {
        var schedule = MakeSchedule(creatorId: 1, visibility: "private");
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(schedule);

        var result = await _sut.GetByIdAsync(1, userId: 1, groupId: 1);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Equal(1, result.Data.Id);
    }

    // 2. 他人のprivateスケジュールはNOT_FOUND
    [Fact]
    public async Task GetByIdAsync_OthersPrivate_ReturnsNotFound()
    {
        var schedule = MakeSchedule(creatorId: 99, visibility: "private");
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(schedule);

        var result = await _sut.GetByIdAsync(1, userId: 1, groupId: 1);

        Assert.Equal("SCHEDULE_NOT_FOUND", result.ErrorCode);
        Assert.Null(result.Data);
    }

    // 3. リポジトリがnullを返した場合はNOT_FOUND
    [Fact]
    public async Task GetByIdAsync_NotInDb_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Schedule?)null);

        var result = await _sut.GetByIdAsync(99, userId: 1, groupId: 1);

        Assert.Equal("SCHEDULE_NOT_FOUND", result.ErrorCode);
        Assert.Null(result.Data);
    }

    // 4. 削除済みジャンルのスケジュールはgenreがnullで返る
    [Fact]
    public async Task GetByIdAsync_DeletedGenre_ReturnsNullGenre()
    {
        var schedule = MakeSchedule(genreDeleted: true);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(schedule);

        var result = await _sut.GetByIdAsync(1, userId: 1, groupId: 1);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Null(result.Data.Genre);
    }

    // 5. 正常作成でcreatorIdとgroupIdがセットされる
    [Fact]
    public async Task CreateAsync_ValidRequest_SetsCreatorAndGroup()
    {
        var request = new ScheduleRequest
        {
            Date             = "2026-06-10",
            Title            = "朝会",
            Visibility       = "group",
            GenreId          = 1,
            NotificationTime = "08:45",
        };

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Schedule>()))
            .ReturnsAsync((Schedule s) =>
            {
                s.Id    = 1;
                s.Genre = new Genre { Id = 1, Name = "業務", ColorId = 1,
                                      Color = new Color { HexCode = "#3F51B5" } };
                return s;
            });

        var result = await _sut.CreateAsync(request, userId: 5, groupId: 2);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        _repoMock.Verify(r => r.CreateAsync(It.Is<Schedule>(s =>
            s.CreatorId == 5 && s.GroupId == 2 && s.Title == "朝会"
        )), Times.Once);
    }

    // 6. 作成者以外による更新はFORBIDDEN
    [Fact]
    public async Task UpdateAsync_NotCreator_ReturnsForbidden()
    {
        var schedule = MakeSchedule(creatorId: 99);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(schedule);

        var request = new ScheduleRequest
        {
            Date = "2026-06-10", Title = "変更後タイトル", Visibility = "group",
            GenreId = 1, NotificationTime = "08:45",
        };

        var result = await _sut.UpdateAsync(1, request, userId: 1);

        Assert.Equal("SCHEDULE_FORBIDDEN", result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Schedule>()), Times.Never);
    }

    // 7. 作成者は論理削除できる
    [Fact]
    public async Task DeleteAsync_Creator_SoftDeletes()
    {
        var schedule = MakeSchedule(creatorId: 1);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(schedule);
        _repoMock.Setup(r => r.SoftDeleteAsync(1, It.IsAny<DateTime>())).Returns(Task.CompletedTask);

        var result = await _sut.DeleteAsync(1, userId: 1);

        Assert.Null(result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(1, It.IsAny<DateTime>()), Times.Once);
    }

    // 8. 作成者以外による削除はFORBIDDEN
    [Fact]
    public async Task DeleteAsync_NotCreator_ReturnsForbidden()
    {
        var schedule = MakeSchedule(creatorId: 99);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(schedule);

        var result = await _sut.DeleteAsync(1, userId: 1);

        Assert.Equal("SCHEDULE_FORBIDDEN", result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(It.IsAny<int>(), It.IsAny<DateTime>()), Times.Never);
    }
}
