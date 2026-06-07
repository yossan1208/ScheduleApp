# Schedules API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スケジュールのCRUD APIを実装する（GET一覧・POST作成・GET単件・PUT更新・DELETE削除・GET直近5件）

**Architecture:** IScheduleRepository → ScheduleService → ScheduleController の3層構造。SessionMiddlewareで `HttpContext.Items` にセットされた userId/groupId をコントローラーから受け取り、アクセス制御はサービス層で行う。TDD: ScheduleService の失敗テストを書いてから実装する。

**Tech Stack:** ASP.NET Core 10 / EF Core 10 / SQL Server 2022 / xUnit + Moq

---

## File Map

### 変更
- `backend/ScheduleApp.Api/Models/Entities/Schedule.cs` — 型修正・フィールド追加・ナビゲーションプロパティ追加
- `backend/ScheduleApp.Api/Models/Entities/Genre.cs` — 型修正・フィールド追加・ナビゲーションプロパティ追加
- `backend/ScheduleApp.Api/Data/AppDbContext.cs` — Genre・Schedule の modelBuilder ブロック更新
- `backend/ScheduleApp.Api/Program.cs` — IScheduleRepository/IScheduleService の DI 登録追加

### 新規作成
- `backend/ScheduleApp.Api/Models/Dtos/ScheduleGenreDto.cs` — レスポンスに埋め込むジャンル情報
- `backend/ScheduleApp.Api/Models/Dtos/ScheduleResponse.cs` — スケジュールレスポンスDTO
- `backend/ScheduleApp.Api/Models/Dtos/ScheduleRequest.cs` — スケジュール作成・更新リクエストDTO
- `backend/ScheduleApp.Api/Models/Dtos/ScheduleResult.cs` — サービス戻り値（LoginResult と同パターン）
- `backend/ScheduleApp.Api/Repositories/IScheduleRepository.cs`
- `backend/ScheduleApp.Api/Repositories/ScheduleRepository.cs`
- `backend/ScheduleApp.Api/Services/IScheduleService.cs`
- `backend/ScheduleApp.Api/Services/ScheduleService.cs`
- `backend/ScheduleApp.Api/Controllers/ScheduleController.cs`
- `backend/ScheduleApp.Tests/Services/ScheduleServiceTests.cs`
- EF Core マイグレーションファイル（自動生成）

---

### Task 1: エンティティ更新 + AppDbContext 更新

**Files:**
- Modify: `backend/ScheduleApp.Api/Models/Entities/Schedule.cs`
- Modify: `backend/ScheduleApp.Api/Models/Entities/Genre.cs`
- Modify: `backend/ScheduleApp.Api/Data/AppDbContext.cs`

- [ ] **Step 1: Schedule.cs を上書きする**

```csharp
// backend/ScheduleApp.Api/Models/Entities/Schedule.cs
namespace ScheduleApp.Api.Models.Entities;

public class Schedule
{
    public int       Id               { get; set; }
    public int       CreatorId        { get; set; }
    public int       GroupId          { get; set; }
    public int       GenreId          { get; set; }
    public DateOnly  Date             { get; set; }
    public TimeOnly? StartTime        { get; set; }
    public TimeOnly? EndTime          { get; set; }
    public string    Title            { get; set; } = string.Empty;
    public string?   Detail           { get; set; }
    public string    Visibility       { get; set; } = string.Empty;
    public TimeOnly  NotificationTime { get; set; }
    public bool      IsDeleted        { get; set; }
    public DateTime? DeletedAt        { get; set; }
    public DateTime  CreatedAt        { get; set; }

    public Genre?    Genre            { get; set; }
}
```

- [ ] **Step 2: Genre.cs を上書きする**

```csharp
// backend/ScheduleApp.Api/Models/Entities/Genre.cs
namespace ScheduleApp.Api.Models.Entities;

public class Genre
{
    public int       Id                       { get; set; }
    public string    Name                     { get; set; } = string.Empty;
    public int       ColorId                  { get; set; }
    public TimeOnly? DefaultNotificationTime  { get; set; }
    public int       GroupId                  { get; set; }
    public bool      IsActive                 { get; set; } = true;
    public bool      IsDeleted                { get; set; }
    public DateTime? DeletedAt                { get; set; }

    public Color?    Color                    { get; set; }
}
```

