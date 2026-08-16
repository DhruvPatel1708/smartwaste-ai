import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'smartwaste.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Waste reward mapping
const WASTE_REWARD_MAP = {
  'Plastic': 500,
  'Paper': 200,
  'Metal': 700,
  'Glass': 400,
  'E-waste': 1000,
  'Organic': 100,
  'Mixed Waste': 100,
};

// Utility functions
function utcNow() {
  return new Date().toISOString();
}

function generatePickupId() {
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `WM-2026-${String(random).padStart(6, '0')}`;
}

function generateWastePassportId() {
  return `WP-${Math.floor(Math.random() * 90000) + 10000}`;
}

function calculateRewardPoints(category, weightKg, isSegregated = true) {
  const base = (WASTE_REWARD_MAP[category] || 100) * weightKg;
  const segregationBonus = isSegregated ? 500 : 0;
  return Math.floor(base + segregationBonus);
}

// Initialize database
function initializeDatabase() {
  // Citizens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      green_points INTEGER DEFAULT 0,
      lifetime_points INTEGER DEFAULT 0,
      redeemed_points INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  // Drivers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vehicle_id TEXT,
      status TEXT DEFAULT 'IDLE',
      created_at TEXT
    )
  `);

  // Vehicles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      driver_id TEXT,
      status TEXT DEFAULT 'IDLE',
      created_at TEXT
    )
  `);

  // Waste reports table
  db.exec(`
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
  `);

  // Pickup requests table
  db.exec(`
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
  `);

  // Reward transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reward_transactions (
      id TEXT PRIMARY KEY,
      citizen_id TEXT NOT NULL,
      pickup_id TEXT,
      points INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT,
      FOREIGN KEY(citizen_id) REFERENCES citizens(id)
    )
  `);

  // Waste passports table
  db.exec(`
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
  `);

  // Seed data
  const citizenCount = db.prepare('SELECT COUNT(*) as count FROM citizens').get().count;
  if (citizenCount === 0) {
    const now = utcNow();
    
    // Seed citizens
    const insertCitizen = db.prepare(
      'INSERT INTO citizens (id, name, email, green_points, lifetime_points, redeemed_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertCitizen.run('cit-1', 'Aarav Sharma', 'aarav@example.com', 12500, 12500, 0, now);
    insertCitizen.run('cit-2', 'Priya Nair', 'priya@example.com', 8200, 9000, 800, now);
    insertCitizen.run('cit-3', 'Rohan Mehta', 'rohan@example.com', 3400, 6400, 3000, now);

    // Seed drivers
    const insertDriver = db.prepare(
      'INSERT INTO drivers (id, name, vehicle_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    insertDriver.run('drv-1', 'Suresh Kumar', 'veh-1', 'ACTIVE', now);
    insertDriver.run('drv-2', 'Anita Verma', 'veh-2', 'ACTIVE', now);
    insertDriver.run('drv-3', 'Rakesh Singh', 'veh-3', 'IDLE', now);

    // Seed vehicles
    const insertVehicle = db.prepare(
      'INSERT INTO vehicles (id, name, driver_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    insertVehicle.run('veh-1', 'Waste Truck 12', 'drv-1', 'ACTIVE', now);
    insertVehicle.run('veh-2', 'Collection Van 07', 'drv-2', 'ACTIVE', now);
    insertVehicle.run('veh-3', 'Pickup Mini 03', 'drv-3', 'IDLE', now);

    // Seed waste reports and pickups
    const insertReport = db.prepare(
      'INSERT INTO waste_reports (id, pickup_id, citizen_id, waste_category, description, location, latitude, longitude, image_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertReport.run('rep-101', 'WM-2026-000101', 'cit-1', 'Plastic', 'Overflowing plastic waste near bus stand.', 'Sector 21, Bengaluru', 12.9716, 77.5946, 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80', 'VERIFIED', now);
    insertReport.run('rep-102', 'WM-2026-000102', 'cit-2', 'Mixed Waste', 'Mixed garbage dumped near park boundary.', 'Sector 12, Bengaluru', 12.9346, 77.5877, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', 'ASSIGNED', now);

    const insertPickup = db.prepare(
      'INSERT INTO pickup_requests (id, pickup_id, report_id, citizen_id, driver_id, vehicle_id, waste_category, location, image_url, status, weight_kg, collection_image_url, collection_date, verified_at, reward_points, waste_passport_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertPickup.run('pick-1', 'WM-2026-000101', 'rep-101', 'cit-1', 'drv-1', 'veh-1', 'Plastic', 'Sector 21, Bengaluru', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80', 'VERIFIED', 5.0, 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80', now, now, 3000, 'WP-82941', now);
    insertPickup.run('pick-2', 'WM-2026-000102', 'rep-102', 'cit-2', 'drv-2', 'veh-2', 'Mixed Waste', 'Sector 12, Bengaluru', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', 'ASSIGNED', null, null, null, null, 0, null, now);

    // Seed reward transactions
    const insertReward = db.prepare(
      'INSERT INTO reward_transactions (id, citizen_id, pickup_id, points, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertReward.run('rw-1', 'cit-1', 'WM-2026-000101', 3000, 'Verified Plastic Collection', now);
    insertReward.run('rw-2', 'cit-2', 'WM-2026-000102', 0, 'Pending Collection', now);

    // Seed waste passports
    const insertPassport = db.prepare(
      'INSERT INTO waste_passports (id, pickup_id, citizen_id, waste_type, weight_kg, collection_date, location, driver_name, vehicle_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertPassport.run('WP-82941', 'WM-2026-000101', 'cit-1', 'Plastic', 5.0, now, 'Sector 21, Bengaluru', 'Suresh Kumar', 'Waste Truck 12', 'Verified', now);

    console.log('✓ Database initialized with seed data');
  }
}

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'SmartWaste AI Backend is running' });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = `admin-token-${Date.now()}`;
    res.json({ token, user: username });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

// Get citizen wallet
app.get('/api/citizen/:citizenId/wallet', (req, res) => {
  const { citizenId } = req.params;
  const stmt = db.prepare('SELECT green_points, lifetime_points, redeemed_points FROM citizens WHERE id = ?');
  const row = stmt.get(citizenId);
  if (!row) {
    return res.status(404).json({ error: 'Citizen not found' });
  }
  res.json({
    green_points: row.green_points,
    lifetime_points: row.lifetime_points,
    redeemed_points: row.redeemed_points,
  });
});

// Create waste report
app.post('/api/waste-reports', (req, res) => {
  const { citizenId, wasteCategory, description, location, latitude, longitude, imageUrl } = req.body;
  if (!citizenId || !wasteCategory || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const citizen = db.prepare('SELECT id FROM citizens WHERE id = ?').get(citizenId);
  if (!citizen) {
    return res.status(404).json({ error: 'Citizen not found' });
  }

  const reportId = `rep-${uuidv4().slice(0, 8)}`;
  const pickupId = generatePickupId();
  const now = utcNow();

  const insertReport = db.prepare(
    'INSERT INTO waste_reports (id, pickup_id, citizen_id, waste_category, description, location, latitude, longitude, image_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertReport.run(reportId, pickupId, citizenId, wasteCategory, description, location, latitude || 12.9716, longitude || 77.5946, imageUrl, 'REQUESTED', now);

  const pickupRecId = `pick-${uuidv4().slice(0, 8)}`;
  const insertPickup = db.prepare(
    'INSERT INTO pickup_requests (id, pickup_id, report_id, citizen_id, waste_category, location, image_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertPickup.run(pickupRecId, pickupId, reportId, citizenId, wasteCategory, location, imageUrl, 'REQUESTED', now);

  res.status(201).json({ id: reportId, pickupId, status: 'REQUESTED', createdAt: now });
});

// Get all pickups
app.get('/api/pickups', (req, res) => {
  const stmt = db.prepare(
    'SELECT id, pickup_id, report_id, citizen_id, driver_id, vehicle_id, waste_category, location, image_url, status, weight_kg, collection_image_url, collection_date, verified_at, reward_points, waste_passport_id, created_at FROM pickup_requests ORDER BY created_at DESC'
  );
  const rows = stmt.all();
  const pickups = rows.map((row) => ({
    id: row.id,
    pickupId: row.pickup_id,
    reportId: row.report_id,
    citizenId: row.citizen_id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    wasteCategory: row.waste_category,
    location: row.location,
    imageUrl: row.image_url,
    status: row.status,
    weightKg: row.weight_kg,
    collectionImageUrl: row.collection_image_url,
    collectionDate: row.collection_date,
    verifiedAt: row.verified_at,
    rewardPoints: row.reward_points,
    wastePassportId: row.waste_passport_id,
    createdAt: row.created_at,
  }));
  res.json(pickups);
});

// Assign driver to pickup
app.post('/api/pickups/:pickupId/assign-driver', (req, res) => {
  const { pickupId } = req.params;
  const { driverId, vehicleId } = req.body;
  if (!driverId || !vehicleId) {
    return res.status(400).json({ error: 'Driver ID and Vehicle ID required' });
  }

  const stmt = db.prepare('UPDATE pickup_requests SET driver_id = ?, vehicle_id = ?, status = ? WHERE pickup_id = ?');
  stmt.run(driverId, vehicleId, 'ASSIGNED', pickupId);
  res.json({ status: 'ASSIGNED' });
});

// Update pickup status
app.post('/api/pickups/:pickupId/status', (req, res) => {
  const { pickupId } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status required' });
  }

  const stmt = db.prepare('UPDATE pickup_requests SET status = ? WHERE pickup_id = ?');
  stmt.run(status, pickupId);
  res.json({ status });
});

// Verify collection and award rewards
app.post('/api/pickups/:pickupId/verify', (req, res) => {
  const { pickupId } = req.params;
  const { weightKg, wasteCategory, collectionImageUrl } = req.body;
  if (!weightKg || !wasteCategory) {
    return res.status(400).json({ error: 'Weight and category required' });
  }

  const pickupStmt = db.prepare('SELECT citizen_id FROM pickup_requests WHERE pickup_id = ?');
  const pickup = pickupStmt.get(pickupId);
  if (!pickup) {
    return res.status(404).json({ error: 'Pickup not found' });
  }

  const citizenId = pickup.citizen_id;
  const rewardPoints = calculateRewardPoints(wasteCategory, weightKg, true);
  const passportId = generateWastePassportId();
  const now = utcNow();

  // Update pickup
  const updatePickup = db.prepare(
    'UPDATE pickup_requests SET status = ?, weight_kg = ?, collection_image_url = ?, verified_at = ?, reward_points = ?, waste_passport_id = ? WHERE pickup_id = ?'
  );
  updatePickup.run('VERIFIED', weightKg, collectionImageUrl, now, rewardPoints, passportId, pickupId);

  // Create reward transaction
  const rewardId = `rw-${uuidv4().slice(0, 8)}`;
  const insertReward = db.prepare(
    'INSERT INTO reward_transactions (id, citizen_id, pickup_id, points, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertReward.run(rewardId, citizenId, pickupId, rewardPoints, `Verified ${wasteCategory} Collection`, now);

  // Award points to citizen
  const updateCitizen = db.prepare(
    'UPDATE citizens SET green_points = green_points + ?, lifetime_points = lifetime_points + ? WHERE id = ?'
  );
  updateCitizen.run(rewardPoints, rewardPoints, citizenId);

  // Create waste passport
  const insertPassport = db.prepare(
    'INSERT INTO waste_passports (id, pickup_id, citizen_id, waste_type, weight_kg, collection_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertPassport.run(passportId, pickupId, citizenId, wasteCategory, weightKg, now, 'Verified', now);

  res.json({ status: 'VERIFIED', rewardPoints, wastePassportId: passportId });
});

// Get AI predictions
app.get('/api/predictions-ai', (req, res) => {
  const predictions = [
    {
      sector: 'Sector 21',
      predictedWaste: 1840,
      risk: 'HIGH',
      recommendation: 'Deploy overflow crew before peak traffic',
      forecast: [1450, 1600, 1720, 1810, 1840, 1890],
    },
    {
      sector: 'Sector 12',
      predictedWaste: 1315,
      risk: 'MEDIUM',
      recommendation: 'Add one extra route sweep',
      forecast: [1000, 1080, 1170, 1260, 1310, 1350],
    },
  ];
  res.json(predictions);
});

// Start server
initializeDatabase();
app.listen(PORT, () => {
  console.log(`\n✓ SmartWaste AI Backend running on http://localhost:${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(`✓ Admin login: username "admin", password "admin123"\n`);
});
