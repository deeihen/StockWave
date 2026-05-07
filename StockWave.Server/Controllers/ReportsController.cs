using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using StockWave.Server.Data;

namespace StockWave.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ReportsController(AppDbContext db) { _db = db; }

        // GET /api/reports/summary
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var products = _db.Products;
            var totalProducts = await products.CountAsync();
            var lowStock = await products.CountAsync(p => p.Status == "Low Stock");
            var outOfStock = await products.CountAsync(p => p.Status == "Out of Stock");
            var inStock = await products.CountAsync(p => p.Status == "In Stock");

            var thisMonth = DateTime.UtcNow.AddDays(-30);
            var added = await _db.StockTransactions
                .Where(t => t.Action == "Added" && t.Timestamp >= thisMonth)
                .SumAsync(t => (int?)t.Quantity) ?? 0;
            var removed = await _db.StockTransactions
                .Where(t => t.Action == "Removed" && t.Timestamp >= thisMonth)
                .SumAsync(t => (int?)t.Quantity) ?? 0;

            // Total stock value
            var totalValue = await products
                .SumAsync(p => (decimal?)((decimal)p.Stock * p.Price)) ?? 0;

            return Ok(new {
                totalProducts, lowStock, outOfStock, inStock,
                itemsAddedThisMonth = added,
                itemsRemovedThisMonth = removed,
                totalStockValue = totalValue
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

        // GET /api/reports/category-breakdown
        [HttpGet("category-breakdown")]
        public async Task<IActionResult> CategoryBreakdown()
        {
            var breakdown = await _db.Products
                .GroupBy(p => p.Category)
                .Select(g => new {
                    name = g.Key,
                    value = g.Sum(p => p.Stock),
                    totalValue = g.Sum(p => (decimal)p.Stock * p.Price)
                })
                .OrderByDescending(g => g.value)
                .ToListAsync();
            return Ok(breakdown);
        }

        // GET /api/reports/stock-movement
        [HttpGet("stock-movement")]
        public async Task<IActionResult> StockMovement()
        {
            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);

            var transactions = await _db.StockTransactions
                .Where(t => t.Timestamp >= sixMonthsAgo)
                .ToListAsync();

            // Group by month
            var grouped = transactions
                .GroupBy(t => new { t.Timestamp.Year, t.Timestamp.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new {
                    month = new DateTime(g.Key.Year, g.Key.Month, 1)
                        .ToString("MMM"),
                    added = g.Where(t => t.Action == "Added").Sum(t => t.Quantity),
                    removed = g.Where(t => t.Action == "Removed").Sum(t => t.Quantity)
                })
                .ToList();

            return Ok(grouped);
        }

        // GET /api/reports/top-products
        [HttpGet("top-products")]
        public async Task<IActionResult> TopProducts()
        {
            var top = await _db.StockTransactions
                .Include(t => t.Product)
                .Where(t => t.Action == "Added" || t.Action == "Removed")
                .GroupBy(t => new { t.ProductId, t.Product.Name, t.Product.Category, t.Product.Stock })
                .Select(g => new {
                    name = g.Key.Name,
                    category = g.Key.Category,
                    stock = g.Key.Stock,
                    totalMoved = g.Sum(t => t.Quantity)
                })
                .OrderByDescending(g => g.totalMoved)
                .Take(5)
                .ToListAsync();

            return Ok(top);
        }
    }
}