namespace ScheduleApp.Api.Models.Entities;

public class Genre
{
    public int       Id                         { get; set; }
    public string    Name                       { get; set; } = string.Empty;
    public int       ColorId                    { get; set; }
    public int?      DefaultNotificationMinutes { get; set; }
    public int       GroupId                    { get; set; }
    public bool      IsActive                   { get; set; } = true;
    public bool      IsDeleted                  { get; set; } = false;
    public DateTime? DeletedAt                  { get; set; }
}
