# Smart Waste Management Platform

A full-stack smart waste management application for municipal operations, built with React on the frontend and Flask with SQLite on the backend.

## Features

- Citizen waste issue reporting
- Vehicle tracking and dispatch visibility
- Waste generation hotspot analysis
- Route optimization for collection vehicles
- Persistent database-backed storage for reports and operational data

## Tech stack

- Frontend: React + Vite
- Backend: Flask + Python
- Database: SQLite

## Prerequisites

- Node.js 18+
- Python 3.11+

## Run locally

1. Create and activate the Python virtual environment:

   python3 -m venv .venv
   . .venv/bin/activate

2. Install backend dependencies:

   pip install -r requirements.txt

3. Start the backend API:

   python app.py

4. In a second terminal, start the frontend:

   npm install
   npm run dev -- --host 0.0.0.0

5. Open the app at:

   http://localhost:5173

## API endpoints

- GET /api/summary
- GET /api/reports
- POST /api/reports
- GET /api/vehicles
- GET /api/hotspots
- GET /api/routes

## Database

The project uses SQLite at the repository root as smartwaste.db. Report and vehicle data persist across app restarts.

## Verification

Run the Python tests with:

pytest -q

Build the frontend with:

npm run build
