import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.jsx"
import { ThemeProvider } from "@/components/theme-provider"
import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      storageKey="hermes-desktop-theme"
      disableTransitionOnChange>
      <App />
    </ThemeProvider>
  </StrictMode>
)
