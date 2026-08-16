from __future__ import annotations

import hashlib
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from math import hypot
from typing import Any, Dict, List
from uuid import uuid4

from flask import Flask, jsonify, request

DB_PATH = os.path.join(os.path.dirname(__file__), "smartwaste.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SMARTWASTE_SECRET", "smartwaste-admin-secret")
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Waste reward mapping
WASTE_REWARD_MAP = {
    "Plastic": 500,
    "Paper": 200,
    "Metal": 700,
    "Glass": 400,
    "E-waste": 1000,
    "Organic": 100,
    "Mixed Waste": 100,
}


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def admin_token(username: str) -> str:
    return hashlib.sha256(f"{username}:{app.config['SECRET_KEY']}".encode("utf-8")).hexdigest()


def require_admin() -> tuple[bool, Any]:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return False, (jsonify({"error": "Authentication required"}), 401)
    token = header.split(" ", 1)[1]
    if token != admin_token(ADMIN_USERNAME):
        return False, (jsonify({"error": "Invalid admin token"}), 401)
    return True, None


def seed_data() -> None:
    with get_db() as conn:
        # Citizens table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS citizens (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                green_points INTEGER DEFAULT 0,
                lifetime_points INTEGER DEFAULT 0,
                redeemed_points INTEGER DEFAULT 0,
                created_at TEXT
            )
            """
        )
        
        # Drivers table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS drivers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                vehicle_id TEXT,
                status TEXT DEFAULT 'IDLE',
                created_at TEXT
            )
            """
        )
        
        # Vehicles table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                driver_id TEXT,
                status TEXT DEFAULT 'IDLE',
                created_at TEXT
            )
            """
        )
        
        # Waste reports table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS waste_reports (
                id TEXT PRIMARY KEY,
                pickup_id TEXT UNIQUE,
                citizen_id TEXT NOT NULL,
                waste_category TEXT NOT NULL,
                description TEXT,
                location TEXT NOT NULL,
                latitude REAL,
                longitude REAL,
                image_url TEXT,
                status TEXT DEFAULT 'REQUESTED',
                created_at TEXT,
                FOREIGN KEY(citizen_id) REFERENCES citizens(id)
            )
            """
        )
        
        # Pickup requests table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pickup_requests (
                id TEXT PRIMARY KEY,
                pickup_id TEXT UNIQUE NOT NULL,
                report_id TEXT,
                citizen_id TEXT NOT NULL,
                driver_id TEXT,
                vehicle_id TEXT,
                waste_category TEXT NOT NULL,
                location TEXT NOT NULL,
                image_url TEXT,
                status TEXT DEFAULT 'REQUESTED',
                weight_kg REAL,
                collection_image_url TEXT,
                collection_date TEXT,
                verified_at TEXT,
                reward_points INTEGER DEFAULT 0,
                waste_passport_id TEXT,
                created_at TEXT,
                FOREIGN KEY(citizen_id) REFERENCES citizens(id),
                FOREIGN KEY(driver_id) REFERENCES drivers(id),
                FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
            )
            """
        )
        
        # Reward transactions table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reward_transactions (
                id TEXT PRIMARY KEY,
                citizen_id TEXT NOT NULL,
                pickup_id TEXT,
                points INTEGER NOT NULL,
                reason TEXT,
                created_at TEXT,
                FOREIGN KEY(citizen_id) REFERENCES citizens(id)
            )
            """
        )
        
        # Waste passports table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS waste_passports (
                id TEXT PRIMARY KEY,
                pickup_id TEXT,
                citizen_id TEXT NOT NULL,
                waste_type TEXT,
                weight_kg REAL,
                collection_date TEXT,
                location TEXT,
                driver_name TEXT,
                vehicle_name TEXT,
                status TEXT DEFAULT 'Verified',
                created_at TEXT,
                FOREIGN KEY(citizen_id) REFERENCES citizens(id)
            )
            """
        )
        
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT,
                description TEXT,
                status TEXT,
                severity TEXT,
                reporter TEXT,
                location TEXT,
                latitude REAL,
                longitude REAL,
                created_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS route_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id TEXT,
                route_name TEXT,
                driver_name TEXT,
                start_time TEXT,
                end_time TEXT,
                stop_count INTEGER,
                total_km REAL,
                status TEXT,
                created_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone TEXT,
                predicted_volume INTEGER,
                confidence INTEGER,
                recommended_action TEXT,
                created_at TEXT
            )
            """
        )

        # Seed citizens
        citizen_count = conn.execute("SELECT COUNT(*) FROM citizens").fetchone()[0]
        if citizen_count == 0:
            conn.executemany(
                """
                INSERT INTO citizens (id, name, email, green_points, lifetime_points, redeemed_points, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    ("cit-1", "Aarav Sharma", "aarav@example.com", 12500, 12500, 0, utc_now()),
                    ("cit-2", "Priya Nair", "priya@example.com", 8200, 9000, 800, utc_now()),
                    ("cit-3", "Rohan Mehta", "rohan@example.com", 3400, 6400, 3000, utc_now()),
                ],
            )
        
        # Seed drivers
        driver_count = conn.execute("SELECT COUNT(*) FROM drivers").fetchone()[0]
        if driver_count == 0:
            conn.executemany(
                """
                INSERT INTO drivers (id, name, vehicle_id, status, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    ("drv-1", "Suresh Kumar", "veh-1", "ACTIVE", utc_now()),
                    ("drv-2", "Anita Verma", "veh-2", "ACTIVE", utc_now()),
                    ("drv-3", "Rakesh Singh", "veh-3", "IDLE", utc_now()),
                ],
            )
        
        # Seed vehicles
        vehicle_count = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
        if vehicle_count == 0:
            conn.executemany(
                """
                INSERT INTO vehicles (id, name, driver_id, status, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    ("veh-1", "Waste Truck 12", "drv-1", "ACTIVE", utc_now()),
                    ("veh-2", "Collection Van 07", "drv-2", "ACTIVE", utc_now()),
                    ("veh-3", "Pickup Mini 03", "drv-3", "IDLE", utc_now()),
                ],
            )

        # Seed waste reports and pickups
        report_count = conn.execute("SELECT COUNT(*) FROM waste_reports").fetchone()[0]
        if report_count == 0:
            conn.executemany(
                """
                INSERT INTO waste_reports (id, pickup_id, citizen_id, waste_category, description, location, latitude, longitude, image_url, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "rep-101",
                        "WM-2026-000101",
                        "cit-1",
                        "Plastic",
                        "Overflowing plastic waste near bus stand.",
                        "Sector 21, Bengaluru",
                        12.9716,
                        77.5946,
                        "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80",
                        "VERIFIED",
                        utc_now(),
                    ),
                    (
                        "rep-102",
                        "WM-2026-000102",
                        "cit-2",
                        "Mixed Waste",
                        "Mixed garbage dumped near park boundary.",
                        "Sector 12, Bengaluru",
                        12.9346,
                        77.5877,
                        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
                        "ASSIGNED",
                        utc_now(),
                    ),
                ],
            )
            
            conn.executemany(
                """
                INSERT INTO pickup_requests (id, pickup_id, report_id, citizen_id, driver_id, vehicle_id, waste_category, location, image_url, status, weight_kg, collection_image_url, collection_date, verified_at, reward_points, waste_passport_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "pick-1",
                        "WM-2026-000101",
                        "rep-101",
                        "cit-1",
                        "drv-1",
                        "veh-1",
                        "Plastic",
                        "Sector 21, Bengaluru",
                        "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80",
                        "VERIFIED",
                        5.0,
                        "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80",
                        utc_now(),
                        utc_now(),
                        3000,
                        "WP-82941",
                        utc_now(),
                    ),
                    (
                        "pick-2",
                        "WM-2026-000102",
                        "rep-102",
                        "cit-2",
                        "drv-2",
                        "veh-2",
                        "Mixed Waste",
                        "Sector 12, Bengaluru",
                        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
                        "ASSIGNED",
                        None,
                        None,
                        None,
                        None,
                        0,
                        None,
                        utc_now(),
                    ),
                ],
            )
            
            conn.executemany(
                """
                INSERT INTO reward_transactions (id, citizen_id, pickup_id, points, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("rw-1", "cit-1", "WM-2026-000101", 3000, "Verified Plastic Collection", utc_now()),
                    ("rw-2", "cit-2", "WM-2026-000102", 0, "Pending Collection", utc_now()),
                ],
            )
            
            conn.executemany(
                """
                INSERT INTO waste_passports (id, pickup_id, citizen_id, waste_type, weight_kg, collection_date, location, driver_name, vehicle_name, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "WP-82941",
                        "WM-2026-000101",
                        "cit-1",
                        "Plastic",
                        5.0,
                        utc_now(),
                        "Sector 21, Bengaluru",
                        "Suresh Kumar",
                        "Waste Truck 12",
                        "Verified",
                        utc_now(),
                    ),
                ],
            )

        report_count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
        if report_count == 0:
            conn.executemany(
                """
                INSERT INTO reports (id, title, category, description, status, severity, reporter, location, latitude, longitude, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "SR-1001",
                        "Overflowing bin near City Plaza",
                        "bin_overflow",
                        "Public bin is overflowing during peak hours and attracting stray animals.",
                        "open",
                        "high",
                        "Amina K.",
                        "City Plaza",
                        12.9716,
                        77.5946,
                        utc_now(),
                    ),
                    (
                        "SR-1002",
                        "Illegal dumping by roadside",
                        "illegal_dumping",
                        "Construction debris and mixed waste dumped behind the bus stand.",
                        "in_progress",
                        "critical",
                        "Rohan S.",
                        "Bus Stand Road",
                        12.9796,
                        77.6018,
                        (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    ),
                ],
            )

        route_count = conn.execute("SELECT COUNT(*) FROM route_history").fetchone()[0]
        if route_count == 0:
            conn.executemany(
                """
                INSERT INTO route_history (vehicle_id, route_name, driver_name, start_time, end_time, stop_count, total_km, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "veh-1",
                        "Sector 21 Route",
                        "Suresh Kumar",
                        (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        (datetime.now(timezone.utc) - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        4,
                        18.2,
                        "completed",
                        utc_now(),
                    ),
                ],
            )

        prediction_count = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        if prediction_count == 0:
            conn.executemany(
                """
                INSERT INTO predictions (zone, predicted_volume, confidence, recommended_action, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    ("Sector 21", 1840, 88, "Deploy overflow crew before peak traffic", utc_now()),
                    ("Sector 12", 1315, 81, "Add one extra route sweep", utc_now()),
                ],
            )

        conn.commit()


