# StockWave - Project Overview

**StockWave** is a full-stack, touchless inventory management system designed to make stock control seamless through modern UI components, taking advantage of gesture and voice controls. 

This document serves to provide a comprehensive structural and functional overview of the project.

---

## 🏗 System Architecture
The application follows a standard Client-Server architecture separated into two main projects:

1. **Frontend (`stockwave-client`)**: A React application built with Vite containing the responsive UI, interactive dashboards, and touchless controls.
2. **Backend (`StockWave.Server`)**: An ASP.NET Core Web API serving as the data provider, handling business logic, user authentication, and database operations.

---

## 🎨 Frontend (`stockwave-client`)

The frontend is a modern web interface relying heavily on React Hooks and Custom Contexts.

### Pages
- **Dashboard (`Dashboard.jsx`)**: The main landing page after login, likely displaying analytics, low stock alerts, and quick actions.
- **Inventory (`Inventory.jsx`)**: Core module to view, add, update, and manage product stock levels.
- **Reports (`Reports.jsx`)**: Displays stock transactions and movement reports over time.
- **Users (`Users.jsx`)**: Admin panel to manage system users.
- **Login / Register (`Login.jsx`, `Register.jsx`)**: Authentication pages for securing access to the inventory platform.
- **Settings (`Settings.jsx`)**: User or application configuration preferences.

### Advanced Touchless Components
- **Gesture Control (`GestureControl.jsx` & `useGesture.js`)**: An innovative feature utilizing webcam or motion sensors to let users navigate or interact with inventory items without physical touch (crucial for sterile or messy environments like warehouses/kitchens).
- **Voice Control (`VoiceControl.jsx` & `useVoice.js`)**: Integrates speech recognition to perform actions like searching for products or modifying stock quantities using voice commands.

### API Layer
- **`stockwaveApi.js`**: A centralized Axios/Fetch service to handle API calls to the C# backend and manage JWT tokens for authenticated requests.

---

## ⚙️ Backend (`StockWave.Server`)

The backend is built on .NET (supports .NET 8 / 10 depending on the environment) functioning as a typical REST API.

### Core Controllers
- **`AuthController.cs`**: Manages secure user registration and login, generating JWT authentication tokens.
- **`ProductsController.cs`**: Handles all CRUD (Create, Read, Update, Delete) operations regarding inventory items.
- **`ReportsController.cs`**: Returns reporting logic, aggregates data, and returns stock transaction histories.
- **`UsersController.cs`**: Allows for the management of users (fetch, update, delete).

### Database & Models (Entity Framework Core)
The project utilizes Entity Framework Core for Object-Relational Mapping (ORM) and local SQLite for the database.

It revolves around three primary models (`Data/AppDbContext.cs`):
1. **User**: Represents staff or admins logging into the system. Stores secure credentials and roles.
2. **Product**: Details an item in the inventory (Name, SKU, Quantity, Price, etc.).
3. **StockTransaction**: A log entry representing an addition or removal of stock (e.g., received stock vs. sold stock).

### Configuration
- **`appsettings.json`**: Holds runtime configurations, database connection strings, and JWT secret keys.
- **`launchSettings.json`**: Controls the local development environment ports and profiles.

---

## 🚀 Getting Started Flow

1. **Database Setup**: The EF Core migrations (`Migrations/`) are ready. Running `dotnet ef database update` provisions the database context.
2. **Server Execution**: The backend runs, exposing Swagger UI for easy endpoint testing. 
3. **Client Execution**: The Vite server runs the React client which authenticates to the Backend via API endpoints.

---

## 💡 Key Highlights
- **Touchless Experience**: Reduces physical contact with hardware through custom `useVoice` and `useGesture` hooks, making it perfect for rapid warehouse operations.
- **Security First**: Protected API endpoints utilizing secure tokens via the `AuthController`.
- **Modular and Extensible**: Clean separation of API services and React components, allowing developers to easily swap out or scale elements.
