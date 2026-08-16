import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000'

const fallbackSummary = {
  total_reports: 4,
  open_reports: 2,
  in_progress: 1,
  resolved: 1,
  active_vehicles: 2,
}

const fallbackReports = [
  {
    id: 'SR-1001',
    title: 'Overflowing bin near City Plaza',
    category: 'bin_overflow',
    status: 'open',
    severity: 'high',
    reporter: 'Amina K.',
    location: 'City Plaza',
    description: 'Public bin is overflowing during peak hours and attracting stray animals.',
    created_at: '2026-08-16T08:20:00Z',
  },
  {
    id: 'SR-1002',
    title: 'Illegal dumping by roadside',
    category: 'illegal_dumping',
    status: 'in_progress',
    severity: 'critical',
    reporter: 'Rohan S.',
    location: 'Bus Stand Road',
    description: 'Construction debris and mixed waste dumped behind the bus stand.',
    created_at: '2026-08-16T06:20:00Z',
  },
]

const fallbackVehicles = [
  {
    id: 'VW-201',
    driver: 'Sunil N.',
    route: 'North Sector',
    status: 'on_route',
    location: 'City Plaza',
    capacity_used: 68,
    coordinates: { lat: 12.9714, lng: 77.5941 },
  },
  {
    id: 'VW-202',
    driver: 'Meera D.',
    route: 'West Market',
    status: 'idle',
    location: 'Depot Center',
    capacity_used: 42,
    coordinates: { lat: 12.9553, lng: 77.6182 },
  },
]

const fallbackHotspots = [
  { zone: 'City', score: 86, ticket_count: 2, priority: 'critical', risk_level: 86 },
  { zone: 'Bus', score: 63, ticket_count: 1, priority: 'high', risk_level: 63 },
  { zone: 'Market', score: 41, ticket_count: 1, priority: 'medium', risk_level: 41 },
]

const fallbackRoutes = [
  {
    vehicle_id: 'VW-201',
    driver: 'Sunil N.',
    route: 'North Sector',
    estimated_minutes: 34,
    next_stop: 'City Plaza',
    stops: ['City Plaza', 'Bus Stand Road', 'Market Lane'],
  },
  {
    vehicle_id: 'VW-202',
    driver: 'Meera D.',
    route: 'West Market',
    estimated_minutes: 28,
    next_stop: 'Depot Center',
    stops: ['Depot Center', 'Lakeview Apartments'],
  },
]

const fallbackRouteHistory = [
  {
    id: 1,
    vehicle_id: 'VW-201',
    route_name: 'North Sector',
    driver_name: 'Sunil N.',
    start_time: '2026-08-16T06:00:00Z',
    end_time: '2026-08-16T07:00:00Z',
    stop_count: 4,
    total_km: 18.2,
    status: 'completed',
  },
]

const fallbackPredictions = [
  {
    zone: 'City Plaza',
    predicted_volume: 62,
    confidence: 88,
    recommended_action: 'Deploy overflow crew before peak traffic',
  },
]

const getJson = async (url, token = '') => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const response = await fetch(url, headers ? { headers } : {})
  if (!response.ok) {
    throw new Error('Request failed')
  }
  return response.json()
}

const toMapCoords = (lat, lng) => ({
  left: ((lng - 77.58) / 0.06) * 100,
  top: ((12.95 - lat) / 0.06) * 100,
})