seed_data()


def fetch_reports() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM reports ORDER BY created_at DESC").fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "category": row["category"],
            "description": row["description"],
            "status": row["status"],
            "severity": row["severity"],
            "reporter": row["reporter"],
            "location": row["location"],
            "coordinates": {"lat": row["latitude"], "lng": row["longitude"]},
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def fetch_vehicles() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM vehicles ORDER BY id").fetchall()
    return [
        {
            "id": row["id"],
            "driver": row["driver"],
            "route": row["route"],
            "status": row["status"],
            "location": row["location"],
            "coordinates": {"lat": row["latitude"], "lng": row["longitude"]},
            "capacity_used": row["capacity_used"],
            "last_updated": row["last_updated"],
        }
        for row in rows
    ]


def fetch_route_history() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM route_history ORDER BY created_at DESC").fetchall()
    return [
        {
            "id": row["id"],
            "vehicle_id": row["vehicle_id"],
            "route_name": row["route_name"],
            "driver_name": row["driver_name"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "stop_count": row["stop_count"],
            "total_km": row["total_km"],
            "status": row["status"],
        }
        for row in rows
    ]


def build_predictions() -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}
    reports = fetch_reports()
    for report in reports:
        zone = report["location"].split()[0] if " " in report["location"] else report["location"]
        zone_key = zone or "Unknown"
        if zone_key not in grouped:
            grouped[zone_key] = {"count": 0, "weight": 0}
        grouped[zone_key]["count"] += 1
        grouped[zone_key]["weight"] += {"low": 1, "medium": 2, "high": 3, "critical": 4}[report["severity"]]

    prediction_rows: List[Dict[str, Any]] = []
    for zone, data in grouped.items():
        predicted_volume = max(20, data["count"] * 18 + data["weight"] * 8)
        confidence = min(98, 60 + data["count"] * 10 + data["weight"] * 5)
        recommended_action = (
            "Dispatch overflow crew before peak traffic"
            if confidence > 80
            else "Schedule extra collection sweep"
        )
        prediction_rows.append(
            {
                "zone": zone,
                "predicted_volume": predicted_volume,
                "confidence": confidence,
                "recommended_action": recommended_action,
            }
        )
    return sorted(prediction_rows, key=lambda item: item["predicted_volume"], reverse=True)


