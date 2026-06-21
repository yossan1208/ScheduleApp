using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using BCrypt.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ScheduleApp.Api.Models.Dtos;
using ScheduleApp.Api.Models.Entities;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Utils;

namespace ScheduleApp.Api.Services;

public class AuthService : IAuthService
{
    private const int SessionLifetimeDays = 14;

    private readonly IUserRepository _userRepo;
    private readonly ISessionRepository _sessionRepo;
    private readonly IConfiguration _config;

    public AuthService(
        IUserRepository userRepo,
        ISessionRepository sessionRepo,
        IConfiguration config)
    {
        _userRepo = userRepo;
        _sessionRepo = sessionRepo;
        _config = config;
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        var user = await _userRepo.FindByLoginIdAsync(request.LoginId);
        if (user is null)
            return new LoginResult(null, null, "AUTH_INVALID_CREDENTIALS");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return new LoginResult(null, null, "AUTH_INVALID_CREDENTIALS");

        if (!user.IsActive)
            return new LoginResult(null, null, "AUTH_ACCOUNT_DISABLED");

        if (user.GroupId is null)
            return new LoginResult(null, null, "AUTH_NO_GROUP");

        var token = GenerateJwtToken(user);

        var now = JstClock.Now;
        await _sessionRepo.CreateAsync(new Session
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = now.AddDays(SessionLifetimeDays),
            LastActiveAt = now
        });

        var response = new LoginResponse
        {
            UserId = user.Id,
            Name = user.Name,
            Role = user.Role,
            ThemeColorHex = user.ThemeColor?.HexCode ?? string.Empty
        };

        return new LoginResult(response, token, null);
    }

    public async Task LogoutAsync(string token)
    {
        var session = await _sessionRepo.FindByTokenAsync(token);
        if (session is not null)
            await _sessionRepo.DeleteAsync(session.Id);
    }

    private string GenerateJwtToken(User user)
    {
        var keyBytes = System.Text.Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);
        if (keyBytes.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be at least 32 characters (256 bits)");
        var securityKey = new SymmetricSecurityKey(keyBytes);
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("userId", user.Id.ToString()),
            new Claim("role", user.Role.ToString()),
            new Claim("groupId", user.GroupId!.Value.ToString())
        };

        var jwtToken = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(SessionLifetimeDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(jwtToken);
    }
}
