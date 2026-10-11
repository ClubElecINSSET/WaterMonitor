import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled: the Pi may have no internet access
import "@fontsource/montserrat/latin-500.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/kaushan-script/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
