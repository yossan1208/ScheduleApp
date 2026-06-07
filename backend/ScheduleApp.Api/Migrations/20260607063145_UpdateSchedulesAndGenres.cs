using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScheduleApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSchedulesAndGenres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotificationMinutes",
                table: "schedules");

            migrationBuilder.DropColumn(
                name: "DefaultNotificationMinutes",
                table: "genres");

            migrationBuilder.AlterColumn<string>(
                name: "Visibility",
                table: "schedules",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "schedules",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "GenreId",
                table: "schedules",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "Date",
                table: "schedules",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "schedules",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "NotificationTime",
                table: "schedules",
                type: "time",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "DefaultNotificationTime",
                table: "genres",
                type: "time",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_schedules_GenreId",
                table: "schedules",
                column: "GenreId");

            migrationBuilder.CreateIndex(
                name: "IX_genres_ColorId",
                table: "genres",
                column: "ColorId");

            migrationBuilder.AddForeignKey(
                name: "FK_genres_colors_ColorId",
                table: "genres",
                column: "ColorId",
                principalTable: "colors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_schedules_genres_GenreId",
                table: "schedules",
                column: "GenreId",
                principalTable: "genres",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_genres_colors_ColorId",
                table: "genres");

            migrationBuilder.DropForeignKey(
                name: "FK_schedules_genres_GenreId",
                table: "schedules");

            migrationBuilder.DropIndex(
                name: "IX_schedules_GenreId",
                table: "schedules");

            migrationBuilder.DropIndex(
                name: "IX_genres_ColorId",
                table: "genres");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "schedules");

            migrationBuilder.DropColumn(
                name: "NotificationTime",
                table: "schedules");

            migrationBuilder.DropColumn(
                name: "DefaultNotificationTime",
                table: "genres");

            migrationBuilder.AlterColumn<string>(
                name: "Visibility",
                table: "schedules",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "schedules",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<int>(
                name: "GenreId",
                table: "schedules",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "Date",
                table: "schedules",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<int>(
                name: "NotificationMinutes",
                table: "schedules",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultNotificationMinutes",
                table: "genres",
                type: "int",
                nullable: true);
        }
    }
}
