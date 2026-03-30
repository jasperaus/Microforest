import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Chart.js registration (for react-chartjs-2 v5+ and chart.js v4+)
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);