- [ ] **Step 3: AppDbContext.cs の Genre と Schedule の modelBuilder ブロックを置き換える**

既存の以下2ブロックを：
```csharp
modelBuilder.Entity<Genre>(e => e.ToTable("genres"));
modelBuilder.Entity<Schedule>(e => e.ToTable("schedules"));
```

以下で置き換える：
```csharp
modelBuilder.Entity<Genre>(e =>
{
    e.ToTable("genres");
    e.Property(x => x.IsActive).HasDefaultValue(true);
    e.Property(x => x.IsDeleted).HasDefaultValue(false);
    e.HasOne(x => x.Color)
     .WithMany()
     .HasForeignKey(x => x.ColorId)
     .OnDelete(DeleteBehavior.Restrict);
});

modelBuilder.Entity<Schedule>(e =>
{
    e.ToTable("schedules");
    e.Property(x => x.IsDeleted).HasDefaultValue(false);
    e.HasOne(x => x.Genre)
     .WithMany()
     .HasForeignKey(x => x.GenreId)
     .OnDelete(DeleteBehavior.Restrict);
});
```

- [ ] **Step 4: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend
dotnet build ScheduleApp.Api
```

Expected: `Build succeeded. 0 Error(s)`

---

### Task 2: EF Core マイグレーション生成・適用

**Files:**
- Create: `backend/ScheduleApp.Api/Migrations/YYYYMMDDHHMMSS_UpdateSchedulesAndGenres.cs`（自動生成）

- [ ] **Step 1: マイグレーション生成**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
dotnet ef migrations add UpdateSchedulesAndGenres
```

Expected: `Build succeeded.` + `Done.`

- [ ] **Step 2: 生成されたマイグレーションを確認**

`Migrations/YYYYMMDDHHMMSS_UpdateSchedulesAndGenres.cs` を開いて以下が含まれることを確認する：
- `genres` テーブルへの `DefaultNotificationTime`（`time` 型）追加、`DefaultNotificationMinutes`（`int` 型）削除
- `genres` テーブルへの `IsActive`（`bit`）・`IsDeleted`（`bit`）・`DeletedAt`（`datetime2`）追加
- `schedules` テーブルへの `NotificationTime`（`time` 型）追加、`NotificationMinutes`（`int` 型）削除
- `schedules` テーブルへの `IsDeleted`・`DeletedAt`・`CreatedAt` 追加
- `schedules.GenreId`、`schedules.Date`、`schedules.Title`、`schedules.Visibility` の NOT NULL 変更

- [ ] **Step 3: マイグレーション適用**

```bash
dotnet ef database update
```

Expected: `Done.`

---

### Task 3: シードデータ投入（#9E9E9E カラー + 「その他」ジャンル）

**※ Docker コンテナ名 `mssql`、パスワード `YourStrong!Passw0rd` はプロジェクト既存設定**

- [ ] **Step 1: #9E9E9E カラーを INSERT**

```bash
docker exec -it mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -d ScheduleAppDb \
  -Q "INSERT INTO colors (hex_code, display_name, sort_order) VALUES ('#9E9E9E', N'システム予約（グレー）', 999)"
```

- [ ] **Step 2: INSERT した color の ID を確認**

```bash
docker exec -it mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -d ScheduleAppDb \
  -Q "SELECT id, hex_code, display_name FROM colors ORDER BY id"
```

`#9E9E9E` の `id` をメモする（以降 `{GREY_COLOR_ID}` と表記）。

- [ ] **Step 3: 「その他」ジャンルを genres テーブルに INSERT（group_id=1）**

`{GREY_COLOR_ID}` を Step 2 で確認した数値に置き換えて実行。

```bash
docker exec -it mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -d ScheduleAppDb \
  -Q "INSERT INTO genres (name, color_id, group_id, is_active, is_deleted) VALUES (N'その他', {GREY_COLOR_ID}, 1, 1, 0)"
```

