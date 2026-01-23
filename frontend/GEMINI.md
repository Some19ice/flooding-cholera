# Cholera Surveillance Frontend

## Project Overview
This project is a React-based frontend application for the Cholera Environmental Surveillance System, specifically designed for Cross River State, Nigeria. It provides real-time monitoring, risk assessment, and data visualization to aid in the early detection and management of cholera outbreaks.

## Key Features
*   **Interactive Map:** Choropleth map visualization of risk levels across Local Government Areas (LGAs).
*   **Dashboard:** Real-time summary of key metrics (total cases, high-risk areas, etc.).
*   **Analytics:** Detailed charts and time-series data for cases, deaths, rainfall, and risk scores.
*   **Alerts System:** Automated notifications for high-risk conditions and case spikes.
*   **Satellite Data:** Integration with NASA GPM and Google Earth Engine data for environmental monitoring.
*   **Comparison Tool:** Side-by-side comparison of multiple LGAs.
*   **Data Management:** Interfaces for uploading case and environmental data.

## Tech Stack
*   **Core:** React 18, TypeScript, Vite
*   **State Management:** Zustand (Client State), TanStack Query (Server State/Caching)
*   **Styling:** Tailwind CSS, PostCSS
*   **Visualization:** Leaflet (Maps), Recharts (Charts)
*   **HTTP Client:** Axios
*   **Utilities:** date-fns, clsx, html-to-image

## Project Structure

```
/src
├── components/         # Feature-based component modules
│   ├── Alerts/         # Alert panels and notifications
│   ├── Compare/        # LGA comparison tools
│   ├── Dashboard/      # Main dashboard widgets (Charts, RiskPanel)
│   ├── Map/            # Map visualizations (ChoroplethMap)
│   ├── Satellite/      # Satellite data displays
│   ├── Search/         # Search functionality
│   ├── Upload/         # Data upload forms
│   └── common/         # Shared UI components (Toast, ErrorBoundary)
├── hooks/              # Custom React hooks (useApi.ts)
├── store/              # Zustand state store (appStore.ts)
├── types/              # TypeScript definitions (index.ts)
├── App.tsx             # Main application layout and routing
└── main.tsx            # Entry point
```

## Development Commands

### Setup & Run
*   **Install Dependencies:** `npm install`
*   **Start Dev Server:** `npm run dev`
*   **Build for Production:** `npm run build`
*   **Preview Build:** `npm run preview`

### Quality Assurance
*   **Lint Code:** `npm run lint`

## Architecture & Conventions

### State Management
*   **Server State:** Handled by **TanStack Query** (React Query). API calls are encapsulated in `src/hooks/useApi.ts` which exports custom hooks like `useLgas`, `useRiskScores`, etc.
*   **Client State:** Handled by **Zustand** in `src/store/appStore.ts`. This manages UI state (selected LGA, filters, sidebar toggle) and some shared data structures.

### Data Models
Key interfaces are defined in `src/types/index.ts`:
*   **LGA:** Represents a Local Government Area.
*   **RiskScore:** combined score derived from cases, rainfall, and vulnerability.
*   **Alert:** System-generated warnings based on risk levels.

### Styling
*   **Tailwind CSS** is used for all styling.
*   Components are responsive, with specific layouts for mobile and desktop (e.g., sidebar behavior).
