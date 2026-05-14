using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockWave.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddProductCostPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use IF EXISTS to avoid failure when the columns are already absent
            migrationBuilder.Sql("ALTER TABLE \"StockTransactions\" DROP COLUMN IF EXISTS \"UnitCost\";");
            migrationBuilder.Sql("ALTER TABLE \"StockTransactions\" DROP COLUMN IF EXISTS \"UnitPrice\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "StockTransactions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "StockTransactions",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
