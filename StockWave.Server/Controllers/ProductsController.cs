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
    [Route("api/products")]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ProductsController(AppDbContext db) { _db = db; }

        // Resolves the workspace admin ID from the JWT token.
        // If the caller is Admin, returns their own ID.
        // If the caller is Staff, returns their AdminId.
        private int GetWorkspaceAdminId()
        {
            var adminIdClaim = User.FindFirstValue("adminId");
            return int.Parse(adminIdClaim ?? "0");
        }

        private int GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(id ?? "0");
        }

        private int GetProductOwnerId()
        {
            var adminId = GetWorkspaceAdminId();
            return adminId != 0 ? adminId : GetUserId();
        }

        // Returns all user IDs in this workspace (admin + all their staff)
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

        // GET /api/products
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var products = await _db.Products
                .Where(p => workspaceIds.Contains(p.UserId))
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            return Ok(products);
        }

        // GET /api/products/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id && workspaceIds.Contains(p.UserId));
            if (product == null) return NotFound(new { message = "Product not found." });
            return Ok(product);
        }

        // POST /api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductDto dto)
        {
            var ownerId = GetProductOwnerId();
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var name = (dto.Name ?? string.Empty).Trim();
            var category = (dto.Category ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(category) ||
                dto.Stock < 0 || dto.Price < 0 || string.IsNullOrWhiteSpace(dto.Unit))
                return BadRequest(new { message = "Please provide valid product details." });

            // Duplicate check scoped to workspace
            var exists = await _db.Products.AnyAsync(p =>
                workspaceIds.Contains(p.UserId) &&
                p.Name.ToLower() == name.ToLower() &&
                p.Category.ToLower() == category.ToLower());

            if (exists)
                return Conflict(new { message = "A product with the same name and category already exists." });

            var product = new Product
            {
                UserId = ownerId,
                Name = name,
                Category = category,
                Stock = dto.Stock,
                Price = dto.Price,
                Unit = dto.Unit,
                Status = GetStatus(dto.Stock),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Products.Add(product);
            await _db.SaveChangesAsync();

            _db.StockTransactions.Add(new StockTransaction
            {
                UserId = GetUserId(),
                ProductId = product.Id,
                Action = "Added",
                Quantity = dto.Stock,
                PerformedBy = dto.PerformedBy ?? "Admin",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(product);
        }

        // PUT /api/products/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductDto dto)
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id && workspaceIds.Contains(p.UserId));
            if (product == null) return NotFound(new { message = "Product not found." });

            var name = (dto.Name ?? string.Empty).Trim();
            var category = (dto.Category ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(category) ||
                dto.Stock < 0 || dto.Price < 0 || string.IsNullOrWhiteSpace(dto.Unit))
                return BadRequest(new { message = "Please provide valid product details." });

            var exists = await _db.Products.AnyAsync(p =>
                workspaceIds.Contains(p.UserId) &&
                p.Id != product.Id &&
                p.Name.ToLower() == name.ToLower() &&
                p.Category.ToLower() == category.ToLower());

            if (exists)
                return Conflict(new { message = "A product with the same name and category already exists." });

            var oldStock = product.Stock;
            product.Name = name;
            product.Category = category;
            product.Stock = dto.Stock;
            product.Price = dto.Price;
            product.Unit = dto.Unit;
            product.Status = GetStatus(dto.Stock);
            product.UpdatedAt = DateTime.UtcNow;

            var diff = dto.Stock - oldStock;
            if (diff != 0)
            {
                _db.StockTransactions.Add(new StockTransaction
                {
                    UserId = GetUserId(),
                    ProductId = product.Id,
                    Action = diff > 0 ? "Added" : "Removed",
                    Quantity = Math.Abs(diff),
                    PerformedBy = dto.PerformedBy ?? "Admin",
                    Timestamp = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return Ok(product);
        }

        // DELETE /api/products/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var workspaceIds = await GetWorkspaceUserIdsAsync();
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id && workspaceIds.Contains(p.UserId));
            if (product == null) return NotFound(new { message = "Product not found." });

            _db.Products.Remove(product);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Product deleted." });
        }

        private static string GetStatus(int stock) =>
            stock == 0 ? "Out of Stock" : stock <= 10 ? "Low Stock" : "In Stock";
    }

    public record ProductDto(
        string Name,
        string Category,
        int Stock,
        decimal Price,
        string Unit,
        string? PerformedBy
    );
}