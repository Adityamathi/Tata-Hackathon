# PRISM — Predictive Road Intelligence System for Mobility

Edge AI powered road hazard detection system that transforms raw road observations into actionable driver intelligence.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Webcam /   │────▶│  FastAPI     │────▶│  YOLOv11    │
│  Upload     │     │  Backend     │     │  Detection  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  Severity    │
                    │  Engine      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Next.js     │
                    │  Dashboard   │
                    └──────────────┘
```

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt
cd prism-ui && npm install && cd ..

# Run everything (backend :8000 + frontend :3000)
python start.py
```

Open http://localhost:3000

## Tabs

- **Home** — Hero page with Live Demo and GitHub links
- **Map** — Leaflet map with road hazard markers
- **Demo** — Upload or webcam live detection with severity analysis

## Tech Stack

- **Detection:** YOLOv11 (Ultralytics)
- **Backend:** FastAPI + Python
- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Maps:** Leaflet + OpenStreetMap
- **Models:** yolov8s / yolov8l / yolov8x (Git LFS)
