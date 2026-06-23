namespace ScheduleApp.Api.Models.Dtos;

public class LoginResponse
{
    public int    UserId        { get; set; }
    public string Name          { get; set; } = string.Empty;
    public short  Role          { get; set; }
    public string ThemeColorHex { get; set; } = string.Empty;
    public string Language      { get; set; } = "ja";
}
