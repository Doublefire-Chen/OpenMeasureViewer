# OpenMeasureViewer

A general web-based platform to help researchers visualize and explore data exported from industry/lab measurement devices.

## Features

- **Frontend only** — No data transmission to server. All data processing and visualization run locally in the browser, keeping your data safe and private.
- **Plugin-based architecture** — Each measurement device is supported by an independent plugin. Developers can easily add new device support without changing the core code.
- **Multi-format ingestion** — Supports CSV, JSON, Excel, and other formats depending on the plugin/device.
- **Browser-style tabs** — Open multiple files and device types simultaneously, switch between them freely.
- **Interactive chart controls** — Customizable time range, Y-axis scale, mark lines (max/min/avg), and chart title.
- **Figure export** — Export charts as PNG images.
- **Local caching** — Data persists across browser sessions via localStorage.

## Supported Devices

| Device | Brand | Type | Data Format |
|--------|-------|------|-------------|
| YET-610L | Dikewei | Thermometer | CSV |

More devices can be added by developing a plugin under `src/plugins/`.

## Sample Data

A sample data file is included for testing:

```
plugin/YET-610L/data/sample-data.csv
```

Upload this file after selecting the **YET-610L Thermometer** device to explore the viewer.

## Tech Stack

- React + Vite + TypeScript
- Ant Design (UI components)
- ECharts (data visualization)

## Getting Started

```bash
npm install
npm run dev
```

## UI Design

- Equipment selection page with device name and image
- Modern white background with a focus on simplicity and ease of use
- Data visualization with interactive controls for time range, units, and chart customization
