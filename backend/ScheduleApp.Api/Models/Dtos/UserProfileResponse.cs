namespace ScheduleApp.Api.Models.Dtos;

public class UserProfileResponse
{
    public int    UserId           { get; set; }
    public string LoginId          { get; set; } = string.Empty;
    public string Name             { get; set; } = string.Empty;
    public short  Role             { get; set; }
    public int    PersonalColorId  { get; set; }
    public string PersonalColorHex { get; set; } = string.Empty;
    public int    ThemeColorId     { get; set; }
    public string ThemeColorHex    { get; set; } = string.Empty;
}