- [ ] **Step 4: 確認**

```bash
docker exec -it mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -d ScheduleAppDb \
  -Q "SELECT g.id, g.name, c.hex_code FROM genres g JOIN colors c ON g.color_id = c.id WHERE g.group_id = 1"
```

Expected: `その他` が `#9E9E9E` で表示される。

- [ ] **Step 5: コミット**

```bash
cd /Users/yoshizawayuki/ScheduleApp
git add backend/ScheduleApp.Api/Models/Entities/Schedule.cs \
        backend/ScheduleApp.Api/Models/Entities/Genre.cs \
        backend/ScheduleApp.Api/Data/AppDbContext.cs \
        backend/ScheduleApp.Api/Migrations/
git commit -m "feat: update Schedule/Genre entities and apply UpdateSchedulesAndGenres migration"
```

---

### Task 4: DTOs 作成

**Files:**
- Create: `backend/ScheduleApp.Api/Models/Dtos/ScheduleGenreDto.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/ScheduleResponse.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/ScheduleRequest.cs`
- Create: `backend/ScheduleApp.Api/Models/Dtos/ScheduleResult.cs`

- [ ] **Step 1: ScheduleGenreDto.cs を作成**

```csharp
// backend/ScheduleApp.Api/Models/Dtos/ScheduleGenreDto.cs
namespace ScheduleApp.Api.Models.Dtos;

public class ScheduleGenreDto
{
    public int    Id       { get; set; }
    public string Name     { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
}
```

- [ ] **Step 2: ScheduleResponse.cs を作成**

```csharp
// backend/ScheduleApp.Api/Models/Dtos/ScheduleResponse.cs
namespace ScheduleApp.Api.Models.Dtos;

public class ScheduleResponse
{
    public int               Id               { get; set; }
    public int               CreatorId        { get; set; }
    public string            Date             { get; set; } = string.Empty;
    public string?           StartTime        { get; set; }
    public string?           EndTime          { get; set; }
    public string            Title            { get; set; } = string.Empty;
    public string?           Detail           { get; set; }
    public string            Visibility       { get; set; } = string.Empty;
    public string            NotificationTime { get; set; } = string.Empty;
    public ScheduleGenreDto? Genre            { get; set; }
}
```

- [ ] **Step 3: ScheduleRequest.cs を作成**

```csharp
// backend/ScheduleApp.Api/Models/Dtos/ScheduleRequest.cs
namespace ScheduleApp.Api.Models.Dtos;

public class ScheduleRequest
{
    public string  Date             { get; set; } = string.Empty;
    public string  Title            { get; set; } = string.Empty;
    public string  Visibility       { get; set; } = string.Empty;
    public int     GenreId          { get; set; }
    public string? StartTime        { get; set; }
    public string? EndTime          { get; set; }
    public string  NotificationTime { get; set; } = string.Empty;
    public string? Detail           { get; set; }
}
```

- [ ] **Step 4: ScheduleResult.cs を作成（LoginResult と同パターン）**

```csharp
// backend/ScheduleApp.Api/Models/Dtos/ScheduleResult.cs
namespace ScheduleApp.Api.Models.Dtos;

public record ScheduleResult(ScheduleResponse? Data, string? ErrorCode);
```

- [ ] **Step 5: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend
dotnet build ScheduleApp.Api
```

Expected: `Build succeeded. 0 Error(s)`

---

### Task 5: IScheduleRepository + ScheduleRepository 作成

**Files:**
- Create: `backend/ScheduleApp.Api/Repositories/IScheduleRepository.cs`
- Create: `backend/ScheduleApp.Api/Repositories/ScheduleRepository.cs`

- [ ] **Step 1: IScheduleRepository.cs を作成**

```csharp
// backend/ScheduleApp.Api/Repositories/IScheduleRepository.cs
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public interface IScheduleRepository
{
    Task<List<Schedule>> GetByRangeAsync(int userId, int groupId, DateOnly from, DateOnly to);
    Task<Schedule?> GetByIdAsync(int id);
    Task<Schedule> CreateAsync(Schedule schedule);
    Task UpdateAsync(Schedule schedule);
    Task SoftDeleteAsync(int id, DateTime deletedAt);
    Task<List<Schedule>> GetRecentByUserAsync(int userId, int count = 5);
}
```

- [ ] **Step 2: ScheduleRepository.cs を作成**

```csharp
// backend/ScheduleApp.Api/Repositories/ScheduleRepository.cs
using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Repositories;

