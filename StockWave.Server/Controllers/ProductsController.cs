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
            var userId = GetUserId();
            var products = await _db.Products
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            return Ok(products);
        }

        // GET /api/products/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = GetUserId();
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
            if (product == null) return NotFound(new { message = "Product not found." });
            return Ok(product);
        }

        // POST /api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductDto dto)
        {
            var userId = GetUserId();
            var product = new Product
            {
                UserId = userId,
                Name = dto.Name,
                Category = dto.Category,
                Stock = dto.Stock,
                Price = dto.Price,
                Unit = dto.Unit,
                Status = GetStatus(dto.Stock),
                CreatedAt = DateTime.UtcNow.AddHours(8),
                UpdatedAt = DateTime.UtcNow.AddHours(8)
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
                Timestamp = DateTime.UtcNow.AddHours(8)
            });

            await _db.SaveChangesAsync();
            return Ok(product);
        }

        // PUT /api/products/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductDto dto)
        {
            var userId = GetUserId();
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
            if (product == null) return NotFound(new { message = "Product not found." });

            var oldStock = product.Stock;

            product.Name = dto.Name;
            product.Category = dto.Category;
            product.Stock = dto.Stock;
            product.Price = dto.Price;
            product.Unit = dto.Unit;
            product.Status = GetStatus(dto.Stock);
            product.UpdatedAt = DateTime.UtcNow.AddHours(8);

            var diff = dto.Stock - oldStock;
            if (diff != 0)
            {
                _db.StockTransactions.Add(new StockTransaction
                {
                    UserId = userId,
                    ProductId = product.Id,
                    Action = diff > 0 ? "Added" : "Removed",
                    Quantity = Math.Abs(diff),
                    PerformedBy = dto.PerformedBy ?? "Admin",
                    Timestamp = DateTime.UtcNow.AddHours(8)
                });
            }

            await _db.SaveChangesAsync();
            return Ok(product);
        }

        // DELETE /api/products/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
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