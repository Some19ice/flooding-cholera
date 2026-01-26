# Cholera Environmental Surveillance Dashboard: Feature Overview

The Cholera Environmental Surveillance Dashboard provides a comprehensive, real-time view of environmental risks and epidemiological data to support early warning and response for cholera outbreaks in Cross River State.

## Core Features

### 1. Geospatial Risk Map
The centerpiece of the dashboard is an interactive **Choropleth Map** that visualizes risk levels across all Local Government Areas (LGAs).
*   **Color-Coded Risk:** LGAs are colored based on a composite risk score:
    *   **Red:** High Risk (Immediate attention required)
    *   **Yellow:** Medium Risk (Monitoring required)
    *   **Green:** Low Risk
*   **Interactive Tooltips:** Hovering over an LGA reveals detailed metrics, including current risk score, recent case counts, and environmental indices.

### 2. Real-Time Environmental Feed (New!)
A dedicated **Satellite Feed** panel now integrates real-time satellite imagery to monitor environmental conditions.
*   **Live Satellite Imagery:** Displays the latest available satellite thumbnails for high-risk LGAs.
*   **Flood Detection:** visualizes flood extent using Sentinel-1 SAR (Synthetic Aperture Radar) data, allowing for flood monitoring even through cloud cover.
*   **Water Analysis:** Overlays detected water bodies in blue over the satellite imagery to clearly identify flooded zones.
*   **Automated Prioritization:** Automatically surfaces imagery for the LGAs with the highest calculated risk scores.

### 3. Key Performance Indicators (KPIs)
At-a-glance cards provide a summary of the current situation:
*   **Confirmed Cases:** Total cumulative cases reported.
*   **Active Outbreaks:** Number of LGAs currently classified as "High Risk".
*   **Alert Level:** System-wide alert status (Low, Medium, High).
*   **Rainfall Monitoring:** 7-day average rainfall accumulation against critical thresholds.

### 4. Analytical Charts
*   **Case Rate vs. Precipitation:** A correlation chart overlaying confirmed cases with rainfall data over the past 7 days to identify weather-driven outbreaks.
*   **Flooding Risk by LGA:** A comparative bar chart ranking LGAs by their current flood risk percentage.

## Satellite Monitoring Panel
A specialized view for detailed environmental analysis:
*   **Multi-Source Data:** Integrates data from **NASA GPM** (Precipitation) and **Google Earth Engine** (Flood/Vegetation).
*   **Indices:**
    *   **NDWI (Normalized Difference Water Index):** Measures water content in leaves and soil to detect flooding.
    *   **NDVI (Normalized Difference Vegetation Index):** Monitors vegetation health.
*   **Trend Analysis:** 30-day rainfall trends to track seasonal patterns.

## Data Management & Alerts
*   **Automated Alerts:** The system generates alerts for high-risk conditions (e.g., "High Flood Risk" or "Case Spike").
*   **Data Upload:** Facilities for uploading new case reports and environmental data csv files.
*   **Export:** Capability to export reports and charts for offline analysis.