public class ScheduleRepository(AppDbContext db) : IScheduleRepository
{
    public Task<List<Schedule>> GetByRangeAsync(int userId, int groupId, DateOnly from, DateOnly to)
        => db.Schedules
             .Include(s => s.Genre)
               .ThenInclude(g => g!.Color)
             .Where(s => !s.IsDeleted
                      && s.Date >= from
                      && s.Date <= to
                      && ((s.Visibility == "private" && s.CreatorId == userId)
                          || (s.Visibility == "group"  && s.GroupId  == groupId)))
             .ToListAsync();

    public Task<Schedule?> GetByIdAsync(int id)
        => db.Schedules
             .Include(s => s.Genre)
               .ThenInclude(g => g!.Color)
             .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

    public async Task<Schedule> CreateAsync(Schedule schedule)
    {
        db.Schedules.Add(schedule);
        await db.SaveChangesAsync();
        return schedule;
    }

    public async Task UpdateAsync(Schedule schedule)
    {
        db.Schedules.Update(schedule);
        await db.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(int id, DateTime deletedAt)
    {
        var schedule = await db.Schedules.FindAsync(id);
        if (schedule is null) return;
        schedule.IsDeleted = true;
        schedule.DeletedAt = deletedAt;
        await db.SaveChangesAsync();
    }

    public Task<List<Schedule>> GetRecentByUserAsync(int userId, int count = 5)
        => db.Schedules
             .Include(s => s.Genre)
               .ThenInclude(g => g!.Color)
             .Where(s => !s.IsDeleted && s.CreatorId == userId)
             .OrderByDescending(s => s.CreatedAt)
             .Take(count)
             .ToListAsync();
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend
dotnet build ScheduleApp.Api
```

Expected: `Build succeeded. 0 Error(s)`

---

### Task 6: IScheduleService + 失敗テスト作成（TDD Step 1 — Red）

**Files:**
- Create: `backend/ScheduleApp.Api/Services/IScheduleService.cs`
- Create: `backend/ScheduleApp.Tests/Services/ScheduleServiceTests.cs`

- [ ] **Step 1: IScheduleService.cs を作成**

```csharp
// backend/ScheduleApp.Api/Services/IScheduleService.cs
using ScheduleApp.Api.Models.Dtos;

namespace ScheduleApp.Api.Services;

public interface IScheduleService
{
    Task<List<ScheduleResponse>> GetSchedulesAsync(int userId, int groupId, DateOnly from, DateOnly to);
    Task<ScheduleResult> GetByIdAsync(int id, int userId, int groupId);
    Task<ScheduleResult> CreateAsync(ScheduleRequest request, int userId, int groupId);
    Task<ScheduleResult> UpdateAsync(int id, ScheduleRequest request, int userId);
    Task<ScheduleResult> DeleteAsync(int id, int userId);
    Task<List<ScheduleResponse>> GetRecentAsync(int userId);
}
```

- [ ] **Step 2: ScheduleServiceTests.cs を作成（8件の失敗テスト）**

```csharp
// backend/ScheduleApp.Tests/Services/ScheduleServiceTests.cs
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
```

- [ ] **Step 3: テストが失敗することを確認（ScheduleService が未実装のためビルドエラーになる）**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend
dotnet test ScheduleApp.Tests --filter "FullyQualifiedName~ScheduleServiceTests"
```

Expected: `Build FAILED` で `CS0246: The type or namespace name 'ScheduleService' could not be found` のようなエラー。

---

### Task 7: ScheduleService 実装（TDD Step 2 — Green）

**Files:**
- Create: `backend/ScheduleApp.Api/Services/ScheduleService.cs`

- [ ] **Step 1: ScheduleService.cs を作成**

```csharp
// backend/ScheduleApp.Api/Services/ScheduleService.cs
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;

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
        var schedule = new Schedule
        {
            CreatorId        = userId,
            GroupId          = groupId,
            GenreId          = request.GenreId,
            Date             = DateOnly.Parse(request.Date),
            Title            = request.Title,
            Detail           = request.Detail,
            Visibility       = request.Visibility,
            StartTime        = request.StartTime is null ? null : TimeOnly.Parse(request.StartTime),
            EndTime          = request.EndTime   is null ? null : TimeOnly.Parse(request.EndTime),
            NotificationTime = TimeOnly.Parse(request.NotificationTime),
            CreatedAt        = DateTime.UtcNow,
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

        schedule.GenreId          = request.GenreId;
        schedule.Date             = DateOnly.Parse(request.Date);
        schedule.Title            = request.Title;
        schedule.Detail           = request.Detail;
        schedule.Visibility       = request.Visibility;
        schedule.StartTime        = request.StartTime is null ? null : TimeOnly.Parse(request.StartTime);
        schedule.EndTime          = request.EndTime   is null ? null : TimeOnly.Parse(request.EndTime);
        schedule.NotificationTime = TimeOnly.Parse(request.NotificationTime);

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

        await repo.SoftDeleteAsync(id, DateTime.UtcNow);
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
```

- [ ] **Step 2: テストが全て通ることを確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend
dotnet test ScheduleApp.Tests --filter "FullyQualifiedName~ScheduleServiceTests" -v normal
```

Expected:
```
Passed!  - Failed: 0, Passed: 8, Skipped: 0
```

- [ ] **Step 3: 全テスト確認（AuthServiceTests も含めて全て Pass）**

```bash
dotnet test ScheduleApp.Tests
```

Expected: 全テスト Pass（Failed: 0）

- [ ] **Step 4: コミット**

```bash
cd /Users/yoshizawayuki/ScheduleApp
git add backend/ScheduleApp.Api/Models/Dtos/ \
        backend/ScheduleApp.Api/Repositories/ \
        backend/ScheduleApp.Api/Services/IScheduleService.cs \
        backend/ScheduleApp.Api/Services/ScheduleService.cs \
        backend/ScheduleApp.Tests/Services/ScheduleServiceTests.cs
git commit -m "feat: add ScheduleService with CRUD logic and TDD tests"
```

---

### Task 8: ScheduleController 作成 + DI 登録

**Files:**
- Create: `backend/ScheduleApp.Api/Controllers/ScheduleController.cs`
- Modify: `backend/ScheduleApp.Api/Program.cs`

- [ ] **Step 1: ScheduleController.cs を作成**

`SessionMiddleware` の挙動: JWTクッキーなし → `Items["UserId"]` 未セットで `next()` を呼ぶ。JWTありで無効 → 401を返す。コントローラーはクッキーなし状態（Items 未セット）も 401 で返す必要がある。

```csharp
// backend/ScheduleApp.Api/Controllers/ScheduleController.cs
using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/schedules")]
public class ScheduleController(IScheduleService scheduleService) : ControllerBase
{
    private static readonly Dictionary<string, string> ErrorMessages = new()
    {
        ["SCHEDULE_NOT_FOUND"] = "スケジュールが見つかりません",
        ["SCHEDULE_FORBIDDEN"] = "この操作を行う権限がありません",
        ["SCHEDULE_INVALID"]   = "入力内容が正しくありません",
    };

    private IActionResult ToErrorResponse(int statusCode, string errorCode)
    {
        var message = ErrorMessages.TryGetValue(errorCode, out var msg) ? msg : errorCode;
        return StatusCode(statusCode, new ApiEnvelope<object>
        {
            Success = false,
            Error   = new ApiError(errorCode, message),
        });
    }

    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    // GET /api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD
    [HttpGet]
    public async Task<IActionResult> GetSchedules([FromQuery] string? from, [FromQuery] string? to)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        if (!DateOnly.TryParse(from, out var fromDate) || !DateOnly.TryParse(to, out var toDate))
            return BadRequest(new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError("SCHEDULE_INVALID", "from/to は YYYY-MM-DD 形式で指定してください"),
            });

        var results = await scheduleService.GetSchedulesAsync(userId, groupId, fromDate, toDate);
        return Ok(new ApiEnvelope<List<ScheduleResponse>> { Success = true, Data = results });
    }

