namespace ScheduleApp.Api.Models.Entities;

public class User
{
    public int    Id              { get; set; }
    public string LoginId         { get; set; } = string.Empty;
    public string Name            { get; set; } = string.Empty;
    public string PasswordHash    { get; set; } = string.Empty;
    public int    PersonalColorId { get; set; }
    public int    ThemeColorId    { get; set; }
    public short  Role            { get; set; }
    public int?   GroupId         { get; set; }
    public bool   IsActive        { get; set; } = true;

    public Color? ThemeColor { get; set; }
}
