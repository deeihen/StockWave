using System.ComponentModel.DataAnnotations.Schema;

namespace StockWave.Server.Models
{
    public class User
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string Role { get; set; } = "Staff";
        public string Status { get; set; } = "Active";
        public bool TwoFactorEnabled { get; set; } = false;
        public string TwoFactorSecret { get; set; } = string.Empty;
        public bool LoginAlertsEnabled { get; set; } = true;
        public int SessionTimeoutMinutes { get; set; } = 30;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; }
    }
}