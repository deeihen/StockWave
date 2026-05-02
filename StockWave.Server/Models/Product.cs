namespace StockWave.Server.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Stock { get; set; } = 0;
        public decimal Price { get; set; } = 0;
        public string Unit { get; set; } = "pcs";
        public string Status { get; set; } = "In Stock";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}