function App() {
  const [summary, setSummary] = useState(fallbackSummary)
  const [reports, setReports] = useState(fallbackReports)
  const [vehicles, setVehicles] = useState(fallbackVehicles)
  const [hotspots, setHotspots] = useState(fallbackHotspots)
  const [routes, setRoutes] = useState(fallbackRoutes)
  const [routeHistory, setRouteHistory] = useState(fallbackRouteHistory)
  const [predictions, setPredictions] = useState(fallbackPredictions)
  const [formOpen, setFormOpen] = useState(false)
  const [token, setToken] = useState(localStorage.getItem('smartwaste-admin-token') || '')
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' })
  const [loginError, setLoginError] = useState('')

  const loadProtectedData = async (authToken) => {
    if (!authToken) return
    try {
      const [historyData, predictionData] = await Promise.all([
        getJson(`${API_BASE}/api/route-history`, authToken),
        getJson(`${API_BASE}/api/predictions`, authToken),
      ])
      setRouteHistory(historyData)
      setPredictions(predictionData)
    } catch {
      setRouteHistory(fallbackRouteHistory)
      setPredictions(fallbackPredictions)
    }
  }

  const loadDashboard = async () => {
    try {
      const [summaryData, reportData, vehicleData, hotspotData, routeData] = await Promise.all([
        getJson(`${API_BASE}/api/summary`),
        getJson(`${API_BASE}/api/reports`),
        getJson(`${API_BASE}/api/vehicles`),
        getJson(`${API_BASE}/api/hotspots`),
        getJson(`${API_BASE}/api/routes`),
      ])

      setSummary(summaryData)
      setReports(reportData)
      setVehicles(vehicleData)
      setHotspots(hotspotData)
      setRoutes(routeData)
    } catch {
      setSummary(fallbackSummary)
      setReports(fallbackReports)
      setVehicles(fallbackVehicles)
      setHotspots(fallbackHotspots)
      setRoutes(fallbackRoutes)
    }
  }

  useEffect(() => {
    loadDashboard()
    if (token) {
      loadProtectedData(token)
    }
    const interval = setInterval(() => {
      loadDashboard()
      if (token) {
        loadProtectedData(token)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = {
      title: formData.get('title'),
      category: formData.get('category'),
      location: formData.get('location'),
      severity: formData.get('severity'),
      description: formData.get('description'),
      reporter: formData.get('reporter') || 'Citizen',
      latitude: Number(formData.get('latitude')) || 12.97,
      longitude: Number(formData.get('longitude')) || 77.59,
    }

    try {
      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        event.target.reset()
        setFormOpen(false)
        await loadDashboard()
      }
    } catch {
      const newReport = {
        id: `SR-${Date.now()}`,
        title: payload.title,
        category: payload.category,
        status: 'open',
        severity: payload.severity,
        reporter: payload.reporter,
        location: payload.location,
        description: payload.description,
        created_at: new Date().toISOString(),
      }
      setReports((previous) => [newReport, ...previous])
      setSummary((previous) => ({
        ...previous,
        total_reports: previous.total_reports + 1,
        open_reports: previous.open_reports + 1,
      }))
      event.target.reset()
      setFormOpen(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await response.json()
      localStorage.setItem('smartwaste-admin-token', data.token)
      setToken(data.token)
      setLoginError('')
    } catch (error) {
      setLoginError(error.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('smartwaste-admin-token')
    setToken('')
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Municipal operations</p>
          <h1>Smart Waste Management</h1>
        </div>
        <div className="header-actions">
          <button className="primary-btn" onClick={loadDashboard}>Refresh data</button>
        </div>
      </header>

      <section className="auth-panel">
        {!token ? (
          <form onSubmit={handleLogin} className="login-form">
            <div>
              <strong>Admin login</strong>
            </div>
            <input
              type="text"
              value={loginForm.username}
              onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
              placeholder="Username"
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
              placeholder="Password"
            />
            <button type="submit" className="primary-btn">Login</button>
            {loginError && <span className="error-text">{loginError}</span>}
          </form>
        ) : (
          <div className="login-success">
            <strong>Admin connected</strong>
            <button className="secondary-btn" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </section>

      <section className="summary-grid">
        <div className="summary-card">
          <div className="label">Total reports</div>
          <div className="value">{summary.total_reports}</div>
        </div>
        <div className="summary-card">
          <div className="label">Open issues</div>
          <div className="value">{summary.open_reports}</div>
        </div>
        <div className="summary-card">
          <div className="label">In progress</div>
          <div className="value">{summary.in_progress}</div>
        </div>
        <div className="summary-card">
          <div className="label">Active vehicles</div>
          <div className="value">{summary.active_vehicles}</div>
        </div>
      </section>

      <section className="panel map-panel">
        <div className="panel-header">
          <h2>Operational Map</h2>
          <span className="map-label">Live zone view</span>
        </div>
        <div className="map-surface">
          {reports.map((report) => {
            const pos = toMapCoords(report.coordinates?.lat || 12.97, report.coordinates?.lng || 77.59)
            return (
              <div
                key={report.id}
                className="map-marker report-marker"
                style={{ left: `${Math.min(Math.max(pos.left, 4), 94)}%`, top: `${Math.min(Math.max(pos.top, 6), 88)}%` }}
                title={`${report.location}: ${report.severity}`}
              />
            )
          })}
          {vehicles.map((vehicle) => {
            const pos = toMapCoords(vehicle.coordinates?.lat || 12.97, vehicle.coordinates?.lng || 77.59)
            return (
              <div
                key={vehicle.id}
                className="map-marker vehicle-marker"
                style={{ left: `${Math.min(Math.max(pos.left, 4), 94)}%`, top: `${Math.min(Math.max(pos.top, 6), 88)}%` }}
                title={`${vehicle.id}: ${vehicle.location}`}
              />
            )
          })}
        </div>
      </section>

      <main className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Citizen Issue Reports</h2>
            <button className="secondary-btn" onClick={() => setFormOpen((value) => !value)}>
              {formOpen ? 'Hide form' : 'Add report'}
            </button>
          </div>

          <form className={`report-form ${formOpen ? '' : 'hidden'}`} onSubmit={handleSubmit}>
            <div className="form-row">
              <input type="text" name="title" placeholder="Issue title" required />
              <select name="category" defaultValue="bin_overflow">
                <option value="bin_overflow">Bin overflow</option>
                <option value="illegal_dumping">Illegal dumping</option>
                <option value="drain_blockage">Drain blockage</option>
                <option value="bulky_waste">Bulky waste</option>
                <option value="general_waste">General waste</option>
              </select>
            </div>
            <div className="form-row">
              <input type="text" name="location" placeholder="Location" required />
              <select name="severity" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <textarea name="description" rows="3" placeholder="Describe the issue" />
            <div className="form-row">
              <input type="text" name="reporter" placeholder="Reporter name" />
              <div className="coordinate-box">
                <input type="number" step="0.0001" name="latitude" placeholder="Lat" defaultValue="12.97" />
                <input type="number" step="0.0001" name="longitude" placeholder="Lng" defaultValue="77.59" />
              </div>
            </div>
            <button type="submit" className="primary-btn">Submit report</button>
          </form>

          <div className="report-list">
            {reports.map((report) => (
              <div className="issue-item" key={report.id}>
                <div className="issue-top">
                  <h3 className="issue-title">{report.title}</h3>
                  <span className={`tag ${report.severity}`}>{report.severity}</span>
                </div>
                <div className="meta">{report.location} · {report.reporter}</div>
                <p className="meta">{report.description}</p>
                <div className="issue-top">
                  <span className={`tag ${report.status}`}>{report.status}</span>
                  <span className="meta">{report.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Collection Vehicles</h2>
          </div>
          <div className="vehicle-list">
            {vehicles.map((vehicle) => (
              <div className="vehicle-item" key={vehicle.id}>
                <div className="vehicle-top">
                  <strong>{vehicle.id}</strong>
                  <span className="vehicle-status">{vehicle.status}</span>
                </div>
                <div className="meta">Driver: {vehicle.driver}</div>
                <div className="meta">Route: {vehicle.route}</div>
                <div className="meta">Location: {vehicle.location}</div>
                <div className="meta">Capacity used: {vehicle.capacity_used}%</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="bottom-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Waste Generation Hotspots</h2>
          </div>
          <div className="hotspot-list">
            {hotspots.map((hotspot) => (
              <div className="hotspot-item" key={`${hotspot.zone}-${hotspot.priority}`}>
                <div className="issue-top">
                  <strong>{hotspot.zone}</strong>
                  <span className={`tag ${hotspot.priority}`}>{hotspot.priority}</span>
                </div>
                <div className="meta">Ticket count: {hotspot.ticket_count}</div>
                <div className="meta">Projected risk: <span className="hotspot-score">{hotspot.risk_level}%</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Optimized Collection Routes</h2>
          </div>
          <div className="route-list">
            {routes.map((route) => (
              <div className="route-item" key={`${route.vehicle_id}-${route.route}`}>
                <div className="route-top">
                  <strong>{route.vehicle_id} · {route.driver}</strong>
                  <span className="tag medium">{route.estimated_minutes} min</span>
                </div>
                <div className="meta">Route: {route.route}</div>
                <div className="meta">Next stop: {route.next_stop}</div>
                <div className="meta">Stops: {route.stops.join(' → ')}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {token && (
        <section className="bottom-grid admin-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Route History</h2>
            </div>
            <div className="route-list">
              {routeHistory.map((entry) => (
                <div className="route-item" key={entry.id}>
                  <div className="route-top">
                    <strong>{entry.vehicle_id} · {entry.route_name}</strong>
                    <span className="tag medium">{entry.status}</span>
                  </div>
                  <div className="meta">Driver: {entry.driver_name}</div>
                  <div className="meta">Stops: {entry.stop_count}</div>
                  <div className="meta">Distance: {entry.total_km} km</div>
                  <div className="meta">{entry.start_time} → {entry.end_time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>AI Waste Prediction</h2>
            </div>
            <div className="prediction-list">
              {predictions.map((entry) => (
                <div className="prediction-item" key={`${entry.zone}-${entry.predicted_volume}`}>
                  <div className="issue-top">
                    <strong>{entry.zone}</strong>
                    <span className="tag medium">{entry.confidence}%</span>
                  </div>
                  <div className="meta">Predicted volume: {entry.predicted_volume} tons</div>
                  <div className="meta">Action: {entry.recommended_action}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
