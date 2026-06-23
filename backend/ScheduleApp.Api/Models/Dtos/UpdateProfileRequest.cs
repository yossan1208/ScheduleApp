namespace ScheduleApp.Api.Models.Dtos;

public class UpdateProfileRequest
{
    public string Name            { get; set; } = string.Empty;
    public int    PersonalColorId { get; set; }
    public int    ThemeColorId    { get; set; }
    public string Language        { get; set; } = "ja";
}
