using Moq;
using Microsoft.Extensions.Configuration;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<ISessionRepository> _sessionRepoMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly IAuthService _sut;

    public AuthServiceTests()
    {
        _userRepoMock    = new Mock<IUserRepository>();
        _sessionRepoMock = new Mock<ISessionRepository>();
        _configMock      = new Mock<IConfiguration>();

        // Provide minimal JWT config so AuthService can build tokens
        _configMock.Setup(c => c["Jwt:Key"]).Returns("super-secret-key-for-testing-only-32chars!!");
        _configMock.Setup(c => c["Jwt:Issuer"]).Returns("ScheduleApp");
        _configMock.Setup(c => c["Jwt:Audience"]).Returns("ScheduleApp");

        _sut = new AuthService(_userRepoMock.Object, _sessionRepoMock.Object, _configMock.Object);
    }

    // 1. ユーザーが見つからない場合
    [Fact]
    public async Task LoginAsync_UserNotFound_ReturnsInvalidCredentials()
    {
        _userRepoMock
            .Setup(r => r.FindByLoginIdAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        var request = new LoginRequest { LoginId = "unknown", Password = "anypassword" };
        var result  = await _sut.LoginAsync(request);

        Assert.Equal("AUTH_INVALID_CREDENTIALS", result.ErrorCode);
        Assert.Null(result.Response);
    }

    // 2. パスワード不一致の場合
    [Fact]
    public async Task LoginAsync_WrongPassword_ReturnsInvalidCredentials()
    {
        var user = new User
        {
            Id           = 1,
            LoginId      = "testuser",
            Name         = "Test User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct"),
            IsActive     = true,
            GroupId      = 10,
            ThemeColor   = new Color { HexCode = "#FF8C00" }
        };

        _userRepoMock
            .Setup(r => r.FindByLoginIdAsync("testuser"))
            .ReturnsAsync(user);

        var request = new LoginRequest { LoginId = "testuser", Password = "wrong" };
        var result  = await _sut.LoginAsync(request);

        Assert.Equal("AUTH_INVALID_CREDENTIALS", result.ErrorCode);
        Assert.Null(result.Response);
    }

    // 3. IsActive == false の場合
    [Fact]
    public async Task LoginAsync_InactiveUser_ReturnsAccountDisabled()
    {
        var user = new User
        {
            Id           = 2,
            LoginId      = "inactiveuser",
            Name         = "Inactive User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("test1234"),
            IsActive     = false,
            GroupId      = 10,
            ThemeColor   = new Color { HexCode = "#FF8C00" }
        };

        _userRepoMock
            .Setup(r => r.FindByLoginIdAsync("inactiveuser"))
            .ReturnsAsync(user);

        var request = new LoginRequest { LoginId = "inactiveuser", Password = "test1234" };
        var result  = await _sut.LoginAsync(request);

        Assert.Equal("AUTH_ACCOUNT_DISABLED", result.ErrorCode);
        Assert.Null(result.Response);
    }

    // 4. GroupId == null の場合
    [Fact]
    public async Task LoginAsync_NullGroupId_ReturnsNoGroup()
    {
        var user = new User
        {
            Id           = 3,
            LoginId      = "nogroupuser",
            Name         = "No Group User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("test1234"),
            IsActive     = true,
            GroupId      = null,
            ThemeColor   = new Color { HexCode = "#FF8C00" }
        };

        _userRepoMock
            .Setup(r => r.FindByLoginIdAsync("nogroupuser"))
            .ReturnsAsync(user);

        var request = new LoginRequest { LoginId = "nogroupuser", Password = "test1234" };
        var result  = await _sut.LoginAsync(request);

        Assert.Equal("AUTH_NO_GROUP", result.ErrorCode);
        Assert.Null(result.Response);
    }

    // 5. 正常ログインの場合
    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokenAndResponse()
    {
        var user = new User
        {
            Id           = 4,
            LoginId      = "validuser",
            Name         = "Valid User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("test1234"),
            IsActive     = true,
            GroupId      = 10,
            ThemeColor   = new Color { HexCode = "#FF8C00" }
        };

        _userRepoMock
            .Setup(r => r.FindByLoginIdAsync("validuser"))
            .ReturnsAsync(user);

        _sessionRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Session>()))
            .Returns(Task.CompletedTask);

        var request = new LoginRequest { LoginId = "validuser", Password = "test1234" };
        var result  = await _sut.LoginAsync(request);

        Assert.NotNull(result.Token);
        _sessionRepoMock.Verify(r => r.CreateAsync(It.IsAny<Session>()), Times.Once);
        Assert.NotNull(result.Response);
    }
}
