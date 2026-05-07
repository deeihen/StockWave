namespace StockWave.Server.Models
{
    public class StockTransaction
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public string Action { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}