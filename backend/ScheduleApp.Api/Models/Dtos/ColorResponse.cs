namespace ScheduleApp.Api.Models.Dtos;

public class ColorResponse
{
    public int    ColorId     { get; set; }
    public string HexCode     { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
