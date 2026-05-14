# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source

# Copy csproj and restore as distinct layers
COPY ["StockWave.Server/StockWave.Server.csproj", "StockWave.Server/"]
RUN dotnet restore "StockWave.Server/StockWave.Server.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/source/StockWave.Server"
RUN dotnet publish "StockWave.Server.csproj" -c Release -o /app

# Final Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .

# Railway uses the PORT environment variable. 
# ASP.NET Core 8.0+ automatically binds to PORT if ASPNETCORE_HTTP_PORTS is not set, 
# but setting it explicitly ensures it works with Railway's dynamic port assignment.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "StockWave.Server.dll"]
