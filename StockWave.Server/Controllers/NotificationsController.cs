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

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        }

        private int GetWorkspaceAdminId()
        {
            return int.Parse(User.FindFirstValue("adminId") ?? "0");
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

        // GET /api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userId = GetUserId();
            var workspaceIds = await GetWorkspaceUserIdsAsync();

            // Get this user's notification read/deleted states
            var states = await _db.Notifications
                .Where(n => n.UserId == userId)
                .ToDictionaryAsync(n => n.Title, n => n);

            // Low stock alerts — scoped to workspace products only
            var lowStockNotifs = await _db.Products
                .Where(p => workspaceIds.Contains(p.UserId) && p.Stock <= 10)
                .Select(p => new
                {
                    id        = $"low-{p.Id}",
                    type      = "warning",
                    icon      = "⚠️",
                    title     = "Low Stock Alert",
                    message   = $"{p.Name} is running low — only {p.Stock} units left.",
                    createdAt = DateTime.UtcNow,
                })
                .ToListAsync();

            // Activity notifications — scoped to workspace transactions only
            var activityNotifs = await _db.StockTransactions
                .Where(t => workspaceIds.Contains(t.UserId))
                .OrderByDescending(t => t.Timestamp)
                .Take(10)
                .Select(t => new
                {
                    id        = $"act-{t.Id}",
                    type      = t.Quantity > 0 ? "success" : "info",
                    icon      = t.Quantity > 0 ? "📥" : "📤",
                    title     = (t.Quantity > 0 ? "Added" : "Sale") + ": " + t.Product.Name,
                    message   = $"{Math.Abs(t.Quantity)} units by {t.PerformedBy}",
                    createdAt = t.Timestamp,
                })
                .ToListAsync();

            var persistedNotifs = await _db.Notifications
                .Where(n => n.UserId == userId && n.DeletedAt == null && n.Title.StartsWith("passwd-req-"))
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new
                {
                    id = n.Title,
                    type = n.Type,
                    icon = n.Icon,
                    title = "Staff Password Request",
                    message = n.Message,
                    createdAt = n.CreatedAt,
                    isRead = n.IsRead,
                    deletedAt = n.DeletedAt
                })
                .ToListAsync();

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
                        isRead    = hasState && state!.IsRead,
                        deletedAt = hasState ? state!.DeletedAt : null
                    };
                })
                .Where(n => n.deletedAt == null)
                .Concat(persistedNotifs)
                .OrderByDescending(n => n.createdAt)
                .ToList();

            return Ok(allNotifications);
        }

        // PUT /api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            var userId = GetUserId();

            if (id.StartsWith("passwd-req-"))
            {
                var row = await _db.Notifications
                    .FirstOrDefaultAsync(n => n.UserId == userId && n.Title == id);

                if (row != null)
                {
                    row.IsRead = true;
                    row.ReadAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();
                return Ok(new { message = "Notification marked as read." });
            }

            var existing = await _db.Notifications
                .FirstOrDefaultAsync(n => n.UserId == userId && n.Title == id);

            if (existing == null)
                _db.Notifications.Add(new Notification { UserId = userId, Title = id, IsRead = true, ReadAt = DateTime.UtcNow });
            else
            { existing.IsRead = true; existing.ReadAt = DateTime.UtcNow; }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Notification marked as read." });
        }

        // PUT /api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId       = GetUserId();
            var workspaceIds = await GetWorkspaceUserIdsAsync();

            var products     = await _db.Products.Where(p => workspaceIds.Contains(p.UserId) && p.Stock <= 10).Select(p => $"low-{p.Id}").ToListAsync();
            var transactions = await _db.StockTransactions.Where(t => workspaceIds.Contains(t.UserId)).OrderByDescending(t => t.Timestamp).Take(10).Select(t => $"act-{t.Id}").ToListAsync();
            var activeIds    = products.Concat(transactions).ToList();

            var existingStates = await _db.Notifications.Where(n => n.UserId == userId && activeIds.Contains(n.Title)).ToListAsync();
            var existingIds    = existingStates.Select(s => s.Title).ToHashSet();

            foreach (var s in existingStates) { s.IsRead = true; s.ReadAt = DateTime.UtcNow; }
            foreach (var id in activeIds.Where(id => !existingIds.Contains(id)))
                _db.Notifications.Add(new Notification { UserId = userId, Title = id, IsRead = true, ReadAt = DateTime.UtcNow });

            var persistedUnread = await _db.Notifications
                .Where(n => n.UserId == userId && n.Title.StartsWith("passwd-req-") && !n.IsRead && n.DeletedAt == null)
                .ToListAsync();
            foreach (var n in persistedUnread)
            {
                n.IsRead = true;
                n.ReadAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "All notifications marked as read." });
        }

        // DELETE /api/notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(string id)
        {
            var userId = GetUserId();
            var existing = await _db.Notifications
                .FirstOrDefaultAsync(n => n.UserId == userId && n.Title == id);

            if (id.StartsWith("passwd-req-"))
            {
                if (existing != null)
                    existing.DeletedAt = DateTime.UtcNow;
            }
            else
            {
                if (existing == null)
                    _db.Notifications.Add(new Notification { UserId = userId, Title = id, DeletedAt = DateTime.UtcNow });
                else
                    existing.DeletedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Notification deleted." });
        }

        // DELETE /api/notifications/clear-all
        [HttpDelete("clear-all")]
        public async Task<IActionResult> ClearAllNotifications()
        {
            var userId       = GetUserId();
            var workspaceIds = await GetWorkspaceUserIdsAsync();

            var products     = await _db.Products.Where(p => workspaceIds.Contains(p.UserId) && p.Stock <= 10).Select(p => $"low-{p.Id}").ToListAsync();
            var transactions = await _db.StockTransactions.Where(t => workspaceIds.Contains(t.UserId)).OrderByDescending(t => t.Timestamp).Take(10).Select(t => $"act-{t.Id}").ToListAsync();
            var activeIds    = products.Concat(transactions).ToList();

            var existingStates = await _db.Notifications.Where(n => n.UserId == userId && activeIds.Contains(n.Title)).ToListAsync();
            var existingIds    = existingStates.Select(s => s.Title).ToHashSet();

            foreach (var s in existingStates) s.DeletedAt = DateTime.UtcNow;
            foreach (var id in activeIds.Where(id => !existingIds.Contains(id)))
                _db.Notifications.Add(new Notification { UserId = userId, Title = id, DeletedAt = DateTime.UtcNow });

            var persistedRows = await _db.Notifications
                .Where(n => n.UserId == userId && n.Title.StartsWith("passwd-req-") && n.DeletedAt == null)
                .ToListAsync();
            foreach (var n in persistedRows)
                n.DeletedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { message = "All notifications cleared." });
        }
    }
}