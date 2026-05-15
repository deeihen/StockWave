using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MailKit.Net.Smtp;
using MailKit.Security;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Web;
using MimeKit;
using StockWave.Server.Data;
using StockWave.Server.Models;

namespace StockWave.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public AuthController(
            AppDbContext db,
            IConfiguration config,
            ILogger<AuthController> logger,
            IHttpClientFactory httpClientFactory)
        {
            _db = db;
            _config = config;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        // POST /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Username already exists." });

            if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email already in use." });

            var user = new User
            {
                FullName     = dto.FullName,
                Username     = dto.Username,
                Email        = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role         = "Admin",
                AdminId      = null,
                Identifier   = string.Empty,
                QrToken      = await GenerateUniqueQrToken(),
                Status       = "Active",
                CreatedAt    = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Account created successfully." });
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid username or password." });

            if (user.Status == "Inactive")
                return Unauthorized(new { message = "Your account is inactive. Contact admin." });

            // Ensure existing users get a QR token
            if (string.IsNullOrEmpty(user.QrToken))
            {
                user.QrToken = await GenerateUniqueQrToken();
            }

            user.LastLogin = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                token = GenerateJwtToken(user),
                user  = new
                {
                    user.Id, user.FullName, user.Username, user.Email,
                    user.Role, user.AdminId, user.Identifier, user.QrToken,
                    user.TwoFactorEnabled, user.LoginAlertsEnabled, user.SessionTimeoutMinutes
                }
            });
        }

        // POST /api/auth/login-qr
        [HttpPost("login-qr")]
        public async Task<IActionResult> LoginWithQr([FromBody] QrLoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Token))
                return BadRequest(new { message = "QR Token is required." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.QrToken == dto.Token);

            if (user == null)
                return Unauthorized(new { message = "Invalid or expired QR code." });

            if (user.Status == "Inactive")
                return Unauthorized(new { message = "Your account is inactive. Contact admin." });

            user.LastLogin = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                token = GenerateJwtToken(user),
                user = new
                {
                    user.Id,
                    user.FullName,
                    user.Username,
                    user.Email,
                    user.Role,
                    user.AdminId,
                    user.Identifier,
                    user.QrToken,
                    user.TwoFactorEnabled,
                    user.LoginAlertsEnabled,
                    user.SessionTimeoutMinutes
                }
            });
        }

        // POST /api/auth/create-staff
        [HttpPost("create-staff")]
        [Authorize]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto dto)
        {
            if (User.FindFirstValue(ClaimTypes.Role) != "Admin") return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Username already exists." });

            string identifier;
            do
            {
                var chars  = "abcdefghijklmnopqrstuvwxyz0123456789";
                var rng    = new Random();
                var suffix = new string(Enumerable.Range(0, 4)
                    .Select(_ => chars[rng.Next(chars.Length)]).ToArray());
                identifier = $".wave{suffix}";
            }
            while (await _db.Users.AnyAsync(u => u.AdminId == adminId && u.Identifier == identifier));

            var staff = new User
            {
                FullName     = dto.FullName,
                Username     = dto.Username,
                Email        = dto.Email ?? $"{dto.Username}@staff.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role         = "Staff",
                AdminId      = adminId,
                Identifier   = identifier,
                QrToken      = await GenerateUniqueQrToken(),
                Status       = "Active",
                CreatedAt    = DateTime.UtcNow
            };

            _db.Users.Add(staff);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Staff account created.",
                staff   = new
                {
                    staff.Id, staff.FullName, staff.Username, staff.Email,
                    staff.Role, staff.Identifier, staff.QrToken, staff.Status, staff.CreatedAt
                }
            });
        }

        // GET /api/auth/my-staff
        [HttpGet("my-staff")]
        [Authorize]
        public async Task<IActionResult> GetMyStaff()
        {
            if (User.FindFirstValue(ClaimTypes.Role) != "Admin") return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var staff = await _db.Users
                .Where(u => u.AdminId == adminId)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id, u.FullName, u.Username, u.Email,
                    u.Identifier, u.Status, u.CreatedAt, u.LastLogin
                })
                .ToListAsync();

            return Ok(staff);
        }

        // DELETE /api/auth/staff/{id}
        [HttpDelete("staff/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            if (User.FindFirstValue(ClaimTypes.Role) != "Admin") return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var staff   = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.AdminId == adminId);

            if (staff == null) return NotFound(new { message = "Staff not found in your workspace." });

            _db.Users.Remove(staff);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Staff account removed." });
        }

        // PUT /api/auth/staff/{id}/status
        [HttpPut("staff/{id}/status")]
        [Authorize]
        public async Task<IActionResult> ToggleStaffStatus(int id, [FromBody] ToggleStatusDto dto)
        {
            if (User.FindFirstValue(ClaimTypes.Role) != "Admin") return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var staff   = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.AdminId == adminId);

            if (staff == null) return NotFound(new { message = "Staff not found in your workspace." });

            staff.Status = dto.Status;
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Staff status set to {dto.Status}." });
        }

        // PUT /api/auth/staff/{id}/reset-password
        [HttpPut("staff/{id}/reset-password")]
        [Authorize]
        public async Task<IActionResult> ResetStaffPassword(int id, [FromBody] ResetStaffPasswordDto dto)
        {
            if (User.FindFirstValue(ClaimTypes.Role) != "Admin") return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var staff   = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.AdminId == adminId);

            if (staff == null) return NotFound(new { message = "Staff not found in your workspace." });

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters." });

            staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Staff password has been reset." });
        }

        // GET /api/auth/me
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user   = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Ensure existing users get a QR token
            if (string.IsNullOrEmpty(user.QrToken))
            {
                user.QrToken = await GenerateUniqueQrToken();
                await _db.SaveChangesAsync();
            }

            return Ok(new
            {
                user = new
                {
                    user.Id, user.FullName, user.Username, user.Email,
                    user.PhoneNumber, user.Bio, user.Role, user.AdminId, user.Identifier, user.QrToken,
                    user.TwoFactorEnabled, user.LoginAlertsEnabled, user.SessionTimeoutMinutes,
                    user.CreatedAt, user.LastLogin
                }
            });
        }

        // PUT /api/auth/me/profile
        [HttpPut("me/profile")]
        [Authorize]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user   = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Check email uniqueness (if changed)
            if (!string.IsNullOrWhiteSpace(dto.Email) && dto.Email != user.Email)
            {
                if (await _db.Users.AnyAsync(u => u.Id != userId && u.Email == dto.Email))
                    return BadRequest(new { message = "Email already in use by another account." });
                user.Email = dto.Email;
            }

            if (dto.FullName    != null) user.FullName    = dto.FullName;
            if (dto.PhoneNumber != null) user.PhoneNumber  = dto.PhoneNumber;
            if (dto.Bio         != null) user.Bio          = dto.Bio;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated.",
                user = new
                {
                    user.Id, user.FullName, user.Username, user.Email,
                    user.PhoneNumber, user.Bio, user.Role, user.Identifier, user.QrToken
                }
            });
        }

        // POST /api/auth/forgot-password
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.UsernameOrEmail))
                return BadRequest(new { message = "Please provide your username or email." });

            var user = await _db.Users.FirstOrDefaultAsync(u =>
                u.Username == dto.UsernameOrEmail || u.Email == dto.UsernameOrEmail);

            // Always return same shape so attackers can't enumerate users
            if (user == null)
                return Ok(new { found = false });

            // Staff can't reset their own password — notify their admin instead
           // Staff can't reset their own password — notify their admin instead
