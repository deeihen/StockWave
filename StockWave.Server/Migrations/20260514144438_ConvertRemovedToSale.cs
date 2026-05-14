using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockWave.Server.Migrations
{
    /// <inheritdoc />
    public partial class ConvertRemovedToSale : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"StockTransactions\" SET \"Action\" = 'Sale' WHERE \"Action\" = 'Removed';");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"StockTransactions\" SET \"Action\" = 'Removed' WHERE \"Action\" = 'Sale';");

        }
    }
}
