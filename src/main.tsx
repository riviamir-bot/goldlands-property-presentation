import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ClientShareApp } from "./screens/ClientShareApp";
import { shareTokenFromPath } from "./utils/handoff";
import "./styles.css";

const shareToken = shareTokenFromPath(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {shareToken ? (
      // A client's summary page: the language comes from the link and is not stored on the client's device.
      <LanguageProvider initial="he">
        <ClientShareApp token={shareToken} />
      </LanguageProvider>
    ) : (
      <LanguageProvider>
        <App />
      </LanguageProvider>
    )}
  </React.StrictMode>,
);
