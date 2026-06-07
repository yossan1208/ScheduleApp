using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScheduleApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupIdNullableAndNoteIsSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "GroupId",
                table: "users",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                table: "notes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_users_ThemeColorId",
                table: "users",
                column: "ThemeColorId");

            migrationBuilder.AddForeignKey(
                name: "FK_users_colors_ThemeColorId",
                table: "users",
                column: "ThemeColorId",
                principalTable: "colors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_users_colors_ThemeColorId",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_ThemeColorId",
                table: "users");

            migrationBuilder.DropColumn(
                name: "IsSystem",
                table: "notes");

            migrationBuilder.AlterColumn<int>(
                name: "GroupId",
                table: "users",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
