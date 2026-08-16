# 🌱 SmartWaste AI

**AI-powered waste management platform for Smart India Hackathon 2026**

A complete solution for smart waste collection with citizen reporting, driver verification, and municipal optimization.

> **Core Principle**: Citizens earn green points **ONLY after their waste is collected and verified** — not just for reporting!

---

## ✨ What It Does

- 📱 **Citizens report waste** with location and photo
- 🚚 **Drivers collect waste** and verify weight
- 📊 **Municipal officers** assign routes and track progress
- 🎁 **Automatic rewards** after verified collection
- 🗺️ **Live hotspot map** showing waste concentration areas
- 🤖 **AI predictions** for waste volume forecasting
- 📈 **Route optimization** for efficient collection

---

## 🚀 Quick Start (Easy for Non-Technical Users)

### What You Need
- **Just one thing**: Node.js (download from [nodejs.org](https://nodejs.org))
- Node.js comes with npm (package manager) - no need to install separately

### Step-by-Step Setup (5 minutes)

#### **1️⃣ First Time Only: Install Dependencies**

Open terminal/command prompt in the project folder and run:
```bash
npm install
```
This downloads everything needed. You only need to do this once!

#### **2️⃣ Run Everything in One Terminal**

```bash
npm run dev
```

You'll see both starting:
```
✓ SmartWaste AI Backend running on http://localhost:5000
✓ API available at http://localhost:5000/api
Admin login: username "admin", password "admin123"

➜  Local:   http://localhost:5176/
```

✅ **Both backend and frontend are ready!**

#### **3️⃣ Open in Browser**

Click this link or copy-paste in browser: **http://localhost:5176**

🎉 **Done! Everything is running in one terminal!**

---

## 📖 How to Use

### **👤 Citizen View**
1. Click the **"Citizen"** button at the top
2. In the **"Report Waste"** section:
   - Select waste type (Plastic, Metal, E-waste, etc.)
   - Add description and location
   - Add photo URL (or leave default)
   - Click **"Submit Report"**
3. See your **Green Points** in the wallet
4. ⚠️ **You get points only when driver verifies the collection!**

### **🚗 Driver View**
1. Click the **"Driver"** button at the top
2. See list of all waste pickups to collect
3. Click **"Arrived"** when you reach location
4. Click **"Collect Waste"** to mark collected
5. In **"Collection Verification"** section:
   - Select waste type
   - Enter weight in kg
   - Add photo URL
   - Click **"Verify Collection"** → Citizen gets rewarded! ✓

### **🏛️ Municipal View**
1. Click the **"Municipal"** button at the top
2. **Hotspot Map** - see where most waste is reported (red pins)
3. **AI Predictions** - see which areas will need collection tomorrow
4. **Pickup Requests Table** - assign drivers to pending requests
5. **Route Optimization** - follow suggested route for efficiency

---

## 🔐 Default Test Account

Admin credentials (for advanced features):
- **Username**: `admin`
- **Password**: `admin123`

---

## 📊 Test Data Included

The app starts with sample data:
- **3 Citizens**: Aarav, Priya, Rohan (with green points)
- **3 Drivers**: Suresh, Anita, Rakesh (ready for collection)
- **3 Vehicles**: Waste Trucks and collection vans
- **Sample waste reports** with locations

Try the app immediately without adding data!

---

## 💻 Technical Details (For Developers)

```
Technology Stack:
├── Frontend: React + TypeScript + Tailwind + Leaflet + Recharts
├── Backend: Express.js (Node.js)
└── Database: SQLite (local file)
```

### **File Structure**

```
smartwaste-ai/
├── server.js                    ← Backend (all-in-one file)
├── package.json                 ← Dependencies
├── smartwaste.db                ← Database (auto-created)
├── src/
│   ├── App.tsx                  ← Main app component
│   ├── lib/
│   │   ├── api.ts               ← Backend API calls
│   │   ├── mock-data.ts         ← Demo data
│   │   └── utils.ts             ← Helper functions
│   └── types.ts                 ← Data types
└── vite.config.ts               ← Frontend config
```

### **Backend Routes**

| Method | Route | What it does |
|--------|-------|-------------|
| POST | `/api/waste-reports` | Create new waste report |
| GET | `/api/pickups` | Get all pickups |
| POST | `/api/pickups/:id/assign-driver` | Assign driver to pickup |
| POST | `/api/pickups/:id/status` | Update pickup status |
| POST | `/api/pickups/:id/verify` | Verify collection, award points |
| GET | `/api/citizen/:id/wallet` | Get citizen's green points |
| GET | `/api/predictions-ai` | Get AI waste predictions |

---

## 🛑 How to Stop

Press **Ctrl + C** in the terminal to stop everything at once

---

## ❓ Common Issues & Solutions

### **Error: "Port already in use"**
```bash
# If port 5000 is taken, use a different port:
PORT=5001 npm start
```

### **Error: "npm: command not found"**
→ Node.js not installed. Download from https://nodejs.org

### **Frontend won't load**
→ Make sure backend is running (`npm start` in first terminal)

### **Blank page in browser**
→ Wait 10 seconds for Vite to build, then refresh browser

### **Want to reset database**
→ Delete `smartwaste.db` file and restart - it recreates automatically

---

## 🎯 The Main Rule

**Citizens earn green points ONLY when waste is verified collected**

```
Timeline:
1. Citizen reports waste → Status: REQUESTED
2. Municipal assigns driver → Status: ASSIGNED  
3. Driver marks collected → Status: COLLECTED
4. Driver verifies weight → Status: VERIFIED + POINTS AWARDED ✅
```

This ensures proper incentive alignment!

---

## 📝 Example Workflow

### **Step 1: Citizen Reports**
- Go to Citizen tab
- Report plastic waste at "Sector 21"
- Submit report (0 points yet)

### **Step 2: Municipal Assigns**
- Go to Municipal tab
- Find the new report
- Click "Assign Driver" → Pick a driver

### **Step 3: Driver Collects**
- Go to Driver tab
- See the assigned pickup
- Click "Arrived" → "Collect Waste" → "Complete Collection"

### **Step 4: Verification & Reward**
- Still in Driver tab
- In "Collection Verification" section:
  - Select "Plastic"
  - Enter weight: 5 kg
  - Click "Verify Collection"
- 🎉 Citizen's wallet now shows +3000 Green Points!

---

## 🚀 Deployment (For Later)

To run on another computer:
1. Install Node.js
2. Copy the project folder
3. Run `npm install`
4. Run `npm run dev`
5. Done! Everything runs in one terminal

---

## ✅ Before Demo Checklist

- [ ] Node.js installed
- [ ] Opened project folder in terminal
- [ ] Ran `npm install`
- [ ] Running: `npm run dev`
- [ ] Browser open at http://localhost:5176
- [ ] Can see three tabs: Citizen, Driver, Municipal
- [ ] Demo data visible (citizens, drivers, pickups)

---

## 📄 License

Smart India Hackathon 2026

---

**Built with ❤️ for smart waste management**

Questions? Contact the dev team!
