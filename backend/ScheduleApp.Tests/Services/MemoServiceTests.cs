using Moq;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Tests.Services;

public class MemoServiceTests
{
    private readonly Mock<INoteRepository> _noteRepoMock = new();
    private readonly Mock<IMemoRepository> _memoRepoMock = new();
    private readonly IMemoService          _sut;

    public MemoServiceTests()
    {
        _sut = new MemoService(_noteRepoMock.Object, _memoRepoMock.Object);
    }

    private static Note MakeNote(bool isSystem = false) => new()
    {
        Id        = 1,
        GroupId   = 1,
        IsSystem  = isSystem,
        IsDeleted = false,
        Name      = "ノート",
        Color     = "#FF0000",
        CreatorId = 1,
        CreatedAt = DateTime.UtcNow,
    };

    private static Memo MakeMemo(int id = 1, bool isImportant = false) => new()
    {
        Id          = id,
        NoteId      = 1,
        IsImportant = isImportant,
        CreatorId   = 1,
    };

    private static MemoBlock MakeBlock() => new()
    {
        Id = 1, MemoId = 1, Type = "bullet", Content = "テスト", SortOrder = 1,
    };

    // 9. CreateMemo: is_system のノート → NOTE_FORBIDDEN
    [Fact]
    public async Task CreateAsync_SystemNote_ReturnsForbidden()
    {
        _noteRepoMock.Setup(r => r.GetByIdAsync(1, 1)).ReturnsAsync(MakeNote(isSystem: true));

        var result = await _sut.CreateAsync(noteId: 1, groupId: 1, userId: 1);

        Assert.Equal("NOTE_FORBIDDEN", result.ErrorCode);
        _memoRepoMock.Verify(r => r.CreateAsync(It.IsAny<Memo>()), Times.Never);
    }

    // 10. CreateMemo: ノートなし → NOTE_NOT_FOUND
    [Fact]
    public async Task CreateAsync_NoteNotFound_ReturnsNotFound()
    {
        _noteRepoMock.Setup(r => r.GetByIdAsync(99, 1)).ReturnsAsync((Note?)null);

        var result = await _sut.CreateAsync(noteId: 99, groupId: 1, userId: 1);

        Assert.Equal("NOTE_NOT_FOUND", result.ErrorCode);
    }

    // 11. GetDetail: 存在しない → MEMO_NOT_FOUND
    [Fact]
    public async Task GetDetailAsync_NotFound_ReturnsMemoNotFound()
    {
        _memoRepoMock.Setup(r => r.GetByIdWithBlocksAsync(99)).ReturnsAsync((ValueTuple<Memo, List<MemoBlock>>?)null);

        var result = await _sut.GetDetailAsync(99);

        Assert.Equal("MEMO_NOT_FOUND", result.ErrorCode);
        Assert.Null(result.Data);
    }

    // 12. Save: ブロックが全置換される
    [Fact]
    public async Task SaveAsync_ValidRequest_CallsSaveBlocks()
    {
        _memoRepoMock.Setup(r => r.GetByIdWithBlocksAsync(1))
                     .ReturnsAsync((MakeMemo(), new List<MemoBlock> { MakeBlock() }));
        _memoRepoMock.Setup(r => r.SaveBlocksAsync(1, 5, It.IsAny<List<MemoBlock>>()))
                     .Returns(Task.CompletedTask);

        var request = new MemoRequest
        {
            Blocks = [new MemoBlockRequest { Type = "heading", Content = "新タイトル", SortOrder = 1 }],
        };

        var result = await _sut.SaveAsync(1, request, userId: 5);

        Assert.Null(result.ErrorCode);
        _memoRepoMock.Verify(r => r.SaveBlocksAsync(1, 5, It.IsAny<List<MemoBlock>>()), Times.Once);
    }

    // 13. Delete: is_important=true → MEMO_FORBIDDEN
    [Fact]
    public async Task DeleteAsync_ImportantMemo_ReturnsForbidden()
    {
        _memoRepoMock.Setup(r => r.GetByIdWithBlocksAsync(1))
                     .ReturnsAsync((MakeMemo(isImportant: true), new List<MemoBlock>()));

        var result = await _sut.DeleteAsync(1);

        Assert.Equal("MEMO_FORBIDDEN", result.ErrorCode);
        _memoRepoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    // 14. Delete: 正常 → 物理削除される
    [Fact]
    public async Task DeleteAsync_NormalMemo_PhysicallyDeletes()
    {
        _memoRepoMock.Setup(r => r.GetByIdWithBlocksAsync(1))
                     .ReturnsAsync((MakeMemo(isImportant: false), new List<MemoBlock>()));
        _memoRepoMock.Setup(r => r.DeleteAsync(1)).Returns(Task.CompletedTask);

        var result = await _sut.DeleteAsync(1);

        Assert.Null(result.ErrorCode);
        _memoRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }
}
