using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScheduleApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddColorReservedAndGenreSystemFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                table: "genres",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsReserved",
                table: "colors",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                "INSERT INTO colors (HexCode, DisplayName, SortOrder, IsReserved) " +
                "VALUES ('#9e9e9e', N'システム予約', 999, 1);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM colors WHERE HexCode = '#9e9e9e' AND IsReserved = 1;");

            migrationBuilder.DropColumn(
                name: "IsSystem",
                table: "genres");

            migrationBuilder.DropColumn(
                name: "IsReserved",
                table: "colors");
        }
    }
}
