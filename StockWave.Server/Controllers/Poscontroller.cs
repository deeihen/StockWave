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
    [Route("api/pos")]
    public class PosController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PosController(AppDbContext db) { _db = db; }

        // POST /api/pos/checkout
        // Body: { items: [{ productId, quantity, price }], paymentMethod, cashierName }
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CheckoutDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Cart is empty." });

            var userId = GetUserId();
            var errors = new List<string>();
            var updatedProducts = new List<Product>();

            // ── Validate all items first before touching the DB ──
            foreach (var item in dto.Items)
            {
                var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                if (product == null)
                {
                    errors.Add($"Product ID {item.ProductId} not found.");
                    continue;
                }
                if (product.Stock < item.Quantity)
                {
                    errors.Add($"'{product.Name}' only has {product.Stock} units left.");
                    continue;
                }
                updatedProducts.Add(product);
            }

            if (errors.Count > 0)
                return BadRequest(new { message = string.Join(" ", errors) });

            // ── Deduct stock and log transactions ──
            var invoiceNumber = new Random().Next(1000, 9999);
            foreach (var item in dto.Items)
            {
                var product = updatedProducts.First(p => p.Id == item.ProductId);
                product.Stock -= item.Quantity;
                product.Status = GetStatus(product.Stock);
                product.UpdatedAt = DateTime.UtcNow;

                _db.StockTransactions.Add(new StockTransaction
                {
                    UserId = userId,
                    ProductId = product.Id,
                    Action = "Sold",
                    Quantity = item.Quantity,
                    PerformedBy = dto.CashierName ?? "POS",
                    Timestamp = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();

            var subtotal = dto.Items.Sum(i => i.Price * i.Quantity);
            var tax = Math.Round(subtotal * 0.07m, 2);

            return Ok(new
            {
                message = "Checkout successful.",
                invoiceNumber = $"INV-{invoiceNumber}",
                subtotal,
                tax,
                total = subtotal + tax,
                paymentMethod = dto.PaymentMethod ?? "Cash",
                itemsSold = dto.Items.Count,
                timestamp = DateTime.UtcNow
            });
        }

        private static string GetStatus(int stock) =>
            stock == 0 ? "Out of Stock" : stock <= 10 ? "Low Stock" : "In Stock";

        private int GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(id ?? "0");
        }
    }

    public record CheckoutItemDto(int ProductId, int Quantity, decimal Price);
    public record CheckoutDto(
        List<CheckoutItemDto> Items,
        string? PaymentMethod,
        string? CashierName
    );
}