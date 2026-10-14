# Frontend Source Architecture (`src/`)

This directory follows a modular, production-grade React + TypeScript architecture based on clear separation of concerns, reusability, and maintainability.

---

## 📁 Directory Structure Overview

```text
src/
├── components/          # Reusable presentation & visualization UI components
│   ├── charts/          # Chart.js time series & trend charts
│   ├── common/          # Global shared UI elements (Navbar, Footer, Banners, EmptyState)
│   ├── map/             # Leaflet geospatial & interactive map components
│   └── report/          # Analysis presentation blocks (Toolbar, Insight, Cards, Tables)
│
├── screens/             # Page/screen level view orchestrators
│   └── Dashboard/       # Main Climate Hazard Analysis screen
│       ├── components/  # Dashboard-specific container components (Hero, Controls, Results)
│       └── DashboardScreen.tsx
│
├── services/            # Networking, API integrations & data transformation
│   ├── api.ts           # HTTP client with JSON validation & error handling
│   ├── analysisService.ts # API endpoints for hazard analysis & regions catalog
│   └── exportService.ts # High-resolution PDF generation & CSV export
│
├── hooks/               # Custom reusable React business logic hooks
│   ├── useAnalysis.ts   # Analysis state machine, timeouts & abort controller
│   └── useRegions.ts    # Fetch and cache regions and hazards metadata
│
├── types/               # Strongly-typed domain models & interfaces
│   ├── region.ts        # Region & bounding box definitions
│   ├── hazard.ts        # Hazard types & indicator metric definitions
│   ├── report.ts        # Report, Annual metrics, Event rows, Trends & Tests
│   └── index.ts         # Centralized barrel export
│
├── utils/               # Pure utility helper functions & constants
│   ├── constants.ts     # Metric titles, quick year presets
│   └── formatters.ts    # Decimals, numbers, and coordinate formatters
│
├── styles/              # Global stylesheets and theme tokens
│   └── main.css         # CSS custom properties, layouts, responsive styles
│
├── App.tsx              # Root application layout shell
├── main.tsx             # DOM mount & React root entry point
└── vite-env.d.ts        # Vite environment typings
```

---

## 🎯 Architectural Principles & Guidelines

### 1. Separation of Concerns
- **`screens/`** coordinate application flow, combine multiple feature sections, and connect hooks to views.
- **`components/`** are purely presentational; they receive data and callbacks via props and don't make network calls directly.
- **`services/`** handle all HTTP requests, URL serialization, and external client libraries (e.g., `html2canvas`, `jspdf`, `fetch`).
- **`hooks/`** encapsulate stateful React logic (timers, AbortControllers, loading and error states) so components stay lean.
- **`types/`** keep interfaces segregated by business domain.

### 2. Path Aliases
Path alias `@/*` is configured in `tsconfig.json` and `vite.config.ts`:
```typescript
import { fetchAnalysis } from "@/services";
import { TrendChart } from "@/components/charts";
import type { Report } from "@/types";
```

### 3. Barrel Exports (`index.ts`)
Each major directory contains an `index.ts` barrel file allowing clean imports without verbose deep paths.