def fetch_predictions() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM predictions ORDER BY created_at DESC").fetchall()
    if rows:
        return [
            {
                "id": row["id"],
                "zone": row["zone"],
                "predicted_volume": row["predicted_volume"],
                "confidence": row["confidence"],
                "recommended_action": row["recommended_action"],
            }
            for row in rows
        ]
    predictions = build_predictions()
    with get_db() as conn:
        for entry in predictions:
            conn.execute(
                "INSERT INTO predictions (zone, predicted_volume, confidence, recommended_action, created_at) VALUES (?, ?, ?, ?, ?)",
                (entry["zone"], entry["predicted_volume"], entry["confidence"], entry["recommended_action"], utc_now()),
            )
        conn.commit()
    return predictions


def calculate_hotspots() -> List[Dict[str, Any]]:
    hotspots: Dict[str, Dict[str, Any]] = {}
    for report in fetch_reports():
        zone = report["location"].split()[0] if " " in report["location"] else report["location"]
        zone_key = zone if zone else "Unknown"
        if zone_key not in hotspots:
            hotspots[zone_key] = {
                "zone": zone_key,
                "score": 0,
                "ticket_count": 0,
                "priority": "low",
                "risk_level": 0,
            }
        hotspot = hotspots[zone_key]
        severity_weight = {"low": 1, "medium": 2, "high": 3, "critical": 4}[report["severity"]]
        hotspot["score"] += 10 + severity_weight * 12 + (1 if report["status"] != "resolved" else 0) * 8
        hotspot["ticket_count"] += 1

    calculated = []
    for data in hotspots.values():
        data["risk_level"] = min(100, max(10, data["score"]))
        if data["risk_level"] > 70:
            data["priority"] = "critical"
        elif data["risk_level"] > 45:
            data["priority"] = "high"
        elif data["risk_level"] > 25:
            data["priority"] = "medium"
        calculated.append(data)
    return sorted(calculated, key=lambda item: item["score"], reverse=True)


