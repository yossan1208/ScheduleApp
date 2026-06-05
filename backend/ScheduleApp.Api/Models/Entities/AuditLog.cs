namespace ScheduleApp.Api.Models.Entities;

public class AuditLog
{
    public int       Id         { get; set; }
    public int?      UserId     { get; set; }
    public string?   Action     { get; set; }
    public string?   TargetType { get; set; }
    public long?     TargetId   { get; set; }
    public DateTime? CreatedAt  { get; set; }
}
