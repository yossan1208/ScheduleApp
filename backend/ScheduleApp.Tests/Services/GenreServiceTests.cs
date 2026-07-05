using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class GenreServiceTests
{
    private readonly Mock<IGenreRepository> _repoMock = new();
    private readonly IGenreService          _sut;

    public GenreServiceTests()
    {
        _sut = new GenreService(_repoMock.Object);
    }

    private static Genre MakeGenre(int id = 1, int colorId = 10, bool isDeleted = false, bool isActive = true, bool isSystem = false) => new()
    {
        Id        = id,
        Name      = "業務",
        ColorId   = colorId,
        GroupId   = 1,
        IsActive  = isActive,
        IsDeleted = isDeleted,
        IsSystem  = isSystem,
        Color     = new Color { Id = colorId, HexCode = "#3F51B5", DisplayName = "ブルー", SortOrder = 1 },
    };

    // 1. GetGenres: is_deleted=true は返さない
    [Fact]
    public async Task GetGenresAsync_ExcludesDeletedGenres()
    {
        _repoMock.Setup(r => r.GetByGroupIdAsync(1))
                 .ReturnsAsync([MakeGenre(id: 1), MakeGenre(id: 2, isDeleted: true)]);

        var result = await _sut.GetGenresAsync(1);

        Assert.Single(result);
        Assert.Equal(1, result[0].Id);
    }

    // 2. Create: ジャンル間で色重複 → GENRE_COLOR_CONFLICT
    [Fact]
    public async Task CreateAsync_ColorUsedByAnotherGenre_ReturnsColorConflict()
    {
        _repoMock.Setup(r => r.IsColorUsedByGenreAsync(10, 1, null)).ReturnsAsync(true);

        var result = await _sut.CreateAsync(
            new GenreRequest { Name = "新ジャンル", ColorId = 10 }, groupId: 1);

        Assert.Equal("GENRE_COLOR_CONFLICT", result.ErrorCode);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<Genre>(), It.IsAny<List<int>>()), Times.Never);
    }

    // 3. Create: ユーザー個人カラーと重複 → GENRE_COLOR_CONFLICT
    [Fact]
    public async Task CreateAsync_ColorUsedByUser_ReturnsColorConflict()
    {
        _repoMock.Setup(r => r.IsColorUsedByGenreAsync(10, 1, null)).ReturnsAsync(false);
        _repoMock.Setup(r => r.IsColorUsedByUserAsync(10, 1)).ReturnsAsync(true);

        var result = await _sut.CreateAsync(
            new GenreRequest { Name = "新ジャンル", ColorId = 10 }, groupId: 1);

        Assert.Equal("GENRE_COLOR_CONFLICT", result.ErrorCode);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<Genre>(), It.IsAny<List<int>>()), Times.Never);
    }

    // 4. Create: 正常 → UserNotificationSettings が全ユーザー分作成される
    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesGenreWithNotificationSettings()
    {
        var userIds = new List<int> { 1, 2, 3 };
        _repoMock.Setup(r => r.IsColorUsedByGenreAsync(10, 1, null)).ReturnsAsync(false);
        _repoMock.Setup(r => r.IsColorUsedByUserAsync(10, 1)).ReturnsAsync(false);
        _repoMock.Setup(r => r.GetGroupUserIdsAsync(1)).ReturnsAsync(userIds);
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Genre>(), userIds))
                 .ReturnsAsync((Genre g, List<int> _) =>
                 {
                     g.Id    = 5;
                     g.Color = new Color { HexCode = "#3F51B5" };
                     return g;
                 });

        var result = await _sut.CreateAsync(
            new GenreRequest { Name = "新ジャンル", ColorId = 10, DefaultNotificationTime = "08:00" },
            groupId: 1);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Equal(5, result.Data.Id);
        _repoMock.Verify(r => r.CreateAsync(
            It.Is<Genre>(g => g.Name == "新ジャンル" && g.ColorId == 10),
            userIds), Times.Once);
    }

    // 5. Update: 存在しない → GENRE_NOT_FOUND
    [Fact]
    public async Task UpdateAsync_GenreNotFound_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(99, 1)).ReturnsAsync((Genre?)null);

        var result = await _sut.UpdateAsync(99,
            new GenreRequest { Name = "変更", ColorId = 10 }, groupId: 1);

        Assert.Equal("GENRE_NOT_FOUND", result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Genre>()), Times.Never);
    }

    // 6. Update: 他ジャンルと色重複 → GENRE_COLOR_CONFLICT
    [Fact]
    public async Task UpdateAsync_ColorConflict_ReturnsColorConflict()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeGenre(id: 1, colorId: 10));
        _repoMock.Setup(r => r.IsColorUsedByGenreAsync(20, 1, 1)).ReturnsAsync(true);

        var result = await _sut.UpdateAsync(1,
            new GenreRequest { Name = "変更", ColorId = 20 }, groupId: 1);

        Assert.Equal("GENRE_COLOR_CONFLICT", result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Genre>()), Times.Never);
    }

    // 7. Disable: 存在しない → GENRE_NOT_FOUND
    [Fact]
    public async Task DisableAsync_GenreNotFound_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(99, 1)).ReturnsAsync((Genre?)null);

        var result = await _sut.DisableAsync(99, groupId: 1);

        Assert.Equal("GENRE_NOT_FOUND", result.ErrorCode);
        _repoMock.Verify(r => r.DisableAsync(It.IsAny<int>()), Times.Never);
    }

    // 8. Delete: 正常 → 論理削除される
    [Fact]
    public async Task DeleteAsync_ValidId_SoftDeletes()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeGenre(id: 1));
        _repoMock.Setup(r => r.SoftDeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _sut.DeleteAsync(1, groupId: 1);

        Assert.Null(result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(1), Times.Once);
    }

    // 9. Update: IsSystem ジャンル → GENRE_SYSTEM_PROTECTED
    [Fact]
    public async Task UpdateAsync_SystemGenre_ReturnsSystemProtected()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeGenre(id: 1, isSystem: true));

        var result = await _sut.UpdateAsync(1,
            new GenreRequest { Name = "変更", ColorId = 20 }, groupId: 1);

        Assert.Equal("GENRE_SYSTEM_PROTECTED", result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Genre>()), Times.Never);
    }

    // 10. Disable: IsSystem ジャンル → GENRE_SYSTEM_PROTECTED
    [Fact]
    public async Task DisableAsync_SystemGenre_ReturnsSystemProtected()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeGenre(id: 1, isSystem: true));

        var result = await _sut.DisableAsync(1, groupId: 1);

        Assert.Equal("GENRE_SYSTEM_PROTECTED", result.ErrorCode);
        _repoMock.Verify(r => r.DisableAsync(It.IsAny<int>()), Times.Never);
    }

    // 11. Delete: IsSystem ジャンル → GENRE_SYSTEM_PROTECTED
    [Fact]
    public async Task DeleteAsync_SystemGenre_ReturnsSystemProtected()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeGenre(id: 1, isSystem: true));

        var result = await _sut.DeleteAsync(1, groupId: 1);

        Assert.Equal("GENRE_SYSTEM_PROTECTED", result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(It.IsAny<int>()), Times.Never);
    }
}