def distance_km(a: Dict[str, float], b: Dict[str, float]) -> float:
    return hypot(a["lat"] - b["lat"], a["lng"] - b["lng"]) * 111


def optimize_routes() -> List[Dict[str, Any]]:
    vehicles = fetch_vehicles()
    reports = fetch_reports()
    plans: List[Dict[str, Any]] = []
    for vehicle in vehicles:
        remaining = list(reports)
        ordered = []
        current = vehicle["coordinates"]
        while remaining:
            next_report = min(
                remaining,
                key=lambda report: distance_km(current, report["coordinates"]),
            )
            ordered.append(next_report)
            current = next_report["coordinates"]
            remaining.remove(next_report)

        estimated_minutes = sum(max(8, round(distance_km(vehicle["coordinates"], r["coordinates"]) * 12)) for r in ordered)
        plans.append(
            {
                "vehicle_id": vehicle["id"],
                "driver": vehicle["driver"],
                "route": vehicle["route"],
                "estimated_minutes": estimated_minutes,
                "stops": [r["location"] for r in ordered],
                "next_stop": ordered[0]["location"] if ordered else "Depot",
            }
        )
    return plans


@app.route("/")
def index():
    return jsonify({"message": "Smart Waste API is running"})


@app.route("/api/admin/login", methods=["POST", "OPTIONS"])
def admin_login():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get("username")
    password = payload.get("password")
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({"token": admin_token(username), "user": username})
    return jsonify({"error": "Invalid admin credentials"}), 401


