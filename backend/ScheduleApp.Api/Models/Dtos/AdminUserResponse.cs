namespace ScheduleApp.Api.Models.Dtos;

public class AdminUserResponse
{
    public int    UserId   { get; set; }
    public string LoginId  { get; set; } = string.Empty;
    public string Name     { get; set; } = string.Empty;
    public short  Role     { get; set; }
    public int?   GroupId  { get; set; }
    public bool   IsActive { get; set; }
}
