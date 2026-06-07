using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class AdminServiceTests
{
    private readonly Mock<IAdminRepository> _adminRepoMock = new();
    private readonly Mock<INoteRepository>  _noteRepoMock  = new();
    private readonly Mock<IMemoRepository>  _memoRepoMock  = new();
    private readonly IAdminService          _sut;

    public AdminServiceTests()
    {
        _sut = new AdminService(_adminRepoMock.Object, _noteRepoMock.Object, _memoRepoMock.Object);
    }

    private static User MakeUser(int id = 1, int? groupId = 1, bool isActive = true) => new()
    {
        Id       = id,
        LoginId  = $"user{id}",
        Name     = $"ユーザー{id}",
        Role     = 2,
        GroupId  = groupId,
        IsActive = isActive,
    };

    // 1. GetUsers: 正常 → ユーザー一覧が返る
    [Fact]
    public async Task GetUsersAsync_ReturnsAllUsers()
    {
        _adminRepoMock.Setup(r => r.GetUsersAsync(false))
                      .ReturnsAsync([MakeUser(1, groupId: 1), MakeUser(2, groupId: null)]);

        var result = await _sut.GetUsersAsync(ungroupedOnly: false);

        Assert.Equal(2, result.Count);
        Assert.Equal(1, result[0].UserId);
        Assert.Equal("user1", result[0].LoginId);
    }

    // 2. GetUsers: ungrouped=true → GroupId が null のみ返る
    [Fact]
    public async Task GetUsersAsync_UngroupedOnly_ReturnsOnlyUngroupedUsers()
    {
        _adminRepoMock.Setup(r => r.GetUsersAsync(true))
                      .ReturnsAsync([MakeUser(2, groupId: null)]);

        var result = await _sut.GetUsersAsync(ungroupedOnly: true);

        Assert.Single(result);
        Assert.Null(result[0].GroupId);
    }

    // 3. CreateUser: loginId 重複 → ADMIN_LOGIN_ID_CONFLICT
    [Fact]
    public async Task CreateUserAsync_LoginIdConflict_ReturnsError()
    {
        _adminRepoMock.Setup(r => r.LoginIdExistsAsync("tanaka")).ReturnsAsync(true);

        var result = await _sut.CreateUserAsync(new AdminUserRequest
        {
            LoginId  = "tanaka",
            Name     = "田中太郎",
            Password = "Pass1234!",
            Role     = 2,
        });

        Assert.Equal("ADMIN_LOGIN_ID_CONFLICT", result.ErrorCode);
        _adminRepoMock.Verify(r => r.CreateUserAsync(It.IsAny<User>()), Times.Never);
    }

    // 4. CreateUser: 正常 → AdminUserResponse が返る（PasswordHash は含まない）
    [Fact]
    public async Task CreateUserAsync_Valid_ReturnsResponseWithoutPasswordHash()
    {
        _adminRepoMock.Setup(r => r.LoginIdExistsAsync("tanaka")).ReturnsAsync(false);
        _adminRepoMock.Setup(r => r.CreateUserAsync(It.IsAny<User>()))
                      .ReturnsAsync((User u) =>
                      {
                          u.Id = 10;
                          return u;
                      });

        var result = await _sut.CreateUserAsync(new AdminUserRequest
        {
            LoginId  = "tanaka",
            Name     = "田中太郎",
            Password = "Pass1234!",
            Role     = 2,
        });

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Equal(10, result.Data.UserId);
        Assert.Equal("tanaka", result.Data.LoginId);
        Assert.Equal("田中太郎", result.Data.Name);
        Assert.Equal(2, result.Data.Role);
    }

    // 5. DeactivateUser: 存在しない → ADMIN_USER_NOT_FOUND
    [Fact]
    public async Task DeactivateUserAsync_UserNotFound_ReturnsError()
    {
        _adminRepoMock.Setup(r => r.GetUserByIdAsync(99)).ReturnsAsync((User?)null);

        var result = await _sut.DeactivateUserAsync(99);

        Assert.Equal("ADMIN_USER_NOT_FOUND", result.ErrorCode);
        _adminRepoMock.Verify(r => r.DeactivateUserAsync(It.IsAny<int>()), Times.Never);
    }

    // 6. DeactivateUser: 正常 → 無効化される
    [Fact]
    public async Task DeactivateUserAsync_Valid_DeactivatesUser()
    {
        _adminRepoMock.Setup(r => r.GetUserByIdAsync(1)).ReturnsAsync(MakeUser(1));
        _adminRepoMock.Setup(r => r.DeactivateUserAsync(1)).Returns(Task.CompletedTask);

        var result = await _sut.DeactivateUserAsync(1);

        Assert.Null(result.ErrorCode);
        _adminRepoMock.Verify(r => r.DeactivateUserAsync(1), Times.Once);
    }

    // 7. CreateGroup: userIds 空 → ADMIN_GROUP_USER_REQUIRED
    [Fact]
    public async Task CreateGroupAsync_EmptyUserIds_ReturnsError()
    {
        var result = await _sut.CreateGroupAsync(new AdminGroupRequest
        {
            Name    = "営業部",
            UserIds = [],
        });

        Assert.Equal("ADMIN_GROUP_USER_REQUIRED", result.ErrorCode);
        _adminRepoMock.Verify(r => r.CreateGroupAsync(It.IsAny<Group>()), Times.Never);
    }

    // 8. CreateGroup: 正常 → グループ・ノート・メモが作成される
    [Fact]
    public async Task CreateGroupAsync_Valid_CreatesGroupNoteAndMemo()
    {
        var group = new Group { Id = 5, Name = "営業部" };
        var note  = new Note  { Id = 10, Name = "重要事項" };

        _adminRepoMock.Setup(r => r.CreateGroupAsync(It.IsAny<Group>())).ReturnsAsync(group);
        _adminRepoMock.Setup(r => r.AssignUsersToGroupAsync(5, It.IsAny<List<int>>()))
                      .Returns(Task.CompletedTask);
        _noteRepoMock.Setup(r => r.CreateAsync(It.IsAny<Note>())).ReturnsAsync(note);
        _memoRepoMock.Setup(r => r.CreateAsync(It.IsAny<Memo>()))
                     .ReturnsAsync((Memo m) => m);

        var result = await _sut.CreateGroupAsync(new AdminGroupRequest
        {
            Name    = "営業部",
            UserIds = [1, 2, 3],
        });

        Assert.Null(result.ErrorCode);

        _adminRepoMock.Verify(r => r.CreateGroupAsync(
            It.Is<Group>(g => g.Name == "営業部")), Times.Once);

        _adminRepoMock.Verify(r => r.AssignUsersToGroupAsync(5, It.Is<List<int>>(
            ids => ids.SequenceEqual(new[] { 1, 2, 3 }))), Times.Once);

        _noteRepoMock.Verify(r => r.CreateAsync(It.Is<Note>(n =>
            n.IsSystem   == true       &&
            n.Name       == "重要事項" &&
            n.Color      == "#9E9E9E"  &&
            n.CreatorId  == 1          &&
            n.GroupId    == 5)), Times.Once);

        _memoRepoMock.Verify(r => r.CreateAsync(It.Is<Memo>(m =>
            m.IsImportant == true &&
            m.NoteId      == 10   &&
            m.CreatorId   == 1)), Times.Once);
    }
}