if (user.Role == "Staff")
{
    if (user.AdminId.HasValue)
    {
        // Unique internal key
        var notifKey = $"passwd-req-{user.Id}";

        var existing = await _db.Notifications
            .FirstOrDefaultAsync(n =>
                n.UserId == user.AdminId.Value &&
                n.Type == notifKey);

        if (existing == null)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = user.AdminId.Value,

                // Human-readable notification
                Title = "Staff Password Reset Request",
                Message = $"{user.FullName} (@{user.Username}) requested a password reset.",

                // Internal unique identifier
                Type = notifKey,

                IsRead = false,
                DeletedAt = null,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.Title = "Staff Password Reset Request";
            existing.Message = $"{user.FullName} (@{user.Username}) requested a password reset.";

            existing.IsRead = false;
            existing.DeletedAt = null;
            existing.CreatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    return Ok(new
    {
        found = true,
        isStaff = true
    });
}

            // Admin reset flow — generate token and send via SMTP
            var rawToken  = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

            user.PasswordResetToken = tokenHash;
            user.ResetTokenExpiry   = DateTime.UtcNow.AddHours(1);
            await _db.SaveChangesAsync();

            var resetLink = BuildResetLink(rawToken, Request);

            try
            {
                await SendPasswordResetEmailSmtpAsync(user, resetLink);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email for user {UserId}", user.Id);
                return StatusCode(503, new { message = "Password reset email could not be sent. Check your SMTP settings." });
            }

            return Ok(new { found = true, isStaff = false, emailSent = true });
        }

        // POST /api/auth/reset-password
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Token) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { message = "Token and new password are required." });

            if (dto.NewPassword.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters." });

            var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dto.Token)));

            var user = await _db.Users.FirstOrDefaultAsync(u =>
                u.PasswordResetToken == tokenHash &&
                u.ResetTokenExpiry   > DateTime.UtcNow &&
                u.Role               == "Admin");

            if (user == null)
                return BadRequest(new { message = "This reset link is invalid or has expired." });

            user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.PasswordResetToken = null;
            user.ResetTokenExpiry   = null;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully. You can now sign in." });
        }

        // ── Private helpers ───────────────────────────────

        private string GenerateJwtToken(User user)
        {
            var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("adminId", user.AdminId?.ToString() ?? user.Id.ToString())
            };

            var token = new JwtSecurityToken(
                issuer:             _config["Jwt:Issuer"],
                audience:           _config["Jwt:Audience"],
                claims:             claims,
                expires:            DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiresInMinutes"]!)),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string BuildResetLink(string rawToken, HttpRequest request)
        {
            var baseUrl = _config["Email:ResetLinkBaseUrl"]
                       ?? _config["Frontend:BaseUrl"];

            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                var origin = Request.Headers.Origin.ToString();
                if (!string.IsNullOrWhiteSpace(origin))
                {
                    baseUrl = origin;
                }
                else
                {
                    var referer = Request.Headers.Referer.ToString();
                    if (Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
                    {
                        baseUrl = $"{refererUri.Scheme}://{refererUri.Host}{(refererUri.IsDefaultPort ? "" : $":{refererUri.Port}")}";
                    }
                }
            }

            baseUrl ??= "http://localhost:5173";

            return $"{baseUrl.TrimEnd('/')}/?token={Uri.EscapeDataString(rawToken)}";
        }

        private static string? GetRequestOrigin(HttpRequest request)
        {
            if (request.Headers.TryGetValue("Origin", out var originValues))
            {
                var origin = originValues.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(origin))
                    return origin;
            }

            if (request.Headers.TryGetValue("Referer", out var refererValues))
            {
                var referer = refererValues.FirstOrDefault();
                if (Uri.TryCreate(referer, UriKind.Absolute, out var uri))
                    return uri.GetLeftPart(UriPartial.Authority);
            }

            return null;
        }

        // ── SMTP email sender ───────────────────────────
        private async Task SendPasswordResetEmailSmtpAsync(User user, string resetLink)
        {
            var host = _config["Email:SmtpHost"];
            var port = int.TryParse(_config["Email:SmtpPort"], out var parsedPort) ? parsedPort : 587;
            var username = _config["Email:Username"];
            var password = _config["Email:Password"];
            var fromAddress = _config["Email:FromAddress"];
            var fromName = _config["Email:FromName"] ?? "StockWave";
            var enableSsl = bool.Parse(_config["Email:EnableSsl"] ?? "true");

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(fromAddress))
                throw new InvalidOperationException("SMTP email settings are not configured.");

            var email = new MimeMessage();

            email.From.Add(new MailboxAddress(fromName, fromAddress));
            email.To.Add(MailboxAddress.Parse(user.Email));
            email.Subject = "Reset your StockWave password";
            email.Body = new BodyBuilder
            {
                HtmlBody = BuildResetEmailBody(user, resetLink)
            }.ToMessageBody();

            using var smtp = new SmtpClient();
            var socketOptions = enableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None;

            await smtp.ConnectAsync(host, port, socketOptions);
            await smtp.AuthenticateAsync(username, password);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }

        private static string BuildResetEmailBody(User user, string resetLink)
        {
            var name = System.Net.WebUtility.HtmlEncode(user.FullName);
            var link = resetLink; // not encoding the URL itself, only embedding safely

            return $@"
        <!doctype html>
        <html>
        <body style='margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;'>
        <div style='max-width:640px;margin:0 auto;padding:32px 16px;'>
        <div style='background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;'>
        <div style='font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:#34d399;font-weight:700;margin-bottom:12px;'>StockWave</div>
        <h1 style='margin:0 0 16px;font-size:28px;line-height:1.2;color:#f8fafc;'>Reset your password</h1>
        <p style='margin:0 0 16px;font-size:15px;line-height:1.7;color:#cbd5e1;'>Hi {name},</p>
        <p style='margin:0 0 16px;font-size:15px;line-height:1.7;color:#cbd5e1;'>We received a request to reset your StockWave password. Click the button below — this link expires in 1 hour.</p>
        <div style='margin:28px 0;'>
          <a href='{link}' style='display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;'>Reset Password</a>
        </div>
        <p style='margin:0;font-size:13px;line-height:1.6;color:#94a3b8;'>If the button doesn't work, copy and paste this link:</p>
        <p style='margin:8px 0 0;font-size:13px;color:#93c5fd;word-break:break-all;'>{link}</p>
        </div>
        </div>
        </body>
        </html>";
        }

        private async Task<string> GenerateUniqueQrToken()
        {
            string token;
            do
            {
                token = "waveqr_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLower();
            }
            while (await _db.Users.AnyAsync(u => u.QrToken == token));
            return token;
        }
        }

        // ── DTOs ─────────────────────────────────────────────
        public record RegisterDto(string FullName, string Username, string Email, string Password);
        public record LoginDto(string Username, string Password);
        public record QrLoginDto(string Token);
        public record CreateStaffDto(string FullName, string Username, string Password, string? Email);
        public record UpdateMyProfileDto(string? FullName, string? Email, string? PhoneNumber, string? Bio);
        public record ToggleStatusDto(string Status);
        public record ResetStaffPasswordDto(string NewPassword);
        public record ForgotPasswordDto(string UsernameOrEmail);
        public record ResetPasswordDto(string Token, string NewPassword);
        }