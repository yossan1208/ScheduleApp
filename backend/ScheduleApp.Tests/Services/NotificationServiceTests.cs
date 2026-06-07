using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class NotificationServiceTests
{
    private readonly Mock<INotificationRepository> _repoMock = new();
    private readonly INotificationService          _sut;

    public NotificationServiceTests()
    {
        _sut = new NotificationService(_repoMock.Object);
    }

    private static (UserNotificationSetting, Genre) MakePair(
        int genreId = 1, bool isEnabled = true, int? customMinutes = null) =>
        (
            new UserNotificationSetting
            {
                Id = 1, UserId = 1, GenreId = genreId,
                IsEnabled = isEnabled, CustomNotificationMinutes = customMinutes,
            },
            new Genre
            {
                Id = genreId, Name = "仕事", GroupId = 1,
                Color = new Color { HexCode = "#FF8C00", DisplayName = "ダークオレンジ", SortOrder = 1 },
            }
        );

    // 1. GetSettings: 自分の設定一覧が返る（ジャンル名・色付き）
    [Fact]
    public async Task GetSettingsAsync_ReturnsSettingsWithGenreInfo()
    {
        _repoMock.Setup(r => r.GetByUserIdAsync(1))
                 .ReturnsAsync([MakePair()]);

        var result = await _sut.GetSettingsAsync(1);

        Assert.Single(result);
        Assert.Equal(1,          result[0].GenreId);
        Assert.Equal("仕事",      result[0].GenreName);
        Assert.Equal("#FF8C00",  result[0].ColorHex);
        Assert.True(result[0].IsEnabled);
        Assert.Null(result[0].CustomNotificationMinutes);
    }

    // 2. UpdateSetting: 存在しない設定 → NOTIFICATION_NOT_FOUND
    [Fact]
    public async Task UpdateSettingAsync_NotFound_ReturnsError()
    {
        _repoMock.Setup(r => r.GetByUserAndGenreAsync(1, 99))
                 .ReturnsAsync((UserNotificationSetting?)null);

        var result = await _sut.UpdateSettingAsync(1, 99, new NotificationSettingRequest { IsEnabled = true });

        Assert.Equal("NOTIFICATION_NOT_FOUND", result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<UserNotificationSetting>()), Times.Never);
    }

    // 3. UpdateSetting: 正常更新（isEnabled + customMinutes 両方）
    [Fact]
    public async Task UpdateSettingAsync_Valid_UpdatesBothFields()
    {
        var (setting, _) = MakePair(isEnabled: true, customMinutes: null);
        _repoMock.Setup(r => r.GetByUserAndGenreAsync(1, 1)).ReturnsAsync(setting);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<UserNotificationSetting>())).Returns(Task.CompletedTask);

        var result = await _sut.UpdateSettingAsync(1, 1,
            new NotificationSettingRequest { IsEnabled = false, CustomNotificationMinutes = 30 });

        Assert.Null(result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.Is<UserNotificationSetting>(
            s => s.IsEnabled == false && s.CustomNotificationMinutes == 30)), Times.Once);
    }

    // 4. UpdateSetting: customMinutes = null でリセットできる
    [Fact]
    public async Task UpdateSettingAsync_NullCustomMinutes_ResetsToDefault()
    {
        var (setting, _) = MakePair(customMinutes: 60);
        _repoMock.Setup(r => r.GetByUserAndGenreAsync(1, 1)).ReturnsAsync(setting);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<UserNotificationSetting>())).Returns(Task.CompletedTask);

        var result = await _sut.UpdateSettingAsync(1, 1,
            new NotificationSettingRequest { IsEnabled = true, CustomNotificationMinutes = null });

        Assert.Null(result.ErrorCode);
        _repoMock.Verify(r => r.UpdateAsync(It.Is<UserNotificationSetting>(
            s => s.CustomNotificationMinutes == null)), Times.Once);
    }
}
