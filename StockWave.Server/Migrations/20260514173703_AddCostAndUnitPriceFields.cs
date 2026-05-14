using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockWave.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddCostAndUnitPriceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "StockTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "StockTransactions",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "StockTransactions");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "StockTransactions");
        }
    }
}
