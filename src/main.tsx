import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { PreferencesProvider } from "./contexts/PreferencesContext.tsx";
import "./index.css";

// Mount app
createRoot(document.getElementById("root")!).render(
  <PreferencesProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </PreferencesProvider>
);
