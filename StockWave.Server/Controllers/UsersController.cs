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
        public UsersController(AppDbContext db) { _db = db; }

        // GET /api/users
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var user = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => new {
                    u.Id, u.FullName, u.Username,
                    u.Email, u.Status,
                    u.CreatedAt, u.LastLogin
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { message = "User not found." });
            return Ok(new[] { user });
        }

        // PUT /api/users/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
        {
            var userId = GetUserId();
            if (id != userId) return Forbid();
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            user.FullName = dto.FullName;
            user.Username = dto.Username;
            user.Email = dto.Email;

            await _db.SaveChangesAsync();
            return Ok(new { message = "User updated." });
        }

        // DELETE /api/users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (id != userId) return Forbid();
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            return Ok(new { message = "User deleted." });
        }

        private int GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(id ?? "0");
        }
    }

    public record UpdateUserDto(string FullName, string Username, string Email);
}