namespace ScheduleApp.Api.Models;

public class ApiEnvelope<T>
{
    public bool      Success { get; set; }
    public T?        Data    { get; set; }
    public ApiError? Error   { get; set; }
}

public class ApiError
{
    public string Code    { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public ApiError(string code, string message)
    {
        Code    = code;
        Message = message;
    }
}
