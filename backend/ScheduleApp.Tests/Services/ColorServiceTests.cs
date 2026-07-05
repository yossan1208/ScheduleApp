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
        Assert.Equal(1,            result[0].ColorId);
        Assert.Equal("#FF8C00",    result[0].HexCode);
        Assert.Equal("ダークオレンジ", result[0].DisplayName);
    }

    // 2. GetAll: IsReserved=true の色は除外される
    [Fact]
    public async Task GetAllAsync_ExcludesReservedColors()
    {
        _repoMock.Setup(r => r.GetAllAsync())
                 .ReturnsAsync([
                     new Color { Id = 1, HexCode = "#FF8C00", DisplayName = "ダークオレンジ", SortOrder = 1, IsReserved = false },
                     new Color { Id = 2, HexCode = "#9e9e9e", DisplayName = "システム予約",   SortOrder = 999, IsReserved = true },
                 ]);

        var result = await _sut.GetAllAsync();

        Assert.Single(result);
        Assert.Equal("#FF8C00", result[0].HexCode);
    }
}
