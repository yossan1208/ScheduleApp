namespace ScheduleApp.Api.Models.Dtos;

public class AdminGroupRequest
{
    public string    Name    { get; set; } = string.Empty;
    public List<int> UserIds { get; set; } = [];
}
