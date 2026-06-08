# Admin Account Management & Color Master API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement R-09 admin account management (5 endpoints) and color master API using TDD in ASP.NET Core 10.

**Architecture:** Three-layer (Controller → Service → Repository) following existing GenreController/GenreService patterns. A new `IAdminRepository` consolidates user/group admin operations; `IColorRepository` handles color master reads. `AdminService` encapsulates all business logic tested against mocked repositories.

**Tech Stack:** ASP.NET Core 10, EF Core, xUnit, Moq, BCrypt.Net-Next

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `ScheduleApp.Api/Models/Dtos/AdminUserResponse.cs` | Create | GET /api/admin/users response item |
| `ScheduleApp.Api/Models/Dtos/AdminUserRequest.cs` | Create | POST /api/admin/users request body |
| `ScheduleApp.Api/Models/Dtos/AdminGroupRequest.cs` | Create | POST /api/admin/groups request body |
| `ScheduleApp.Api/Models/Dtos/AdminUserResult.cs` | Create | ServiceResult wrapping AdminUserResponse |
| `ScheduleApp.Api/Models/Dtos/AdminResult.cs` | Create | ServiceResult for void operations |
| `ScheduleApp.Api/Models/Dtos/ColorResponse.cs` | Create | GET /api/colors response item |
| `ScheduleApp.Api/Repositories/IAdminRepository.cs` | Create | Interface for admin user/group DB ops |
| `ScheduleApp.Api/Repositories/AdminRepository.cs` | Create | EF Core implementation of IAdminRepository |
| `ScheduleApp.Api/Repositories/IColorRepository.cs` | Create | Interface for color master reads |
| `ScheduleApp.Api/Repositories/ColorRepository.cs` | Create | EF Core implementation of IColorRepository |
| `ScheduleApp.Api/Services/IAdminService.cs` | Create | Interface for admin business logic |
| `ScheduleApp.Api/Services/AdminService.cs` | Create | Admin business logic implementation |
| `ScheduleApp.Api/Services/IColorService.cs` | Create | Interface for color business logic |
| `ScheduleApp.Api/Services/ColorService.cs` | Create | Color business logic implementation |
| `ScheduleApp.Api/Controllers/AdminController.cs` | Create | HTTP layer for /api/admin/* |
| `ScheduleApp.Api/Controllers/ColorController.cs` | Create | HTTP layer for /api/colors |
| `ScheduleApp.Api/Program.cs` | Modify | Register new DI entries |
| `ScheduleApp.Tests/Services/AdminServiceTests.cs` | Create | xUnit tests for AdminService (8 cases) |

---

## Task 1: DTOs

**Files:**
- Create: `backend/ScheduleApp.Api/Models/Dtos/AdminUserResponse.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/AdminUserRequest.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/AdminGroupRequest.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/AdminUserResult.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/AdminResult.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/ColorResponse.cs`

- [ ] **Step 1: Create AdminUserResponse.cs**

```csharp
namespace ScheduleApp.Api.Models.Dtos;

public class AdminUserResponse
{
    public int    UserId   { get; set; }
    public string LoginId  { get; set; } = string.Empty;
    public string Name     { get; set; } = string.Empty;
    public short  Role     { get; set; }
    public int?   GroupId  { get; set; }
    public bool   IsActive { get; set; }
}
```

- [ ] **Step 2: Create AdminUserRequest.cs**

```csharp
namespace ScheduleApp.Api.Models.Dtos;

public class AdminUserRequest
{
    public string LoginId  { get; set; } = string.Empty;
    public string Name     { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public short  Role     { get; set; }
}
```

- [ ] **Step 3: Create AdminGroupRequest.cs**

```csharp
namespace ScheduleApp.Api.Models.Dtos;

public class AdminGroupRequest
{
    public string    Name    { get; set; } = string.Empty;
    public List<int> UserIds { get; set; } = [];
}
```

- [ ] **Step 4: Create AdminUserResult.cs**

```csharp
namespace ScheduleApp.Api.Models.Dtos;

public record AdminUserResult(AdminUserResponse? Data, string? ErrorCode);
```

- [ ] **Step 5: Create AdminResult.cs**

```csharp
namespace ScheduleApp.Api.Models.Dtos;

public record AdminResult(string? ErrorCode);
```

- [ ] **Step 6: Create ColorResponse.cs**

```csharp
namespace ScheduleApp.Api.Models.Dtos;

public class ColorResponse
{
    public int    ColorId     { get; set; }
    public string HexCode     { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
```

- [ ] **Step 7: Verify build compiles**

```bash
dotnet build /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
```

Expected: Build succeeded with 0 error(s).

---

## Task 2: Repository and Service Interfaces

**Files:**
- Create: `backend/ScheduleApp.Api/Repositories/IAdminRepository.cs`
- Create: `backend/ScheduleApp.Api/Repositories/IColorRepository.cs`
- Create: `backend/ScheduleApp.Api/Services/IAdminService.cs`
- Create: `backend/ScheduleApp.Api/Services/IColorService.cs`

- [ ] **Step 1: Create IAdminRepository.cs**

```csharp
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IAdminRepository
{
    Task<List<User>>  GetUsersAsync(bool ungroupedOnly);
    Task<bool>        LoginIdExistsAsync(string loginId);
    Task<User>        CreateUserAsync(User user);
    Task<User?>       GetUserByIdAsync(int id);
    Task              DeactivateUserAsync(int id);
    Task<Group>       CreateGroupAsync(Group group);
    Task              AssignUsersToGroupAsync(int groupId, List<int> userIds);
}
```

- [ ] **Step 2: Create IColorRepository.cs**

```csharp
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IColorRepository
{
    Task<List<Color>> GetAllAsync();
}
```

- [ ] **Step 3: Create IAdminService.cs**

```csharp
using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IAdminService
{
    Task<List<AdminUserResponse>> GetUsersAsync(bool ungroupedOnly);
    Task<AdminUserResult>         CreateUserAsync(AdminUserRequest request);
    Task<AdminResult>             DeactivateUserAsync(int id);
    Task<AdminResult>             CreateGroupAsync(AdminGroupRequest request);
}
```

- [ ] **Step 4: Create IColorService.cs**

```csharp
using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IColorService
{
    Task<List<ColorResponse>> GetAllAsync();
}
```

- [ ] **Step 5: Verify build**

```bash
dotnet build /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
```

Expected: Build succeeded with 0 error(s).

---

## Task 3: RED — Write AdminServiceTests.cs (all 8 tests)

**Files:**
- Create: `backend/ScheduleApp.Tests/Services/AdminServiceTests.cs`

- [ ] **Step 1: Create AdminServiceTests.cs with all 8 test cases**

```csharp
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
            n.IsSystem   == true        &&
            n.Name       == "重要事項"  &&
            n.Color      == "#9E9E9E"   &&
            n.CreatorId  == 1           &&
            n.GroupId    == 5)), Times.Once);

        _memoRepoMock.Verify(r => r.CreateAsync(It.Is<Memo>(m =>
            m.IsImportant == true &&
            m.NoteId      == 10   &&
            m.CreatorId   == 1)), Times.Once);
    }
}
```

- [ ] **Step 2: Run tests to verify RED (AdminService does not exist yet)**

```bash
dotnet test /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Tests --filter "FullyQualifiedName~AdminServiceTests"
```

Expected: Build FAILS with errors like `The type or namespace name 'AdminService' could not be found`. This confirms the tests are correctly wired before any implementation.

---

## Task 4: GREEN — Implement AdminService.cs

**Files:**
- Create: `backend/ScheduleApp.Api/Services/AdminService.cs`

- [ ] **Step 1: Create AdminService.cs**

```csharp
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class AdminService(
    IAdminRepository adminRepo,
    INoteRepository  noteRepo,
    IMemoRepository  memoRepo) : IAdminService
{
    public async Task<List<AdminUserResponse>> GetUsersAsync(bool ungroupedOnly)
    {
        var users = await adminRepo.GetUsersAsync(ungroupedOnly);
        return users.Select(MapToResponse).ToList();
    }

    public async Task<AdminUserResult> CreateUserAsync(AdminUserRequest request)
    {
        if (await adminRepo.LoginIdExistsAsync(request.LoginId))
            return new AdminUserResult(null, "ADMIN_LOGIN_ID_CONFLICT");

        var user = new User
        {
            LoginId      = request.LoginId,
            Name         = request.Name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = request.Role,
            IsActive     = true,
        };

        var created = await adminRepo.CreateUserAsync(user);
        return new AdminUserResult(MapToResponse(created), null);
    }

    public async Task<AdminResult> DeactivateUserAsync(int id)
    {
        var user = await adminRepo.GetUserByIdAsync(id);
        if (user is null)
            return new AdminResult("ADMIN_USER_NOT_FOUND");

        await adminRepo.DeactivateUserAsync(id);
        return new AdminResult(null);
    }

    public async Task<AdminResult> CreateGroupAsync(AdminGroupRequest request)
    {
        if (request.UserIds.Count == 0)
            return new AdminResult("ADMIN_GROUP_USER_REQUIRED");

        // 1. グループ作成
        var group = await adminRepo.CreateGroupAsync(new Group { Name = request.Name });

        // 2. ユーザーのGroupIdを更新
        await adminRepo.AssignUsersToGroupAsync(group.Id, request.UserIds);

        // 3. 重要事項ノート作成
        var note = await noteRepo.CreateAsync(new Note
        {
            Name      = "重要事項",
            Color     = "#9E9E9E",
            GroupId   = group.Id,
            CreatorId = request.UserIds[0],
            IsSystem  = true,
        });

        // 4. メモ作成
        await memoRepo.CreateAsync(new Memo
        {
            NoteId      = note.Id,
            IsImportant = true,
            CreatorId   = request.UserIds[0],
        });

        return new AdminResult(null);
    }

    private static AdminUserResponse MapToResponse(User u) => new()
    {
        UserId   = u.Id,
        LoginId  = u.LoginId,
        Name     = u.Name,
        Role     = u.Role,
        GroupId  = u.GroupId,
        IsActive = u.IsActive,
    };
}
```

- [ ] **Step 2: Run tests to verify GREEN**

```bash
dotnet test /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Tests --filter "FullyQualifiedName~AdminServiceTests"
```

Expected: `Passed: 8, Failed: 0`. All 8 tests pass.

- [ ] **Step 3: Run ALL tests to confirm no regressions**

```bash
dotnet test /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Tests
```

Expected: All existing tests still pass. No new failures.

---

## Task 5: ColorService (RED → GREEN)

**Files:**
- Create: `backend/ScheduleApp.Api/Services/ColorService.cs`

Note: ColorService has no complex business logic — the only behavior is fetching sorted colors and mapping to DTOs. We write one smoke test to verify the mapping, then implement.

- [ ] **Step 1: Add ColorServiceTests.cs**

```csharp
using Moq;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class ColorServiceTests
{
    private readonly Mock<IColorRepository> _repoMock = new();
    private readonly IColorService          _sut;

    public ColorServiceTests()
    {
        _sut = new ColorService(_repoMock.Object);
    }

    // 1. GetAll: カラー一覧が ColorResponse にマップされて返る
    [Fact]
    public async Task GetAllAsync_ReturnsMappedColors()
    {
        _repoMock.Setup(r => r.GetAllAsync())
                 .ReturnsAsync([
                     new Color { Id = 1, HexCode = "#FF8C00", DisplayName = "ダークオレンジ", SortOrder = 1 },
                     new Color { Id = 2, HexCode = "#4169E1", DisplayName = "ロイヤルブルー",  SortOrder = 2 },
                 ]);

        var result = await _sut.GetAllAsync();

        Assert.Equal(2, result.Count);
        Assert.Equal(1,          result[0].ColorId);
        Assert.Equal("#FF8C00",  result[0].HexCode);
        Assert.Equal("ダークオレンジ", result[0].DisplayName);
    }
}
```

- [ ] **Step 2: Run test to verify RED**

```bash
dotnet test /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Tests --filter "FullyQualifiedName~ColorServiceTests"
```

Expected: Build FAILS — `ColorService` does not exist yet.

- [ ] **Step 3: Create ColorService.cs**

```csharp
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Repositories;

namespace ScheduleApp.Api.Services;

public class ColorService(IColorRepository repo) : IColorService
{
    public async Task<List<ColorResponse>> GetAllAsync()
    {
        var colors = await repo.GetAllAsync();
        return colors.Select(c => new ColorResponse
        {
            ColorId     = c.Id,
            HexCode     = c.HexCode,
            DisplayName = c.DisplayName,
        }).ToList();
    }
}
```

- [ ] **Step 4: Run tests to verify GREEN**

```bash
dotnet test /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Tests --filter "FullyQualifiedName~ColorServiceTests"
```

Expected: `Passed: 1, Failed: 0`.

---

## Task 6: Repositories — AdminRepository and ColorRepository

**Files:**
- Create: `backend/ScheduleApp.Api/Repositories/AdminRepository.cs`
- Create: `backend/ScheduleApp.Api/Repositories/ColorRepository.cs`

- [ ] **Step 1: Create AdminRepository.cs**

```csharp
using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class AdminRepository(AppDbContext db) : IAdminRepository
{
    public Task<List<User>> GetUsersAsync(bool ungroupedOnly)
    {
        var query = db.Users.AsQueryable();
        if (ungroupedOnly)
            query = query.Where(u => u.GroupId == null);
        return query.OrderBy(u => u.Id).ToListAsync();
    }

    public Task<bool> LoginIdExistsAsync(string loginId)
        => db.Users.AnyAsync(u => u.LoginId == loginId);

    public async Task<User> CreateUserAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public Task<User?> GetUserByIdAsync(int id)
        => db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public async Task DeactivateUserAsync(int id)
    {
        await db.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));
    }

    public async Task<Group> CreateGroupAsync(Group group)
    {
        db.Groups.Add(group);
        await db.SaveChangesAsync();
        return group;
    }

    public async Task AssignUsersToGroupAsync(int groupId, List<int> userIds)
    {
        await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.GroupId, groupId));
    }
}
```

- [ ] **Step 2: Create ColorRepository.cs**

```csharp
using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class ColorRepository(AppDbContext db) : IColorRepository
{
    public Task<List<Color>> GetAllAsync()
        => db.Colors.OrderBy(c => c.SortOrder).ToListAsync();
}
```

- [ ] **Step 3: Verify build**

```bash
dotnet build /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
```

Expected: Build succeeded with 0 error(s).

---

## Task 7: Controllers — AdminController and ColorController

**Files:**
- Create: `backend/ScheduleApp.Api/Controllers/AdminController.cs`
- Create: `backend/ScheduleApp.Api/Controllers/ColorController.cs`

- [ ] **Step 1: Create AdminController.cs**

```csharp
using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(IAdminService adminService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["ADMIN_LOGIN_ID_CONFLICT"]  = "このログインIDはすでに使用されています",
        ["ADMIN_USER_NOT_FOUND"]     = "ユーザーが見つかりません",
        ["ADMIN_GROUP_USER_REQUIRED"] = "グループには1人以上のユーザーが必要です",
        ["ADMIN_FORBIDDEN"]          = "この操作を行う権限がありません",
    };

    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    private IActionResult Forbidden403() => StatusCode(StatusCodes.Status403Forbidden,
        new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError("ADMIN_FORBIDDEN", ErrorMessages["ADMIN_FORBIDDEN"]),
        });

    private IActionResult ToErrorResponse(int statusCode, string errorCode)
    {
        var message = ErrorMessages.TryGetValue(errorCode, out var msg) ? msg : errorCode;
        return StatusCode(statusCode, new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError(errorCode, message),
        });
    }

    // GET /api/admin/users?ungrouped=true
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] bool ungrouped = false)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.GetUsersAsync(ungrouped);
        return Ok(new ApiEnvelope<List<AdminUserResponse>> { Success = true, Data = result });
    }

    // POST /api/admin/users
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminUserRequest request)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.CreateUserAsync(request);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status409Conflict, result.ErrorCode);

        return Ok(new ApiEnvelope<AdminUserResponse> { Success = true, Data = result.Data });
    }

    // PATCH /api/admin/users/{id}/deactivate
    [HttpPatch("users/{id:int}/deactivate")]
    public async Task<IActionResult> DeactivateUser(int id)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.DeactivateUserAsync(id);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }

    // POST /api/admin/groups
    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] AdminGroupRequest request)
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();
        if (HttpContext.Items["Role"] is not short role || role != 0)
            return Forbidden403();

        var result = await adminService.CreateGroupAsync(request);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status400BadRequest, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
```

- [ ] **Step 2: Create ColorController.cs**

```csharp
using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/colors")]
public class ColorController(IColorService colorService) : ControllerBase
{
    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    // GET /api/colors
    [HttpGet]
    public async Task<IActionResult> GetColors()
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();

        var result = await colorService.GetAllAsync();
        return Ok(new ApiEnvelope<List<ColorResponse>> { Success = true, Data = result });
    }
}
```

- [ ] **Step 3: Verify build**

```bash
dotnet build /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
```

Expected: Build succeeded with 0 error(s).

---

## Task 8: DI Registration

**Files:**
- Modify: `backend/ScheduleApp.Api/Program.cs`

- [ ] **Step 1: Add DI registrations to Program.cs**

In `Program.cs`, find the last `AddScoped` line (currently `IUserSettingService`) and add after it:

```csharp
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IColorRepository, ColorRepository>();
builder.Services.AddScoped<IColorService, ColorService>();
```

- [ ] **Step 2: Verify final build**

```bash
dotnet build /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
```

Expected: Build succeeded with 0 error(s).

---

## Task 9: Final Verification

- [ ] **Step 1: Run all tests**

```bash
dotnet test /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Tests
```

Expected: All tests pass. Output includes `AdminServiceTests` (8) and `ColorServiceTests` (1) plus all pre-existing tests. Zero failures.

- [ ] **Step 2: Full solution build check**

```bash
dotnet build /Users/yoshizawayuki/ScheduleApp/backend
```

Expected: Build succeeded, 0 error(s), 0 warning(s).

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|-------------|------|
| GET /api/admin/users with `?ungrouped` | Task 7 (Controller) + AdminService.GetUsersAsync |
| POST /api/admin/users | Task 7 + AdminService.CreateUserAsync |
| PATCH /api/admin/users/{id}/deactivate | Task 7 + AdminService.DeactivateUserAsync |
| POST /api/admin/groups (with note+memo) | Task 7 + AdminService.CreateGroupAsync |
| GET /api/colors | Task 7 (ColorController) + ColorService.GetAllAsync |
| BCrypt password hashing | Task 4 AdminService.CreateUserAsync |
| role=0 guard on admin routes | Task 7 AdminController |
| login-only guard on /api/colors | Task 7 ColorController |
| ADMIN_LOGIN_ID_CONFLICT | Test 3 + implementation |
| ADMIN_USER_NOT_FOUND | Test 5 + implementation |
| ADMIN_GROUP_USER_REQUIRED | Test 7 + implementation |
| Note: is_system=true, name="重要事項", color="#9E9E9E", creator=userIds[0] | Test 8 verifies |
| Memo: is_important=true, note_id=created note, creator=userIds[0] | Test 8 verifies |
| GroupId overwrites existing group (AssignUsersToGroupAsync updates all) | AdminRepository |
| IUserRepository, INoteRepository, IMemoRepository untouched | Plan uses them as-is |
| IAdminRepository new interface (not modifying existing) | Task 2 |

All requirements covered. No gaps found.

### Type Consistency Check
- `AdminUserResult(AdminUserResponse? Data, string? ErrorCode)` — used consistently in Tasks 2, 4, 7
- `AdminResult(string? ErrorCode)` — used consistently in Tasks 2, 4, 7
- `IAdminRepository.AssignUsersToGroupAsync(int groupId, List<int> userIds)` — matches Task 3 test mock and Task 6 implementation
- `INoteRepository.CreateAsync(Note)` / `IMemoRepository.CreateAsync(Memo)` — match existing interface signatures in `INoteRepository.cs` and `IMemoRepository.cs`
- `ColorResponse.ColorId` / `.HexCode` / `.DisplayName` — consistent across Tasks 1, 5, 7