    // GET /api/schedules/recent  ← /{id} より先に定義して "recent" が id として解釈されるのを防ぐ
    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent()
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var results = await scheduleService.GetRecentAsync(userId);
        return Ok(new ApiEnvelope<List<ScheduleResponse>> { Success = true, Data = results });
    }

    // GET /api/schedules/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        var result = await scheduleService.GetByIdAsync(id, userId, groupId);
        if (result.ErrorCode is not null)
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        return Ok(new ApiEnvelope<ScheduleResponse> { Success = true, Data = result.Data });
    }

    // POST /api/schedules
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ScheduleRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();
        if (HttpContext.Items["GroupId"] is not int groupId)
            return Unauthorized401();

        if (string.IsNullOrWhiteSpace(request.Date)
            || string.IsNullOrWhiteSpace(request.Title)
            || string.IsNullOrWhiteSpace(request.Visibility)
            || request.GenreId == 0
            || string.IsNullOrWhiteSpace(request.NotificationTime))
        {
            return BadRequest(new ApiEnvelope<object>
            {
                Success = false,
                Error   = new ApiError("SCHEDULE_INVALID", "必須項目が不足しています"),
            });
        }

        var result = await scheduleService.CreateAsync(request, userId, groupId);
        return Ok(new ApiEnvelope<ScheduleResponse> { Success = true, Data = result.Data });
    }

    // PUT /api/schedules/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ScheduleRequest request)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await scheduleService.UpdateAsync(id, request, userId);

        if (result.ErrorCode == "SCHEDULE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        if (result.ErrorCode == "SCHEDULE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        return Ok(new ApiEnvelope<ScheduleResponse> { Success = true, Data = result.Data });
    }

    // DELETE /api/schedules/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (HttpContext.Items["UserId"] is not int userId)
            return Unauthorized401();

        var result = await scheduleService.DeleteAsync(id, userId);

        if (result.ErrorCode == "SCHEDULE_NOT_FOUND")
            return ToErrorResponse(StatusCodes.Status404NotFound, result.ErrorCode);

        if (result.ErrorCode == "SCHEDULE_FORBIDDEN")
            return ToErrorResponse(StatusCodes.Status403Forbidden, result.ErrorCode);

        return Ok(new ApiEnvelope<object> { Success = true });
    }
}
```

- [ ] **Step 2: Program.cs に DI 登録を追加**

`AddScoped<IAuthService, AuthService>()` の行の直後に追加：

```csharp
builder.Services.AddScoped<IScheduleRepository, ScheduleRepository>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
```

また、`using` に以下を追加（なければ）：
```csharp
using ScheduleApp.Api.Repositories;
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend
dotnet build ScheduleApp.Api
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 4: コミット**

