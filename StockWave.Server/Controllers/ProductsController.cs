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

        // GET /api/products
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var products = await _db.Products
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            return Ok(products);
        }

        // GET /api/products/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id);
            if (product == null) return NotFound(new { message = "Product not found." });
            return Ok(product);
        }

        // POST /api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductDto dto)
        {
            var userId = GetUserId();
            var name = (dto.Name ?? string.Empty).Trim();
            var category = (dto.Category ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(category) || dto.Stock < 0 || dto.Price < 0 || string.IsNullOrWhiteSpace(dto.Unit))
            {
                return BadRequest(new { message = "Please provide valid product details." });
            }

            var exists = await _db.Products.AnyAsync(p =>
                p.UserId == userId &&
                p.Name.ToLower() == name.ToLower() &&
                p.Category.ToLower() == category.ToLower());

            if (exists)
            {
                return Conflict(new { message = "A product with the same name and category already exists." });
            }

            var product = new Product
            {
                UserId = userId,
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
                UserId = userId,
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
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id);
            if (product == null) return NotFound(new { message = "Product not found." });

            var name = (dto.Name ?? string.Empty).Trim();
            var category = (dto.Category ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(category) || dto.Stock < 0 || dto.Price < 0 || string.IsNullOrWhiteSpace(dto.Unit))
            {
                return BadRequest(new { message = "Please provide valid product details." });
            }

            var exists = await _db.Products.AnyAsync(p =>
                p.UserId == product.UserId &&
                p.Id != product.Id &&
                p.Name.ToLower() == name.ToLower() &&
                p.Category.ToLower() == category.ToLower());

            if (exists)
            {
                return Conflict(new { message = "A product with the same name and category already exists." });
            }

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
                    UserId = product.UserId,
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
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id);
            if (product == null) return NotFound(new { message = "Product not found." });

            _db.Products.Remove(product);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Product deleted." });
        }

        private static string GetStatus(int stock) =>
            stock == 0 ? "Out of Stock" : stock <= 10 ? "Low Stock" : "In Stock";

        private int GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(id ?? "0");
        }

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