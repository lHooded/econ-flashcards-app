import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";
import "./styles.css";

registerSW({ immediate: true });

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Application root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
