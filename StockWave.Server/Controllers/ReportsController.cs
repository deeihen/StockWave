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

        private static bool IsSaleAction(string? action) =>
            string.Equals(action, "Sale", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(action, "Removed", StringComparison.OrdinalIgnoreCase);

        private static bool IsAddAction(string? action) =>
            string.Equals(action, "Added", StringComparison.OrdinalIgnoreCase);

        private int GetWorkspaceAdminId()
        {
            var adminIdClaim = User.FindFirstValue("adminId");
            return int.Parse(adminIdClaim ?? "0");
        }

        private async Task<List<int>> GetWorkspaceUserIdsAsync()
        {
            var adminId = GetWorkspaceAdminId();
            var staffIds = await _db.Users
                .Where(u => u.AdminId == adminId)
                .Select(u => u.Id)
                .ToListAsync();
            staffIds.Add(adminId);
            return staffIds;
        }

        // GET /api/reports/summary
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var products = _db.Products.Where(p => workspaceIds.Contains(p.UserId));

            var totalProducts = await products.CountAsync();
            var lowStock     = await products.CountAsync(p => p.Status == "Low Stock");
            var outOfStock   = await products.CountAsync(p => p.Status == "Out of Stock");
            var inStock      = await products.CountAsync(p => p.Status == "In Stock");

            var thisMonth = DateTime.UtcNow.Date.AddDays(-DateTime.UtcNow.Day + 1);
            var transactions = _db.StockTransactions
                .Where(t => workspaceIds.Contains(t.UserId) && t.Timestamp >= thisMonth);

            var added   = await transactions.Where(t => t.Action == "Added").SumAsync(t => (int?)t.Quantity) ?? 0;
            var removed = await transactions.Where(t => t.Action == "Sale" || t.Action == "Removed" || t.Action == "Sold").SumAsync(t => (int?)t.Quantity) ?? 0;
            var totalValue = await products.SumAsync(p => (decimal?)((decimal)p.Stock * p.Price)) ?? 0;

            return Ok(new {
                totalProducts, lowStock, outOfStock, inStock,
                itemsAddedThisMonth   = added,
                itemsSoldThisMonth    = removed,
                itemsRemovedThisMonth = removed,
                totalStockValue       = totalValue
            });
        }

        // GET /api/reports/low-stock
        [HttpGet("low-stock")]
        public async Task<IActionResult> LowStock()
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var items = await _db.Products
                .Where(p => workspaceIds.Contains(p.UserId) &&
                            (p.Status == "Low Stock" || p.Status == "Out of Stock"))
                .OrderBy(p => p.Stock)
                .ToListAsync();
            return Ok(items);
        }

        // GET /api/reports/recent-activity
        [HttpGet("recent-activity")]
        public async Task<IActionResult> RecentActivity()
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var activity = await _db.StockTransactions
                .Include(t => t.Product)
                .Where(t => workspaceIds.Contains(t.UserId))
                .OrderByDescending(t => t.Timestamp)
                .Take(20)
                .Select(t => new {
                    t.Id,
                    t.Action,
                    Item      = t.Product.Name,
                    t.Quantity,
                    Price     = t.Product.Price,
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
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var breakdown = await _db.Products
                .Where(p => workspaceIds.Contains(p.UserId))
                .GroupBy(p => p.Category)
                .Select(g => new {
                    name       = g.Key,
                    value      = g.Sum(p => p.Stock),
                    totalValue = g.Sum(p => (decimal)p.Stock * p.Price)
                })
                .OrderByDescending(g => g.value)
                .ToListAsync();
            return Ok(breakdown);
        }

        // GET /api/reports/stock-movement
        // Returns monthly revenue and profit for the last 6 months.
        // Profit is calculated from actual product cost prices.
        [HttpGet("stock-movement")]
        public async Task<IActionResult> StockMovement()
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);

            // Load transactions with their product price for revenue/cost calculation
            var transactions = await _db.StockTransactions
                .Include(t => t.Product)
                .Where(t => workspaceIds.Contains(t.UserId) && t.Timestamp >= sixMonthsAgo)
                .ToListAsync();

            var grouped = transactions
                .GroupBy(t => new { t.Timestamp.Year, t.Timestamp.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g =>
                {
                    var saleTxns = g
                        .Where(t => IsSaleAction(t.Action) || string.Equals(t.Action, "Sold", StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    // Revenue = total value of units sold (Sale transactions)
                    var revenue = saleTxns.Sum(t => t.Quantity * (t.Product?.Price ?? 0));

                    // Cost = total cost of units sold using actual CostPrice
                    var cost = saleTxns.Sum(t => t.Quantity * (t.Product?.CostPrice ?? 0));

                    // Profit = revenue minus cost (if cost data exists), otherwise estimate at 93%
                    var profit = cost > 0 ? revenue - cost : Math.Round(revenue * 0.93m, 2);

                    return new
                    {
                        month   = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM"),
                        revenue = Math.Round(revenue, 2),
                        profit  = Math.Round(profit, 2)
                    };
                })
                .ToList();

            return Ok(grouped);
        }

        // GET /api/reports/top-products
        [HttpGet("top-products")]
        public async Task<IActionResult> TopProducts()
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var top = await _db.StockTransactions
                .Include(t => t.Product)
                .Where(t => workspaceIds.Contains(t.UserId) &&
                            (t.Action == "Added" || t.Action == "Sale" || t.Action == "Removed" || t.Action == "Sold"))
                .GroupBy(t => new { t.ProductId, t.Product.Name, t.Product.Category, t.Product.Stock })
                .Select(g => new {
                    name        = g.Key.Name,
                    category    = g.Key.Category,
                    stock       = g.Key.Stock,
                    totalMoved  = g.Sum(t => t.Quantity)
                })
                .OrderByDescending(g => g.totalMoved)
                .Take(5)
                .ToListAsync();

            return Ok(top);
        }
    }
}