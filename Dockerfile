# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the solution file if it exists, and the project file
COPY ["StockWave.sln", "./"]
COPY ["StockWave.Server/StockWave.Server.csproj", "StockWave.Server/"]

# Restore dependencies
RUN dotnet restore "StockWave.Server/StockWave.Server.csproj"

# Copy the rest of the source code
COPY . .

# Build the project
WORKDIR "/src/StockWave.Server"
RUN dotnet build "StockWave.Server.csproj" -c Release -o /app/build

# Publish the project
FROM build AS publish
RUN dotnet publish "StockWave.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Railway environment configuration
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "StockWave.Server.dll"]
