using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using ScheduleApp.Api.Data;
using ScheduleApp.Api.Middleware;
using ScheduleApp.Api.Repositories;
using ScheduleApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// DI 登録
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ISessionRepository, SessionRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IScheduleRepository, ScheduleRepository>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

// セッションミドルウェア（認証チェック・スライディングウィンドウ）
app.UseMiddleware<SessionMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.Run();
