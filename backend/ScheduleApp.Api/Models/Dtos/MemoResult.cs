namespace ScheduleApp.Api.Models.Dtos;

public record MemoResult(string? ErrorCode);
public record MemoDetailResult(MemoDetail? Data, string? ErrorCode);
public record MemoCreateResult(MemoListItem? Data, string? ErrorCode);
