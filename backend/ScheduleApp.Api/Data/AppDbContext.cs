using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Color>                    Colors                    { get; set; }
    public DbSet<Group>                    Groups                    { get; set; }
    public DbSet<User>                     Users                     { get; set; }
    public DbSet<Session>                  Sessions                  { get; set; }
    public DbSet<AuditLog>                 AuditLogs                 { get; set; }
    public DbSet<Genre>                    Genres                    { get; set; }
    public DbSet<Schedule>                 Schedules                 { get; set; }
    public DbSet<Note>                     Notes                     { get; set; }
    public DbSet<Memo>                     Memos                     { get; set; }
    public DbSet<MemoBlock>                MemoBlocks                { get; set; }
    public DbSet<UserNotificationSetting>  UserNotificationSettings  { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Color>(e =>
        {
            e.ToTable("colors");
            e.Property(x => x.HexCode).HasColumnType("char(7)");
            e.HasIndex(x => x.HexCode).IsUnique();
        });

        modelBuilder.Entity<Group>(e => e.ToTable("groups"));

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasIndex(x => x.LoginId).IsUnique();
            e.Property(x => x.LoginId).HasMaxLength(50);
            e.HasOne(x => x.ThemeColor)
             .WithMany()
             .HasForeignKey(x => x.ThemeColorId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Session>(e => e.ToTable("sessions"));

        modelBuilder.Entity<AuditLog>(e => e.ToTable("audit_logs"));

        modelBuilder.Entity<Genre>(e => e.ToTable("genres"));

        modelBuilder.Entity<Schedule>(e => e.ToTable("schedules"));

        modelBuilder.Entity<Note>(e =>
        {
            e.ToTable("notes");
            e.Property(x => x.Color).HasColumnType("char(7)");
        });

        modelBuilder.Entity<Memo>(e => e.ToTable("memos"));

        modelBuilder.Entity<MemoBlock>(e => e.ToTable("memo_blocks"));

        modelBuilder.Entity<UserNotificationSetting>(e => e.ToTable("user_notification_settings"));
    }
}
