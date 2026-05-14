import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import WaveAIChat from "./components/WaveAIChat";

function App() {
  const [page, setPage] = useState(
    localStorage.getItem("token") ? "dashboard" : "login"
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setPage("login");
  };

  if (page === "register") {
    return <Register onGoLogin={() => setPage("login")} />;
  }
  if (page === "dashboard") {
    return (
      <>
        <Dashboard onLogout={handleLogout} />
        {/* WaveAI lives here — outside Dashboard so it survives all tab switches */}
        <WaveAIChat />
      </>
    );
  }
  return (
    <Login
      onGoRegister={() => setPage("register")}
      onLoginSuccess={() => setPage("dashboard")}
    />
  );
}

export default App;