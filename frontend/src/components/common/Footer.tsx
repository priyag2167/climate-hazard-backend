import React from "react";

export function Footer(): React.ReactElement {
  return (
    <footer className="app-footer">
      <div>
        Weather reanalysis powered by{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (ECMWF ERA5). Licensed under{" "}
        <a href="https://open-meteo.com/en/licence" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        .
      </div>
      <div>
        Built for Dygnify Ventures Climate Hazard Case Study · Full Stack Implementation with FastAPI, React & MongoDB
      </div>
    </footer>
  );
}