@app.route("/api/summary")
def api_summary():
    reports = fetch_reports()
    vehicles = fetch_vehicles()
    return jsonify(
        {
            "total_reports": len(reports),
            "open_reports": sum(1 for report in reports if report["status"] == "open"),
            "in_progress": sum(1 for report in reports if report["status"] == "in_progress"),
            "resolved": sum(1 for report in reports if report["status"] == "resolved"),
            "active_vehicles": sum(1 for vehicle in vehicles if vehicle["status"] == "on_route"),
        }
    )


@app.route("/api/reports", methods=["GET", "POST", "OPTIONS"])
def reports_api():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if request.method == "POST":
        payload = request.get_json(force=True, silent=True) or {}
        if not payload.get("title"):
            return jsonify({"error": "Title is required"}), 400

        report_id = f"SR-{1000 + len(fetch_reports()) + 1}"
        new_report = {
            "id": report_id,
            "title": payload["title"],
            "category": payload.get("category", "general_waste"),
            "description": payload.get("description", "Citizen reported issue."),
            "status": "open",
            "severity": payload.get("severity", "medium"),
            "reporter": payload.get("reporter", "Citizen"),
            "location": payload.get("location", "Unspecified"),
            "latitude": float(payload.get("latitude", 12.97)),
            "longitude": float(payload.get("longitude", 77.59)),
            "created_at": utc_now(),
        }

        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO reports (id, title, category, description, status, severity, reporter, location, latitude, longitude, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_report["id"],
                    new_report["title"],
                    new_report["category"],
                    new_report["description"],
                    new_report["status"],
                    new_report["severity"],
                    new_report["reporter"],
                    new_report["location"],
                    new_report["latitude"],
                    new_report["longitude"],
                    new_report["created_at"],
                ),
            )
            conn.commit()

        return jsonify({
            **new_report,
            "coordinates": {"lat": new_report["latitude"], "lng": new_report["longitude"]},
        }), 201

    return jsonify(fetch_reports())


@app.route("/api/vehicles")
def vehicles_api():
    return jsonify(fetch_vehicles())


@app.route("/api/hotspots")
def hotspots_api():
    return jsonify(calculate_hotspots())


@app.route("/api/routes")
def routes_api():
    return jsonify(optimize_routes())


@app.route("/api/route-history")
def route_history_api():
    ok, response = require_admin()
    if not ok:
        return response
    return jsonify(fetch_route_history())


@app.route("/api/predictions")
def predictions_api():
    ok, response = require_admin()
    if not ok:
        return response
    return jsonify(fetch_predictions())


# ===== MVP Workflow Endpoints =====

