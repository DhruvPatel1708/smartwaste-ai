const API_BASE = 'http://localhost:5000/api'

// Citizen API
export async function getCitizenWallet(citizenId: string) {
  const response = await fetch(`${API_BASE}/citizen/${citizenId}/wallet`)
  if (!response.ok) throw new Error(`Failed to fetch wallet for ${citizenId}`)
  return response.json()
}

// Waste Report API
export async function createWasteReport(data: {
  citizenId: string
  wasteCategory: string
  description: string
  location: string
  latitude: number
  longitude: number
  imageUrl: string
}) {
  const response = await fetch(`${API_BASE}/waste-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create waste report')
  return response.json()
}

// Pickup API
export async function getPickups() {
  const response = await fetch(`${API_BASE}/pickups`)
  if (!response.ok) throw new Error('Failed to fetch pickups')
  return response.json()
}

export async function assignDriver(pickupId: string, driverId: string, vehicleId: string) {
  const response = await fetch(`${API_BASE}/pickups/${pickupId}/assign-driver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, vehicleId }),
  })
  if (!response.ok) throw new Error('Failed to assign driver')
  return response.json()
}

export async function updatePickupStatus(pickupId: string, status: string) {
  const response = await fetch(`${API_BASE}/pickups/${pickupId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw new Error('Failed to update pickup status')
  return response.json()
}

export async function verifyCollection(pickupId: string, data: {
  weightKg: number
  wasteCategory: string
  collectionImageUrl: string
}) {
  const response = await fetch(`${API_BASE}/pickups/${pickupId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to verify collection')
  return response.json()
}

// Predictions API
export async function getAIPredictions() {
  const response = await fetch(`${API_BASE}/predictions-ai`)
  if (!response.ok) throw new Error('Failed to fetch predictions')
  return response.json()
}

// Admin API
export async function adminLogin(username: string, password: string) {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw new Error('Invalid admin credentials')
  return response.json()
}
