import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register PWA service worker
registerSW({ immediate: true });

// Register push notification handler
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then(async (registration) => {
    // Load push handler script into SW scope
    // The sw-push.js is loaded by the workbox SW automatically
  });
}

createRoot(document.getElementById("root")!).render(<App />);
