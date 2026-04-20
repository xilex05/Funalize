import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";

// This is the frontend entry point. It mounts the whole React app
// inside the HTML root element and enables routing for all pages.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
