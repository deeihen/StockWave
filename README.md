StockWave
==========

Quickstart (Read This First)
----------------------------

if dotnet run and npm run dev is not working do this.

Prerequisites
- Node.js + npm
- .NET SDK

VS Code Extensions
- C# Dev Kit
- C# (by Microsoft)
- ES7+ React/Redux Snippets
- Thunder Client

Backend Setup (StockWave.Server)
1. Open a terminal in the StockWave.Server folder.
2. Add required packages:

```
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Swashbuckle.AspNetCore
```

3. Run the server:

```
dotnet run
```

Frontend Setup (stockwave-client)
1. Open a terminal in the stockwave-client folder.
2. Install dependencies:

```
npm install
npm install react-router-dom axios
npm install recharts
npm install react-speech-recognition
```

3. Run the frontend:

```
npm run dev
```
Login Credential:
    username: 1
    password: 1
