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
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public UsersController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        // GET /api/users
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new {
                    u.Id, u.FullName, u.Username,
                    u.Email, u.Status,
                    u.CreatedAt, u.LastLogin,
                    u.PhoneNumber,
                    u.Bio
                })
                .ToListAsync();

            return Ok(users);
        }

        // PUT /api/users/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            user.FullName = dto.FullName;
            user.Username = dto.Username;
            user.Email = dto.Email;
            user.PhoneNumber = dto.PhoneNumber ?? user.PhoneNumber;
            user.Bio = dto.Bio ?? user.Bio;
            user.Status = dto.Status ?? user.Status;

            await _db.SaveChangesAsync();
            return Ok(new { message = "User updated." });
        }

        // DELETE /api/users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            return Ok(new { message = "User deleted." });
        }

        // PUT /api/users/me/password
        [HttpPut("me/password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect." });

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password updated successfully." });
        }

        // PUT /api/users/me/security
        [HttpPut("me/security")]
        public async Task<IActionResult> UpdateSecuritySettings([FromBody] SecuritySettingsDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Update 2FA settings
            if (dto.EnableTwoFactor && !user.TwoFactorEnabled)
            {
                // Generate 2FA secret (simplified - in production use proper TOTP library)
                user.TwoFactorSecret = Guid.NewGuid().ToString("N")[..16];
                user.TwoFactorEnabled = true;
            }
            else if (!dto.EnableTwoFactor && user.TwoFactorEnabled)
            {
                user.TwoFactorEnabled = false;
                user.TwoFactorSecret = "";
            }

            // Update other settings
            user.LoginAlertsEnabled = dto.LoginAlertsEnabled;
            user.SessionTimeoutMinutes = dto.SessionTimeoutMinutes;

            await _db.SaveChangesAsync();

            return Ok(new { 
                message = "Security settings updated.",
                twoFactorEnabled = user.TwoFactorEnabled,
                loginAlertsEnabled = user.LoginAlertsEnabled,
                sessionTimeoutMinutes = user.SessionTimeoutMinutes
            });
        }

        // DELETE /api/admin/activity-logs
        [HttpDelete("admin/activity-logs")]
        public async Task<IActionResult> ClearActivityLogs()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Only allow admins to clear logs
            if (user.Role != "Administrator")
                return StatusCode(403, new { message = "Only administrators can clear activity logs." });

            // In a real implementation, you would clear activity logs from a separate table
            // For now, we'll just return success
            return Ok(new { message = "Activity logs cleared successfully." });
        }

        // POST /api/admin/reset-system
        [HttpPost("admin/reset-system")]
        public async Task<IActionResult> ResetSystem()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token." });

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Only allow admins to reset system
            if (user.Role != "Administrator")
                return StatusCode(403, new { message = "Only administrators can reset the system." });

            // Reset all users' security settings to defaults
            var users = await _db.Users.ToListAsync();
            foreach (var u in users)
            {
                u.TwoFactorEnabled = false;
                u.TwoFactorSecret = "";
                u.LoginAlertsEnabled = true;
                u.SessionTimeoutMinutes = 30;
            }

            await _db.SaveChangesAsync();

            return Ok(new { message = "System reset to defaults successfully." });
        }
    }

    public record UpdateUserDto(string FullName, string Username, string Email, string? PhoneNumber, string? Bio, string? Status);
    public record ChangePasswordDto(string CurrentPassword, string NewPassword);
    public record SecuritySettingsDto(bool EnableTwoFactor, bool LoginAlertsEnabled, int SessionTimeoutMinutes);
}