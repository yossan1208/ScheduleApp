namespace ScheduleApp.Api.Utils;

public static class JstClock
{
    private static readonly TimeZoneInfo Jst =
        TimeZoneInfo.FindSystemTimeZoneById("Tokyo Standard Time");

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Jst);
}
