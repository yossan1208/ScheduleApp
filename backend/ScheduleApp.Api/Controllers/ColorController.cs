using Microsoft.AspNetCore.Mvc;
using ScheduleApp.Api.Models;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Services;

namespace ScheduleApp.Api.Controllers;

[ApiController]
[Route("api/colors")]
public class ColorController(IColorService colorService) : ControllerBase
{
    private IActionResult Unauthorized401() => Unauthorized(new ApiEnvelope<object>
    {
        Success = false,
        Error   = new ApiError("AUTH_SESSION_INVALID", "認証が必要です"),
    });

    // GET /api/colors
    [HttpGet]
    public async Task<IActionResult> GetColors()
    {
        if (HttpContext.Items["UserId"] is not int)
            return Unauthorized401();

        var result = await colorService.GetAllAsync();
        return Ok(new ApiEnvelope<List<ColorResponse>> { Success = true, Data = result });
    }
}