```bash
cd /Users/yoshizawayuki/ScheduleApp
git add backend/ScheduleApp.Api/Controllers/ScheduleController.cs \
        backend/ScheduleApp.Api/Program.cs
git commit -m "feat: add ScheduleController with 6 endpoints and register DI"
```

---

### Task 9: E2Eテスト（curl で動作確認）

- [ ] **Step 1: サーバーを起動**

```bash
cd /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
dotnet run
```

- [ ] **Step 2: ログインしてJWTクッキーを取得**

admin ユーザーの loginId/password はプロジェクト既存データを使用。

```bash
curl -c /tmp/schedule_cookies.txt -s -X POST http://localhost:5296/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"admin","password":"password123"}' | python3 -m json.tool
```

Expected: `"success": true` + `"userId"` が含まれる。

- [ ] **Step 3: スケジュール作成（POST /api/schedules）**

`genreId` は Task 3 Step 4 で確認した「その他」ジャンルの id を使用。

```bash
curl -b /tmp/schedule_cookies.txt -c /tmp/schedule_cookies.txt \
  -s -X POST http://localhost:5296/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-15",
    "title": "E2Eテストスケジュール",
    "visibility": "group",
    "genreId": 1,
    "startTime": "09:00",
    "endTime": "10:00",
    "notificationTime": "08:45"
  }' | python3 -m json.tool
```

