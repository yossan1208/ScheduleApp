namespace ScheduleApp.Api.Models.Dtos;

public class AdminUserRequest
{
    public string LoginId  { get; set; } = string.Empty;
    public string Name     { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public short  Role     { get; set; }
}
