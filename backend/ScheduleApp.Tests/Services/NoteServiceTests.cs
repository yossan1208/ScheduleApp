using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class NoteServiceTests
{
    private readonly Mock<INoteRepository> _repoMock = new();
    private readonly INoteService          _sut;

    public NoteServiceTests()
    {
        _sut = new NoteService(_repoMock.Object);
    }

    private static Note MakeNote(
        int id = 1, bool isDeleted = false, bool isArchived = false, bool isSystem = false) => new()
    {
        Id         = id,
        Name       = "テストノート",
        Color      = "#FF5733",
        GroupId    = 1,
        CreatorId  = 1,
        CreatedAt  = DateTime.UtcNow,
        IsArchived = isArchived,
        IsSystem   = isSystem,
        IsDeleted  = isDeleted,
    };

    // 1. GetNotes: is_deleted は除外される
    [Fact]
    public async Task GetNotesAsync_ExcludesDeletedNotes()
    {
        _repoMock.Setup(r => r.GetByGroupIdAsync(1, false))
                 .ReturnsAsync([MakeNote(id: 1), MakeNote(id: 2, isDeleted: true)]);

        var result = await _sut.GetNotesAsync(1, archived: false);

        Assert.Single(result);
        Assert.Equal(1, result[0].Id);
    }

    // 2. GetNotes: archived=true でアーカイブのみ返す
    [Fact]
    public async Task GetNotesAsync_ArchivedTrue_ReturnsOnlyArchived()
    {
        _repoMock.Setup(r => r.GetByGroupIdAsync(1, true))
                 .ReturnsAsync([MakeNote(id: 3, isArchived: true)]);

        var result = await _sut.GetNotesAsync(1, archived: true);

        Assert.Single(result);
        Assert.True(result[0].IsArchived);
    }

    // 3. Create: 正常 → NoteResponse を返す
    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsNoteResponse()
    {
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Note>()))
                 .ReturnsAsync((Note n) => { n.Id = 10; return n; });

        var result = await _sut.CreateAsync(
            new NoteRequest { Name = "新ノート", Color = "#FF5733" }, groupId: 1, userId: 2);

        Assert.Null(result.ErrorCode);
        Assert.NotNull(result.Data);
        Assert.Equal(10, result.Data.Id);
        Assert.Equal(2, result.Data.CreatorId);
    }

    // 4. Archive: is_system=true → NOTE_FORBIDDEN
    [Fact]
    public async Task ArchiveAsync_SystemNote_ReturnsForbidden()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeNote(isSystem: true));

        var result = await _sut.ArchiveAsync(1, groupId: 1);

        Assert.Equal("NOTE_FORBIDDEN", result.ErrorCode);
        _repoMock.Verify(r => r.ArchiveAsync(It.IsAny<int>()), Times.Never);
    }

    // 5. Archive: 存在しない → NOTE_NOT_FOUND
    [Fact]
    public async Task ArchiveAsync_NotFound_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(99, 1)).ReturnsAsync((Note?)null);

        var result = await _sut.ArchiveAsync(99, groupId: 1);

        Assert.Equal("NOTE_NOT_FOUND", result.ErrorCode);
    }

    // 6. Delete: is_system=true → NOTE_FORBIDDEN
    [Fact]
    public async Task DeleteAsync_SystemNote_ReturnsForbidden()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1))
                 .ReturnsAsync(MakeNote(isSystem: true, isArchived: true));

        var result = await _sut.DeleteAsync(1, groupId: 1);

        Assert.Equal("NOTE_FORBIDDEN", result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(It.IsAny<int>()), Times.Never);
    }

    // 7. Delete: is_archived=false → NOTE_NOT_ARCHIVED
    [Fact]
    public async Task DeleteAsync_NotArchived_ReturnsNotArchived()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeNote(isArchived: false));

        var result = await _sut.DeleteAsync(1, groupId: 1);

        Assert.Equal("NOTE_NOT_ARCHIVED", result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(It.IsAny<int>()), Times.Never);
    }

    // 8. Delete: 正常 → 論理削除される
    [Fact]
    public async Task DeleteAsync_ValidArchivedNote_SoftDeletes()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeNote(isArchived: true));
        _repoMock.Setup(r => r.SoftDeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _sut.DeleteAsync(1, groupId: 1);

        Assert.Null(result.ErrorCode);
        _repoMock.Verify(r => r.SoftDeleteAsync(1), Times.Once);
    }
}
