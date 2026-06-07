using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using ScheduleApp.Api.Repositories;
using System.Text;

namespace ScheduleApp.Api.Middleware;

public class SessionMiddleware(
    RequestDelegate next,
    IConfiguration config)
{
    private const int SessionLifetimeDays = 14;

    public async Task InvokeAsync(
        HttpContext context,
        ISessionRepository sessionRepo)
    {
        if (!context.Request.Cookies.TryGetValue("jwt", out var token))
        {
            await next(context);
            return;
        }

        JwtSecurityToken? jwtToken;
        try
        {
            jwtToken = ValidateJwt(token);
        }
        catch (SecurityTokenException)
        {
            await WriteUnauthorizedAsync(context);
            return;
        }

        if (jwtToken is null)
        {
            await WriteUnauthorizedAsync(context);
            return;
        }

        var session = await sessionRepo.FindByTokenAsync(token);
        if (session is null)
        {
            await WriteUnauthorizedAsync(context);
            return;
        }

        if (session.ExpiresAt < DateTime.UtcNow)
        {
            await sessionRepo.DeleteAsync(session.Id);
            await WriteUnauthorizedAsync(context);
            return;
        }

        await sessionRepo.UpdateLastActiveAsync(
            session.Id,
            expiresAt: DateTime.UtcNow.AddDays(SessionLifetimeDays),
            lastActiveAt: DateTime.UtcNow);

        var userIdClaim  = jwtToken.Claims.FirstOrDefault(c => c.Type == "userId");
        var roleClaim    = jwtToken.Claims.FirstOrDefault(c => c.Type == "role");
        var groupIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "groupId");

        if (userIdClaim is not null && int.TryParse(userIdClaim.Value, out var userId))
            context.Items["UserId"] = userId;

        if (roleClaim is not null && short.TryParse(roleClaim.Value, out var role))
            context.Items["Role"] = role;

        if (groupIdClaim is not null && int.TryParse(groupIdClaim.Value, out var groupId))
            context.Items["GroupId"] = groupId;

        await next(context);
    }

    private JwtSecurityToken? ValidateJwt(string token)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = key,
            ValidateIssuer           = true,
            ValidIssuer              = config["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = config["Jwt:Audience"],
            ValidateLifetime         = false
        };

        var handler = new JwtSecurityTokenHandler();
        handler.ValidateToken(token, validationParameters, out var validatedToken);

        return validatedToken as JwtSecurityToken;
    }

    private static async Task WriteUnauthorizedAsync(HttpContext context)
    {
        context.Response.StatusCode  = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            error   = new { code = "AUTH_SESSION_INVALID", message = "セッションが無効です" }
        });
    }
}
