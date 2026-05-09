# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview.1 AS build
WORKDIR /source

# Copy everything and restore
COPY . .
RUN dotnet restore "StockWave.Server/StockWave.Server.csproj"

# Build and publish
RUN dotnet publish "StockWave.Server/StockWave.Server.csproj" -c Release -o /app

# Final Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview.1 AS final
WORKDIR /app
COPY --from=build /app .

# Expose port and start
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "StockWave.Server.dll"]
