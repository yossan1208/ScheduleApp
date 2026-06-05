namespace ScheduleApp.Api.Models.Entities;

public class Color
{
    public int    Id          { get; set; }
    public string HexCode     { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public short  SortOrder   { get; set; }
}
