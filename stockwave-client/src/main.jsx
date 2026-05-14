import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("Main.jsx is loading...");
console.log("API Key present:", !!import.meta.env.VITE_GEMINI_API_KEY);

window.onerror = function(message, source, lineno, colno, error) {
  console.error("GLOBAL ERROR:", message, "at", source, ":", lineno);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Frontend Crash</h1><p>${message}</p><p>at ${source}:${lineno}</p></div>`;
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Root element not found!");
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log("Render called");
  }
} catch (e) {
  console.error("Catch block error:", e);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Init Error</h1><pre>${e.stack}</pre></div>`;
}
