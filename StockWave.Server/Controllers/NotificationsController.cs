using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using StockWave.Server.Data;
using StockWave.Server.Models;

namespace StockWave.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public NotificationsController(AppDbContext db) { _db = db; }

        // GET /api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            // Get user's notification states from DB (keyed by our custom string ID stored in Title)
            var states = await _db.Notifications
                .Where(n => n.UserId == userId)
                .ToDictionaryAsync(n => n.Title, n => n);

            // Get low stock alerts (virtual)
            var lowStockNotifs = await _db.Products
                .Where(p => p.Stock <= 10)
                .Select(p => new
                {
                    id = $"low-{p.Id}",
                    type = "warning",
                    icon = "⚠️",
                    title = "Low Stock Alert",
                    message = $"{p.Name} is running low — only {p.Stock} units left.",
                    createdAt = DateTime.UtcNow,
                })
                .ToListAsync();

            // Get recent activity (virtual - last 10)
            var activityNotifs = await _db.StockTransactions
                .OrderByDescending(t => t.Timestamp)
                .Take(10)
                .Select(t => new
                {
                    id = $"act-{t.Id}",
                    type = t.Quantity > 0 ? "success" : "info",
                    icon = t.Quantity > 0 ? "📥" : "📤",
                    title = (t.Quantity > 0 ? "Added" : "Removed") + ": " + t.Product.Name,
                    message = $"{Math.Abs(t.Quantity)} units by {t.PerformedBy}",
                    createdAt = t.Timestamp,
                })
                .ToListAsync();

            // Merge and apply states
            var allNotifications = lowStockNotifs.Concat(activityNotifs)
                .Select(n => {
                    var hasState = states.TryGetValue(n.id, out var state);
                    return new {
                        n.id,
                        n.type,
                        n.icon,
                        n.title,
                        n.message,
                        n.createdAt,
                        isRead = hasState && state!.IsRead,
                        deletedAt = hasState ? state!.DeletedAt : null
                    };
                })
                .Where(n => n.deletedAt == null) // Filter out deleted ones
                .OrderByDescending(n => n.createdAt)
                .ToList();

            return Ok(allNotifications);
        }

        // PUT /api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            var existing = await _db.Notifications
                .FirstOrDefaultAsync(n => n.UserId == userId && n.Title == id);

            if (existing == null)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = id, // Use the custom ID as Title
                    IsRead = true,
                    ReadAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.IsRead = true;
                existing.ReadAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Notification marked as read." });
        }

        // PUT /api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            // We need to find all "virtual" notifications currently active and mark them
            var products = await _db.Products.Where(p => p.Stock <= 10).Select(p => $"low-{p.Id}").ToListAsync();
            var transactions = await _db.StockTransactions.OrderByDescending(t => t.Timestamp).Take(10).Select(t => $"act-{t.Id}").ToListAsync();
            var activeIds = products.Concat(transactions).ToList();

            var existingStates = await _db.Notifications
                .Where(n => n.UserId == userId && activeIds.Contains(n.Title))
                .ToListAsync();

            var existingIds = existingStates.Select(s => s.Title).ToHashSet();

            // Update existing
            foreach (var state in existingStates)
            {
                state.IsRead = true;
                state.ReadAt = DateTime.UtcNow;
            }

            // Create new for those missing
            foreach (var id in activeIds.Where(id => !existingIds.Contains(id)))
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = id,
                    IsRead = true,
                    ReadAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "All notifications marked as read." });
        }

        // DELETE /api/notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(string id)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            var existing = await _db.Notifications
                .FirstOrDefaultAsync(n => n.UserId == userId && n.Title == id);

            if (existing == null)
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = id,
                    DeletedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.DeletedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Notification deleted." });
        }

        // DELETE /api/notifications/clear-all
        [HttpDelete("clear-all")]
        public async Task<IActionResult> ClearAllNotifications()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            // Find all active virtual notifications
            var products = await _db.Products.Where(p => p.Stock <= 10).Select(p => $"low-{p.Id}").ToListAsync();
            var transactions = await _db.StockTransactions.OrderByDescending(t => t.Timestamp).Take(10).Select(t => $"act-{t.Id}").ToListAsync();
            var activeIds = products.Concat(transactions).ToList();

            var existingStates = await _db.Notifications
                .Where(n => n.UserId == userId && activeIds.Contains(n.Title))
                .ToListAsync();

            var existingIds = existingStates.Select(s => s.Title).ToHashSet();

            // Update existing
            foreach (var state in existingStates)
            {
                state.DeletedAt = DateTime.UtcNow;
            }

            // Create new for those missing
            foreach (var id in activeIds.Where(id => !existingIds.Contains(id)))
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = id,
                    DeletedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "All notifications cleared." });
        }
    }
}
