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
        public string Role { get; set; } = "Admin";
        public string Status { get; set; } = "Active";
        public bool TwoFactorEnabled { get; set; } = false;
        public string TwoFactorSecret { get; set; } = string.Empty;
        public bool LoginAlertsEnabled { get; set; } = true;
        public int SessionTimeoutMinutes { get; set; } = 30;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; }

        // ── Workspace isolation ──────────────────────────
        // Null = this user IS an Admin (workspace owner)
        // Set  = this user is Staff, owned by that Admin
        public int? AdminId { get; set; }

        // Auto-generated unique identifier e.g. ".waveKx9m"
        // Displayed in staff list as their workspace tag
        public string Identifier { get; set; } = string.Empty;

        // Forgot-password (Admin accounts only)
        public string? PasswordResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }

        // QR Login Token (One-time generation, permanent until reset)
        public string QrToken { get; set; } = string.Empty;
    }
}
