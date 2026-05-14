using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
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

        public AuthController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // POST /api/auth/register  — creates an Admin account
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Username already exists." });

            if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email already in use." });

            var user = new User
            {
                FullName = dto.FullName,
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "Admin",       // public registration always creates Admin
                AdminId = null,       // is the workspace owner
                Identifier = string.Empty,
                Status = "Active",
                CreatedAt = DateTime.UtcNow
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

            user.LastLogin = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token,
                user = new
                {
                    user.Id,
                    user.FullName,
                    user.Username,
                    user.Email,
                    user.Role,
                    user.AdminId,
                    user.Identifier,
                    user.TwoFactorEnabled,
                    user.LoginAlertsEnabled,
                    user.SessionTimeoutMinutes
                }
            });
        }

        // POST /api/auth/create-staff — Admin only, creates a Staff under their workspace
        [HttpPost("create-staff")]
        [Authorize]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto dto)
        {
            // Only Admins can create staff
            var roleClm = User.FindFirstValue(ClaimTypes.Role);
            if (roleClm != "Admin")
                return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Username already exists." });

            // Generate a unique identifier: .wave + 4 random alphanumeric chars
            string identifier;
            do
            {
                var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
                var random = new Random();
                var suffix = new string(Enumerable.Range(0, 4)
                    .Select(_ => chars[random.Next(chars.Length)]).ToArray());
                identifier = $".wave{suffix}";
            }
            while (await _db.Users.AnyAsync(u => u.AdminId == adminId && u.Identifier == identifier));

            var staff = new User
            {
                FullName = dto.FullName,
                Username = dto.Username,
                Email = dto.Email ?? $"{dto.Username}@staff.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "Staff",
                AdminId = adminId,    // belongs to this admin's workspace
                Identifier = identifier,
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(staff);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Staff account created.",
                staff = new
                {
                    staff.Id,
                    staff.FullName,
                    staff.Username,
                    staff.Email,
                    staff.Role,
                    staff.Identifier,
                    staff.Status,
                    staff.CreatedAt
                }
            });
        }

        // GET /api/auth/my-staff — returns all staff under the calling Admin
        [HttpGet("my-staff")]
        [Authorize]
        public async Task<IActionResult> GetMyStaff()
        {
            var roleClm = User.FindFirstValue(ClaimTypes.Role);
            if (roleClm != "Admin")
                return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var staff = await _db.Users
                .Where(u => u.AdminId == adminId)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Username,
                    u.Email,
                    u.Identifier,
                    u.Status,
                    u.CreatedAt,
                    u.LastLogin
                })
                .ToListAsync();

            return Ok(staff);
        }

        // DELETE /api/auth/staff/{id} — Admin removes a staff from their workspace
        [HttpDelete("staff/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            var roleClm = User.FindFirstValue(ClaimTypes.Role);
            if (roleClm != "Admin")
                return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var staff = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == id && u.AdminId == adminId);

            if (staff == null)
                return NotFound(new { message = "Staff not found in your workspace." });

            _db.Users.Remove(staff);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Staff account removed." });
        }

        // PUT /api/auth/staff/{id}/status — toggle active/inactive
        [HttpPut("staff/{id}/status")]
        [Authorize]
        public async Task<IActionResult> ToggleStaffStatus(int id, [FromBody] ToggleStatusDto dto)
        {
            var roleClm = User.FindFirstValue(ClaimTypes.Role);
            if (roleClm != "Admin")
                return Forbid();

            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var staff = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == id && u.AdminId == adminId);

            if (staff == null)
                return NotFound(new { message = "Staff not found in your workspace." });

            staff.Status = dto.Status;
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Staff status set to {dto.Status}." });
        }

        // ── Helpers ──────────────────────────────────────
        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                // Include adminId in token so controllers can resolve workspace
                new Claim("adminId", user.AdminId?.ToString() ?? user.Id.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    double.Parse(_config["Jwt:ExpiresInMinutes"]!)),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public record RegisterDto(string FullName, string Username, string Email, string Password);
    public record LoginDto(string Username, string Password);
    public record CreateStaffDto(string FullName, string Username, string Password, string? Email);
    public record ToggleStatusDto(string Status);
}