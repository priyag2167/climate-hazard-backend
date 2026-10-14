import React from "react";
import { Navbar } from "./components/common";
import { DashboardScreen } from "./screens";

export default function App(): React.ReactElement {
  return (
    <div className="app-layout">
      {/* Top Application Navbar */}
      <Navbar />

      {/* Primary Dashboard Screen */}
      <DashboardScreen />
    </div>
  );
}
