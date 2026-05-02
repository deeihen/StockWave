import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  const [page, setPage] = useState("login");

  if (page === "register") {
    return <Register onGoLogin={() => setPage("login")} />;
  }

  if (page === "dashboard") {
    return <Dashboard onLogout={() => setPage("login")} />;
  }

  return (
    <Login
      onGoRegister={() => setPage("register")}
      onLoginSuccess={() => setPage("dashboard")}
    />
  );
}

export default App;