# StockWave
Touchless Inventory Management System with Gesture and Voice Controls.

---

## Tech Stack
- **Frontend:** React (Vite)
- **Backend:** ASP.NET Core Web API (.NET 10)
- **Database:** PostgreSQL (local)

---

## Prerequisites
Install these on your PC before anything else:

- [Node.js LTS](https://nodejs.org)
- [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
- [VS Code](https://code.visualstudio.com)

**VS Code Extensions:**
- C# Dev Kit
- C# (by Microsoft)
- ES7+ React/Redux Snippets
- Prettier
- Thunder Client

---

## First Time Setup (Do this once after pulling)

### 1. Install dotnet-ef tool
```bash
dotnet tool install --global dotnet-ef
```

### 2. Backend Setup
```bash
cd StockWave.Server
dotnet restore
dotnet ef database update
dotnet run
```
Backend runs at: `http://localhost:5258`
Swagger docs at: `http://localhost:5258/swagger`

Database connection uses PostgreSQL at `localhost:5432` with the connection string in `StockWave.Server/appsettings.json`.

If Docker is installed, you can start Postgres with:
```bash
docker run --name stockwave-db -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=stockwave -p 5432:5432 -d postgres:16
```

If you do not have Docker, install PostgreSQL directly from [postgresql.org](https://www.postgresql.org/download/), then use the same host, port, database, username, and password in `appsettings.json`.

### 3. Frontend Setup
```bash
cd stockwave-client
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## Running the App (After Setup)

Open **two terminals** every time:

**Terminal 1 — Backend:**
```bash
cd StockWave.Server
dotnet run
```

**Terminal 2 — Frontend:**
```bash
cd stockwave-client
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## First Login
After setup you need to **register an account** first:

1. Go to `http://localhost:5173`
2. Click **"Create one"** on the login page
3. Fill in your details and register
4. Log in with your new account

Or register directly via Swagger at `http://localhost:5258/swagger`:
- **POST /api/auth/register** with your details

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/products | Get all products |
| POST | /api/products | Add product |
| PUT | /api/products/{id} | Update product |
| DELETE | /api/products/{id} | Delete product |
| GET | /api/users | Get all users |
| PUT | /api/users/{id} | Update user |
| DELETE | /api/users/{id} | Delete user |
| GET | /api/reports/summary | Dashboard stats |
| GET | /api/reports/low-stock | Low stock items |
| GET | /api/reports/recent-activity | Activity log |

---

## Project Structure

```
StockWave/
├── StockWave.Server/        ← C# .NET Backend
│   ├── Controllers/         ← API Controllers
│   ├── Models/              ← Database Models
│   ├── Data/                ← DbContext
│   ├── Program.cs           ← App entry point
│   └── appsettings.json     ← Config + JWT settings
│
└── stockwave-client/        ← React Frontend
    ├── src/
    │   ├── pages/           ← Login, Register, Dashboard, Inventory, Reports, Users, Settings
    │   ├── api/             ← stockwaveApi.js (axios calls)
    │   └── App.jsx          ← Page routing
    └── vite.config.js       ← Proxy to backend
```

---

## Notes
- `stockwave.db` is not pushed to GitHub — each person gets a fresh database
- JWT token is stored in `localStorage` after login
- Vite proxy forwards all `/api` requests to `http://localhost:5258`
