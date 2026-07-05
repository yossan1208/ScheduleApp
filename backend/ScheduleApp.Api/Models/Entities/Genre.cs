namespace ScheduleApp.Api.Models.Entities;

public class Genre
{
    public int       Id                       { get; set; }
    public string    Name                     { get; set; } = string.Empty;
    public int       ColorId                  { get; set; }
    public TimeOnly? DefaultNotificationTime  { get; set; }
    public int       GroupId                  { get; set; }
    public bool      IsActive                 { get; set; } = true;
    public bool      IsDeleted                { get; set; }
    public DateTime? DeletedAt                { get; set; }
    public bool      IsSystem                 { get; set; }

    public Color?    Color                    { get; set; }
}
