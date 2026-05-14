using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using StockWave.Server.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                    ?? Environment.GetEnvironmentVariable("DATABASE_URL");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// JWT Auth
var jwtKey = builder.Configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY")!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "StockWave",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "StockWaveUsers",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin() // In production, we'll allow all origins for now to avoid CORS issues during initial deployment
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Always enable Swagger for easier testing in production during initial setup
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");
app.UseStaticFiles(); // Enable static file serving
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
