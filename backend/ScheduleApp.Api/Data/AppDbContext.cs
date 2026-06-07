using Microsoft.EntityFrameworkCore;
using ScheduleApp.Api.Models.Entities;

namespace ScheduleApp.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Color>                   Colors                   { get; set; }
    public DbSet<Group>                   Groups                   { get; set; }
    public DbSet<User>                    Users                    { get; set; }
    public DbSet<Session>                 Sessions                 { get; set; }
    public DbSet<AuditLog>                AuditLogs                { get; set; }
    public DbSet<Genre>                   Genres                   { get; set; }
    public DbSet<Schedule>                Schedules                { get; set; }
    public DbSet<Note>                    Notes                    { get; set; }
    public DbSet<Memo>                    Memos                    { get; set; }
    public DbSet<MemoBlock>               MemoBlocks               { get; set; }
    public DbSet<UserNotificationSetting> UserNotificationSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Color>(e =>
        {
            e.ToTable("colors");
            e.Property(x => x.HexCode).HasColumnType("char(7)").IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(20).IsRequired();
            e.Property(x => x.SortOrder).IsRequired();
            e.HasIndex(x => x.HexCode).IsUnique();
        });

        modelBuilder.Entity<Group>(e =>
        {
            e.ToTable("groups");
            e.Property(x => x.Name).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(x => x.LoginId).HasMaxLength(50).IsRequired();
            e.Property(x => x.Name).HasMaxLength(20).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired();
            e.Property(x => x.Role).HasDefaultValue((short)2).IsRequired();
            e.Property(x => x.IsActive).HasDefaultValue(true).IsRequired();
            e.HasIndex(x => x.LoginId).IsUnique();
            e.HasOne(x => x.ThemeColor)
             .WithMany()
             .HasForeignKey(x => x.ThemeColorId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Session>(e =>
        {
            e.ToTable("sessions");
            e.Property(x => x.Token).HasMaxLength(512).IsRequired();
            e.Property(x => x.ExpiresAt).IsRequired();
            e.Property(x => x.LastActiveAt).IsRequired();
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.Property(x => x.Action).HasMaxLength(50).IsRequired();
            e.Property(x => x.TargetType).HasMaxLength(50);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("GETDATE()").IsRequired();
        });

        modelBuilder.Entity<Genre>(e =>
        {
            e.ToTable("genres");
            e.Property(x => x.Name).HasMaxLength(20).IsRequired();
            e.Property(x => x.IsActive).HasDefaultValue(true).IsRequired();
            e.Property(x => x.IsDeleted).HasDefaultValue(false).IsRequired();
            e.HasOne(x => x.Color)
             .WithMany()
             .HasForeignKey(x => x.ColorId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Schedule>(e =>
        {
            e.ToTable("schedules");
            e.Property(x => x.Title).HasMaxLength(30).IsRequired();
            e.Property(x => x.Visibility).HasMaxLength(10).IsRequired();
            e.Property(x => x.IsDeleted).HasDefaultValue(false).IsRequired();
            e.HasOne(x => x.Genre)
             .WithMany()
             .HasForeignKey(x => x.GenreId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Note>(e =>
        {
            e.ToTable("notes");
            e.Property(x => x.Name).HasMaxLength(30).IsRequired();
            e.Property(x => x.Color).HasColumnType("char(7)").IsRequired();
            e.Property(x => x.CreatedAt).HasDefaultValueSql("GETDATE()").IsRequired();
            e.Property(x => x.IsArchived).HasDefaultValue(false).IsRequired();
            e.Property(x => x.IsDeleted).HasDefaultValue(false).IsRequired();
        });

        modelBuilder.Entity<Memo>(e =>
        {
            e.ToTable("memos");
            e.Property(x => x.Title).HasMaxLength(30);
            e.Property(x => x.IsImportant).HasDefaultValue(false).IsRequired();
        });

        modelBuilder.Entity<MemoBlock>(e =>
        {
            e.ToTable("memo_blocks");
            e.Property(x => x.Type).HasMaxLength(20).IsRequired();
            e.Property(x => x.SortOrder).IsRequired();
            e.HasOne<Memo>()
             .WithMany()
             .HasForeignKey(x => x.MemoId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserNotificationSetting>(e =>
        {
            e.ToTable("user_notification_settings");
            e.Property(x => x.IsEnabled).HasDefaultValue(true).IsRequired();
        });
    }
}
