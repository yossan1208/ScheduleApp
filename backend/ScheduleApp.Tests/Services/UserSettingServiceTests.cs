using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class UserSettingServiceTests
{
    private readonly Mock<IUserSettingRepository> _repoMock = new();
    private readonly IUserSettingService          _sut;

    public UserSettingServiceTests()
    {
        _sut = new UserSettingService(_repoMock.Object);
    }

    // ---- helpers ----

    private static Color MakeColor(int id, string hex) => new()
    {
        Id          = id,
        HexCode     = hex,
        DisplayName = $"Color {id}",
        SortOrder   = (short)id,
    };

    private static User MakeUser(int personalColorId = 2, int themeColorId = 1, string language = "ja") => new()
    {
        Id              = 1,
        LoginId         = "admin",
        Name            = "管理者ユーザー",
        PasswordHash    = BCrypt.Net.BCrypt.HashPassword("pass123"),
        Role            = 0,
        PersonalColorId = personalColorId,
        ThemeColorId    = themeColorId,
        GroupId         = 1,
        IsActive        = true,
        ThemeColor      = MakeColor(themeColorId, "#FF8C00"),
        Language        = language,
    };

    // 1. GetProfile: 正常 → UserProfileResponse が返る（personalColor・themeColor の HexCode 含む）
    [Fact]
    public async Task GetProfileAsync_ValidUser_ReturnsProfile()
    {
        var user         = MakeUser();
        var personalColor = MakeColor(2, "#4169E1");

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _repoMock.Setup(r => r.GetColorByIdAsync(2)).ReturnsAsync(personalColor);

        var result = await _sut.GetProfileAsync(1);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Equal(1,          result.Data!.UserId);
        Assert.Equal("admin",    result.Data.LoginId);
        Assert.Equal("管理者ユーザー", result.Data.Name);
        Assert.Equal(0,          result.Data.Role);
        Assert.Equal(2,          result.Data.PersonalColorId);
        Assert.Equal("#4169E1",  result.Data.PersonalColorHex);
        Assert.Equal(1,          result.Data.ThemeColorId);
        Assert.Equal("#FF8C00",  result.Data.ThemeColorHex);
        Assert.Equal("ja",       result.Data.Language);
    }

    // 2. UpdateProfile: 存在しない colorId → USER_COLOR_NOT_FOUND
    [Fact]
    public async Task UpdateProfileAsync_InvalidColorId_ReturnsError()
    {
        var user = MakeUser();
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _repoMock.Setup(r => r.GetColorByIdAsync(It.IsAny<int>())).ReturnsAsync((Color?)null);

        var request = new UpdateProfileRequest
        {
            Name            = "新しい名前",
            PersonalColorId = 99,
            ThemeColorId    = 1,
        };

        var result = await _sut.UpdateProfileAsync(1, request);

        Assert.Equal("USER_COLOR_NOT_FOUND", result.ErrorCode);
        Assert.Null(result.Data);
        _repoMock.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Never);
    }

    // 3. UpdateProfile: 正常 → 更新後の UserProfileResponse が返る
    [Fact]
    public async Task UpdateProfileAsync_Valid_ReturnsUpdatedProfile()
    {
        var user          = MakeUser();
        var personalColor = MakeColor(3, "#228B22");
        var themeColor    = MakeColor(2, "#4169E1");

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _repoMock.Setup(r => r.GetColorByIdAsync(3)).ReturnsAsync(personalColor);
        _repoMock.Setup(r => r.GetColorByIdAsync(2)).ReturnsAsync(themeColor);
        _repoMock.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var request = new UpdateProfileRequest
        {
            Name            = "新しい名前",
            PersonalColorId = 3,
            ThemeColorId    = 2,
        };

        var result = await _sut.UpdateProfileAsync(1, request);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Equal("新しい名前", result.Data!.Name);
        Assert.Equal(3,          result.Data.PersonalColorId);
        Assert.Equal("#228B22",  result.Data.PersonalColorHex);
        Assert.Equal(2,          result.Data.ThemeColorId);
        Assert.Equal("#4169E1",  result.Data.ThemeColorHex);
        _repoMock.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Once);
    }

    // 4. ChangePassword: currentPassword 不一致 → USER_PASSWORD_MISMATCH
    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ReturnsMismatch()
    {
        var user = MakeUser();  // PasswordHash = hash("pass123")
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "wrongpass",
            NewPassword     = "newpass456",
            ConfirmPassword = "newpass456",
        };

        var result = await _sut.ChangePasswordAsync(1, request);

        Assert.Equal("USER_PASSWORD_MISMATCH", result.ErrorCode);
        _repoMock.Verify(r => r.UpdatePasswordAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    // 5. ChangePassword: confirmPassword 不一致 → USER_PASSWORD_CONFIRM_MISMATCH
    [Fact]
    public async Task ChangePasswordAsync_ConfirmPasswordMismatch_ReturnsConfirmMismatch()
    {
        var user = MakeUser();  // PasswordHash = hash("pass123")
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "pass123",
            NewPassword     = "newpass456",
            ConfirmPassword = "differentpass",
        };

        var result = await _sut.ChangePasswordAsync(1, request);

        Assert.Equal("USER_PASSWORD_CONFIRM_MISMATCH", result.ErrorCode);
        _repoMock.Verify(r => r.UpdatePasswordAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    // 6. ChangePassword: 正常 → ErrorCode が null
    [Fact]
    public async Task ChangePasswordAsync_Valid_ReturnsNoError()
    {
        var user = MakeUser();  // PasswordHash = hash("pass123")
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _repoMock.Setup(r => r.UpdatePasswordAsync(1, It.IsAny<string>())).Returns(Task.CompletedTask);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "pass123",
            NewPassword     = "newpass456",
            ConfirmPassword = "newpass456",
        };

        var result = await _sut.ChangePasswordAsync(1, request);

        Assert.Null(result.ErrorCode);
        _repoMock.Verify(r => r.UpdatePasswordAsync(1, It.IsAny<string>()), Times.Once);
    }

    // Language: GetProfile で language が返る
    [Fact]
    public async Task GetProfileAsync_ValidUser_ReturnsLanguage()
    {
        var user         = MakeUser(language: "en");
        var personalColor = MakeColor(2, "#4169E1");

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _repoMock.Setup(r => r.GetColorByIdAsync(2)).ReturnsAsync(personalColor);

        var result = await _sut.GetProfileAsync(1);

        Assert.Null(result.ErrorCode);
        Assert.Equal("en", result.Data!.Language);
    }

    // Language: UpdateProfile で language が保存される
    [Fact]
    public async Task UpdateProfileAsync_WithLanguageEn_SavesLanguage()
    {
        var user         = MakeUser(language: "ja");
        var personalColor = MakeColor(2, "#4169E1");
        var themeColor    = MakeColor(1, "#FF8C00");

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _repoMock.Setup(r => r.GetColorByIdAsync(2)).ReturnsAsync(personalColor);
        _repoMock.Setup(r => r.GetColorByIdAsync(1)).ReturnsAsync(themeColor);
        _repoMock.Setup(r => r.IsColorUsedByGenreAsync(It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(false);
        _repoMock.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var request = new UpdateProfileRequest
        {
            Name            = "テストユーザー",
            PersonalColorId = 2,
            ThemeColorId    = 1,
            Language        = "en",
        };

        var result = await _sut.UpdateProfileAsync(1, request);

        Assert.Null(result.ErrorCode);
        Assert.Equal("en", result.Data!.Language);
        _repoMock.Verify(r => r.UpdateUserAsync(It.Is<User>(u => u.Language == "en")), Times.Once);
    }
}
