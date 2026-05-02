using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockWave.Server.Data;

namespace StockWave.Server.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ReportsController(AppDbContext db) { _db = db; }

        // GET /api/reports/summary
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var totalProducts = await _db.Products.CountAsync();
            var lowStock = await _db.Products.CountAsync(p => p.Status == "Low Stock");
            var outOfStock = await _db.Products.CountAsync(p => p.Status == "Out of Stock");
            var inStock = await _db.Products.CountAsync(p => p.Status == "In Stock");

            var thisMonth = DateTime.UtcNow.AddDays(-30);
            var added = await _db.StockTransactions
                .Where(t => t.Action == "Added" && t.Timestamp >= thisMonth)
                .SumAsync(t => (int?)t.Quantity) ?? 0;
            var removed = await _db.StockTransactions
                .Where(t => t.Action == "Removed" && t.Timestamp >= thisMonth)
                .SumAsync(t => (int?)t.Quantity) ?? 0;

            return Ok(new {
                totalProducts, lowStock, outOfStock, inStock,
                itemsAddedThisMonth = added,
                itemsRemovedThisMonth = removed
            });
        }

        // GET /api/reports/low-stock
        [HttpGet("low-stock")]
        public async Task<IActionResult> LowStock()
        {
            var items = await _db.Products
                .Where(p => p.Status == "Low Stock" || p.Status == "Out of Stock")
                .OrderBy(p => p.Stock)
                .ToListAsync();
            return Ok(items);
        }

        // GET /api/reports/recent-activity
        [HttpGet("recent-activity")]
        public async Task<IActionResult> RecentActivity()
        {
            var activity = await _db.StockTransactions
                .Include(t => t.Product)
                .OrderByDescending(t => t.Timestamp)
                .Take(20)
                .Select(t => new {
                    t.Id,
                    t.Action,
                    Item = t.Product.Name,
                    t.Quantity,
                    t.PerformedBy,
                    t.Timestamp
                })
                .ToListAsync();
            return Ok(activity);
        }
    }
}