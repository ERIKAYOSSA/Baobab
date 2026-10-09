import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SignupProvider } from "./context/SignupContext";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <SignupProvider>
      <App />
    </SignupProvider>
  </StrictMode>
);