Expected: `"success": true` + `"id"` が含まれる。作成したスケジュールの `id` をメモ（以降 `{SCHEDULE_ID}`）。

- [ ] **Step 4: スケジュール一覧取得（GET /api/schedules）**

```bash
curl -b /tmp/schedule_cookies.txt \
  -s "http://localhost:5296/api/schedules?from=2026-06-01&to=2026-06-30" | python3 -m json.tool
```

Expected: `"success": true` + `data` 配列に作成したスケジュールが含まれる。

- [ ] **Step 5: 単件取得（GET /api/schedules/{id}）**

```bash
curl -b /tmp/schedule_cookies.txt \
  -s "http://localhost:5296/api/schedules/{SCHEDULE_ID}" | python3 -m json.tool
```

Expected: `"success": true` + `"title": "E2Eテストスケジュール"` が含まれる。

- [ ] **Step 6: 直近5件取得（GET /api/schedules/recent）**

```bash
curl -b /tmp/schedule_cookies.txt \
  -s "http://localhost:5296/api/schedules/recent" | python3 -m json.tool
```

Expected: `"success": true` + `data` 配列に作成したスケジュールが含まれる。

- [ ] **Step 7: 更新（PUT /api/schedules/{id}）**

```bash
curl -b /tmp/schedule_cookies.txt -c /tmp/schedule_cookies.txt \
  -s -X PUT "http://localhost:5296/api/schedules/{SCHEDULE_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-15",
    "title": "更新後タイトル",
    "visibility": "private",
    "genreId": 1,
    "startTime": "10:00",
    "endTime": "11:00",
    "notificationTime": "09:45"
  }' | python3 -m json.tool
```

Expected: `"success": true` + `"title": "更新後タイトル"` が含まれる。

- [ ] **Step 8: 削除（DELETE /api/schedules/{id}）**

```bash
curl -b /tmp/schedule_cookies.txt -c /tmp/schedule_cookies.txt \
  -s -X DELETE "http://localhost:5296/api/schedules/{SCHEDULE_ID}" | python3 -m json.tool
```

Expected: `"success": true`

削除後に単件取得して 404 が返ることも確認：

```bash
curl -b /tmp/schedule_cookies.txt \
  -s "http://localhost:5296/api/schedules/{SCHEDULE_ID}" | python3 -m json.tool
```

Expected: `"success": false` + `"code": "SCHEDULE_NOT_FOUND"`

- [ ] **Step 9: 最終コミット**

```bash
cd /Users/yoshizawayuki/ScheduleApp
git status  # 追加変更があれば確認
git commit -m "feat: implement schedules API (R-02/R-04/R-05)"
```

全変更が前の各タスクでコミット済みであれば `nothing to commit` となる。

---

## 注意事項

- **SessionMiddleware の挙動**: JWTクッキーなし → Items["UserId"] 未セットで next() 呼び出し。コントローラーで `is not int userId` パターンチェックして 401 返却。
- **UpdateAsync のジャンル**: 更新後レスポンスは更新前にロードされた Genre ナビゲーションを使う（genreId 変更時は若干 stale だがクライアントは GET で再取得可能）。
- **POST /api/admin/groups 追加時**: R-09 実装時にグループ作成と同時に「その他」ジャンルを INSERT する処理を追加すること。
- **その他ジャンルの特定方法**: フロントは `GET /api/genres`（別途実装）で一覧取得後 `name === "その他"` のジャンルを初期選択する。