@app.route("/api/citizen/<citizen_id>/wallet", methods=["GET"])
def get_citizen_wallet(citizen_id):
    """Get citizen's green wallet information."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT green_points, lifetime_points, redeemed_points FROM citizens WHERE id = ?",
            (citizen_id,),
        ).fetchone()
        if not row:
            return jsonify({"error": "Citizen not found"}), 404
        return jsonify({
            "green_points": row[0],
            "lifetime_points": row[1],
            "redeemed_points": row[2],
        })


@app.route("/api/waste-reports", methods=["POST"])
def create_waste_report():
    """Create a new waste report and pickup request."""
    payload = request.get_json(force=True, silent=True) or {}
    citizen_id = payload.get("citizenId")
    waste_category = payload.get("wasteCategory")
    location = payload.get("location")
    
    if not all([citizen_id, waste_category, location]):
        return jsonify({"error": "Missing required fields"}), 400
    
    with get_db() as conn:
        # Verify citizen exists
        citizen = conn.execute("SELECT id FROM citizens WHERE id = ?", (citizen_id,)).fetchone()
        if not citizen:
            return jsonify({"error": "Citizen not found"}), 404
        
        report_id = f"rep-{uuid4().hex[:8]}"
        pickup_id = f"WM-2026-{str(len(conn.execute('SELECT id FROM waste_reports').fetchall()) + 100001)[-6:]}"
        
        now = utc_now()
        conn.execute(
            """
            INSERT INTO waste_reports (id, pickup_id, citizen_id, waste_category, description, location, latitude, longitude, image_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                pickup_id,
                citizen_id,
                waste_category,
                payload.get("description", ""),
                location,
                float(payload.get("latitude", 12.9716)),
                float(payload.get("longitude", 77.5946)),
                payload.get("imageUrl", ""),
                "REQUESTED",
                now,
            ),
        )
        
        # Create corresponding pickup request
        pickup_id_rec = f"pick-{uuid4().hex[:8]}"
        conn.execute(
            """
            INSERT INTO pickup_requests (id, pickup_id, report_id, citizen_id, waste_category, location, image_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pickup_id_rec,
                pickup_id,
                report_id,
                citizen_id,
                waste_category,
                location,
                payload.get("imageUrl", ""),
                "REQUESTED",
                now,
            ),
        )
        conn.commit()
        
        return jsonify({
            "id": report_id,
            "pickupId": pickup_id,
            "status": "REQUESTED",
            "createdAt": now,
        }), 201


@app.route("/api/pickups", methods=["GET"])
def get_pickups():
    """Get all pickup requests."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, pickup_id, report_id, citizen_id, driver_id, vehicle_id, waste_category, location, image_url, status, weight_kg, collection_image_url, collection_date, verified_at, reward_points, waste_passport_id, created_at
            FROM pickup_requests
            ORDER BY created_at DESC
            """
        ).fetchall()
    
    pickups = []
    for row in rows:
        pickups.append({
            "id": row[0],
            "pickupId": row[1],
            "reportId": row[2],
            "citizenId": row[3],
            "driverId": row[4],
            "vehicleId": row[5],
            "wasteCategory": row[6],
            "location": row[7],
            "imageUrl": row[8],
            "status": row[9],
            "weightKg": row[10],
            "collectionImageUrl": row[11],
            "collectionDate": row[12],
            "verifiedAt": row[13],
            "rewardPoints": row[14],
            "wastePassportId": row[15],
            "createdAt": row[16],
        })
    
    return jsonify(pickups)


@app.route("/api/pickups/<pickup_id>/assign-driver", methods=["POST"])
def assign_driver_to_pickup(pickup_id):
    """Assign a driver to a pickup request."""
    payload = request.get_json(force=True, silent=True) or {}
    driver_id = payload.get("driverId")
    vehicle_id = payload.get("vehicleId")
    
    if not driver_id or not vehicle_id:
        return jsonify({"error": "Driver ID and Vehicle ID required"}), 400
    
    with get_db() as conn:
        conn.execute(
            """
            UPDATE pickup_requests
            SET driver_id = ?, vehicle_id = ?, status = 'ASSIGNED'
            WHERE pickup_id = ?
            """,
            (driver_id, vehicle_id, pickup_id),
        )
        conn.commit()
    
    return jsonify({"status": "ASSIGNED"})


@app.route("/api/pickups/<pickup_id>/status", methods=["POST"])
def update_pickup_status(pickup_id):
    """Update pickup status."""
    payload = request.get_json(force=True, silent=True) or {}
    status = payload.get("status")
    
    if not status:
        return jsonify({"error": "Status required"}), 400
    
    with get_db() as conn:
        conn.execute(
            "UPDATE pickup_requests SET status = ? WHERE pickup_id = ?",
            (status, pickup_id),
        )
        conn.commit()
    
    return jsonify({"status": status})


@app.route("/api/pickups/<pickup_id>/verify", methods=["POST"])
def verify_collection(pickup_id):
    """Verify collection and award rewards to citizen."""
    payload = request.get_json(force=True, silent=True) or {}
    weight_kg = float(payload.get("weightKg", 0))
    waste_category = payload.get("wasteCategory")
    collection_image_url = payload.get("collectionImageUrl")
    
    if not weight_kg or not waste_category:
        return jsonify({"error": "Weight and category required"}), 400
    
    with get_db() as conn:
        # Get pickup details
        pickup = conn.execute(
            "SELECT citizen_id FROM pickup_requests WHERE pickup_id = ?",
            (pickup_id,),
        ).fetchone()
        
        if not pickup:
            return jsonify({"error": "Pickup not found"}), 404
        
        citizen_id = pickup[0]
        
        # Calculate reward points
        base_points = WASTE_REWARD_MAP.get(waste_category, 100)
        segregation_bonus = 500  # Assume segregated waste
        reward_points = int(base_points * weight_kg) + segregation_bonus
        
        # Generate waste passport ID
        passport_id = f"WP-{uuid4().hex[:8].upper()}"
        now = utc_now()
        
        # Update pickup with verification info
        conn.execute(
            """
            UPDATE pickup_requests
            SET status = 'VERIFIED', weight_kg = ?, collection_image_url = ?, 
                verified_at = ?, reward_points = ?, waste_passport_id = ?
            WHERE pickup_id = ?
            """,
            (weight_kg, collection_image_url, now, reward_points, passport_id, pickup_id),
        )
        
        # Create reward transaction
        reward_id = f"rw-{uuid4().hex[:8]}"
        conn.execute(
            """
            INSERT INTO reward_transactions (id, citizen_id, pickup_id, points, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (reward_id, citizen_id, pickup_id, reward_points, f"Verified {waste_category} Collection", now),
        )
        
        # Award points to citizen
        conn.execute(
            """
            UPDATE citizens
            SET green_points = green_points + ?, lifetime_points = lifetime_points + ?
            WHERE id = ?
            """,
            (reward_points, reward_points, citizen_id),
        )
        
        # Create waste passport
        conn.execute(
            """
            INSERT INTO waste_passports (id, pickup_id, citizen_id, waste_type, weight_kg, collection_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (passport_id, pickup_id, citizen_id, waste_category, weight_kg, now, "Verified", now),
        )
        
        conn.commit()
    
    return jsonify({
        "status": "VERIFIED",
        "rewardPoints": reward_points,
        "wastePassportId": passport_id,
    }), 200


@app.route("/api/predictions-ai", methods=["GET"])
def get_ai_predictions():
    """Get AI waste predictions for municipal dashboard."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT zone, predicted_volume, confidence, recommended_action FROM predictions ORDER BY predicted_volume DESC"
        ).fetchall()
    
    predictions = []
    for row in rows:
        predictions.append({
            "sector": row[0],
            "predictedWaste": row[1],
            "risk": "HIGH" if row[2] > 80 else "MEDIUM" if row[2] > 60 else "LOW",
            "recommendation": row[3],
            "forecast": [row[1] - 100, row[1] - 50, row[1], row[1] + 50, row[1] + 100, row[1] + 150],
        })
    
    return jsonify(predictions)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
