using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockWave.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddQrTokenToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QrToken",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QrToken",
                table: "Users");
        }
    }
}
