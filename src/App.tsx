import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Gauge,
  Leaf,
  MapPinned,
  Navigation,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react'
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { citizens, drivers, hotspotData, notifications, predictionData, rewardTransactions, vehicles, wastePassports, wasteReports } from './lib/mock-data'
import { calculateRewardPoints, generatePickupId, generateWastePassportId, wasteRewardMap } from './lib/utils'
import { getPickups, createWasteReport, assignDriver, updatePickupStatus, verifyCollection, getAIPredictions } from './lib/api'
import type { PickupRequest as PickupRequestType, WasteCategory, WasteReport } from './types'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const formatMoney = (points: number) => new Intl.NumberFormat('en-IN').format(points)

function App() {
  const [currentRole, setCurrentRole] = useState<'citizen' | 'driver' | 'municipal'>('citizen')
  const [reports, setReports] = useState<WasteReport[]>(wasteReports)
  const [pickups, setPickups] = useState<PickupRequestType[]>(pickupRequests)
  const [selectedPickupId, setSelectedPickupId] = useState<string>(pickupRequests[0]?.pickupId || '')
  const [citizenPoints, setCitizenPoints] = useState<number>(citizens[0].greenPoints)
  const [citizenLifetime, setCitizenLifetime] = useState<number>(citizens[0].lifetimePoints)
  const [rewardToast, setRewardToast] = useState<{ visible: boolean; points: number }>({ visible: false, points: 0 })
  const [loading, setLoading] = useState(false)
  const [reportForm, setReportForm] = useState({
    wasteCategory: 'Plastic',
    description: '',
    location: 'Sector 21, Bengaluru',
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
    latitude: 12.9716,
    longitude: 77.5946,
  })
  const [driverForm, setDriverForm] = useState({
    wasteCategory: 'Plastic',
    weightKg: '5',
    collectionImageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
  })

  // Load pickups from backend on mount
  useEffect(() => {
    const loadPickups = async () => {
      try {
        setLoading(true)
        const data = await getPickups()
        const mappedData = data.map((pickup: any) => ({
          id: pickup.id,
          pickupId: pickup.pickupId,
          reportId: pickup.reportId,
          citizenId: pickup.citizenId,
          driverId: pickup.driverId,
          vehicleId: pickup.vehicleId,
          wasteCategory: pickup.wasteCategory,
          location: pickup.location,
          imageUrl: pickup.imageUrl,
          status: pickup.status,
          weightKg: pickup.weightKg,
          collectionImageUrl: pickup.collectionImageUrl,
          collectionDate: pickup.collectionDate,
          verifiedAt: pickup.verifiedAt,
          rewardPoints: pickup.rewardPoints,
          wastePassportId: pickup.wastePassportId,
          createdAt: pickup.createdAt,
        }))
        setPickups(mappedData)
        if (mappedData.length > 0) {
          setSelectedPickupId(mappedData[0].pickupId)
        }
      } catch (error) {
        console.error('Failed to load pickups:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPickups()
  }, [])

  const citizen = citizens[0]
  const totalReports = reports.length
  const pendingPickups = pickups.filter((pickup) => pickup.status !== 'COMPLETED' && pickup.status !== 'VERIFIED').length
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'ACTIVE').length
  const totalWasteKg = pickups.filter((pickup) => pickup.weightKg).reduce((sum, pickup) => sum + (pickup.weightKg || 0), 0)

  const selectedPickup = pickups.find((pickup) => pickup.pickupId === selectedPickupId) || pickups[0]

  const citizenDashboard = useMemo(() => ({
    greenPoints: citizenPoints,
    verifiedPickups: pickups.filter((pickup) => pickup.status === 'VERIFIED' || pickup.status === 'COMPLETED').length,
    wasteCollected: totalWasteKg,
    cleanCityScore: 87,
  }), [citizenPoints, pickups, totalWasteKg])

  const recentRewards = rewardTransactions.slice(0, 3)

  const assignDriverHandler = async (pickupId: string) => {
    try {
      setLoading(true)
      await assignDriver(pickupId, drivers[0].id, vehicles[0].id)
      setPickups((previous) => previous.map((pickup) => {
        if (pickup.pickupId !== pickupId) return pickup
        return { ...pickup, driverId: drivers[0].id, vehicleId: vehicles[0].id, status: 'ASSIGNED' }
      }))
    } catch (error) {
      console.error('Failed to assign driver:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePickupStatusHandler = async (pickupId: string, nextStatus: PickupRequestType['status']) => {
    try {
      setLoading(true)
      await updatePickupStatus(pickupId, nextStatus)
      setPickups((previous) => previous.map((pickup) => {
        if (pickup.pickupId !== pickupId) return pickup
        return { ...pickup, status: nextStatus }
      }))
    } catch (error) {
      console.error('Failed to update pickup status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReportWaste = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setLoading(true)
      const result = await createWasteReport({
        citizenId: citizen.id,
        wasteCategory: reportForm.wasteCategory,
        description: reportForm.description,
        location: reportForm.location,
        latitude: reportForm.latitude,
        longitude: reportForm.longitude,
        imageUrl: reportForm.imageUrl,
      })
      
      // Reload pickups to see the new one
      const updatedPickups = await getPickups()
      const mappedData = updatedPickups.map((pickup: any) => ({
        id: pickup.id,
        pickupId: pickup.pickupId,
        reportId: pickup.reportId,
        citizenId: pickup.citizenId,
        driverId: pickup.driverId,
        vehicleId: pickup.vehicleId,
        wasteCategory: pickup.wasteCategory,
        location: pickup.location,
        imageUrl: pickup.imageUrl,
        status: pickup.status,
        weightKg: pickup.weightKg,
        collectionImageUrl: pickup.collectionImageUrl,
        collectionDate: pickup.collectionDate,
        verifiedAt: pickup.verifiedAt,
        rewardPoints: pickup.rewardPoints,
        wastePassportId: pickup.wastePassportId,
        createdAt: pickup.createdAt,
      }))
      setPickups(mappedData)
      setSelectedPickupId(result.pickupId)
      
      setReportForm({
        wasteCategory: 'Plastic',
        description: '',
        location: 'Sector 21, Bengaluru',
        imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
        latitude: 12.9716,
        longitude: 77.5946,
      })
    } catch (error) {
      console.error('Failed to report waste:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyCollectionHandler = async () => {
    if (!selectedPickup) return
    try {
      setLoading(true)
      const weight = Number(driverForm.weightKg || 0)
      const category = driverForm.wasteCategory as keyof typeof wasteRewardMap

      if (!selectedPickup.driverId || !selectedPickup.vehicleId || !driverForm.collectionImageUrl || !weight) {
        return
      }

      const result = await verifyCollection(selectedPickup.pickupId, {
        weightKg: weight,
        wasteCategory: category,
        collectionImageUrl: driverForm.collectionImageUrl,
      })

      setPickups((previous) => previous.map((pickup) => {
        if (pickup.pickupId !== selectedPickup.pickupId) return pickup
        return {
          ...pickup,
          status: 'VERIFIED',
          weightKg: weight,
          collectionImageUrl: driverForm.collectionImageUrl,
          collectionDate: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          rewardPoints: result.rewardPoints,
          wastePassportId: result.wastePassportId,
        }
      }))
      
      setCitizenPoints((previous) => previous + result.rewardPoints)
      setCitizenLifetime((previous) => previous + result.rewardPoints)
      setRewardToast({ visible: true, points: result.rewardPoints })
      setTimeout(() => setRewardToast({ visible: false, points: 0 }), 3000)
    } catch (error) {
      console.error('Failed to verify collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDriverComplete = async () => {
    if (!selectedPickup) return
    try {
      setLoading(true)
      await updatePickupStatus(selectedPickup.pickupId, 'COLLECTED')
      setPickups((previous) => previous.map((pickup) => {
        if (pickup.pickupId !== selectedPickup.pickupId) return pickup
        return { ...pickup, status: 'COLLECTED' }
      }))
    } catch (error) {
      console.error('Failed to complete driver pickup:', error)
    } finally {
      setLoading(false)
    }
  }

  const completedPickups = pickups.filter((pickup) => pickup.status === 'VERIFIED' || pickup.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2 text-white"><Leaf className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">SmartWaste AI</p>
              <h1 className="text-xl font-bold">Smart Waste. Smarter Cities.</h1>
            </div>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <button className="font-medium text-slate-700" onClick={() => setCurrentRole('citizen')}>Citizen</button>
            <button className="font-medium text-slate-700" onClick={() => setCurrentRole('driver')}>Driver</button>
            <button className="font-medium text-slate-700" onClick={() => setCurrentRole('municipal')}>Municipal</button>
          </nav>
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Login</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {currentRole === 'citizen' && (
          <>
            <section className="rounded-3xl bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 p-8 text-white shadow-xl">
              <div className="grid gap-8 md:grid-cols-[1.3fr_0.7fr] md:items-center">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">AI-powered platform</p>
                  <h2 className="text-4xl font-black leading-tight">An AI-powered platform for smarter waste collection, verified citizen rewards and cleaner communities.</h2>
                  <div className="mt-6 flex gap-3">
                    <button className="rounded-xl bg-white px-5 py-3 font-bold text-emerald-700">Report Waste</button>
                    <button className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 font-bold text-white">Explore Dashboard</button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoCard title="AI Waste Intelligence" icon={<Sparkles className="h-5 w-5" />} />
                  <InfoCard title="Verified Green Rewards" icon={<Award className="h-5 w-5" />} />
                  <InfoCard title="Smart Collection" icon={<Truck className="h-5 w-5" />} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <StatCard title="Green Points" value={`${formatMoney(citizenDashboard.greenPoints)} GP`} icon={<Award className="h-5 w-5" />} />
              <StatCard title="Verified Pickups" value={String(citizenDashboard.verifiedPickups)} icon={<ClipboardCheck className="h-5 w-5" />} />
              <StatCard title="Waste Collected" value={`${citizenDashboard.wasteCollected} kg`} icon={<Recycle className="h-5 w-5" />} />
              <StatCard title="Clean City Score" value={`${citizenDashboard.cleanCityScore}/100`} icon={<Gauge className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Report Waste</h3>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Status: REQUESTED</span>
                </div>

                <form className="space-y-4" onSubmit={handleReportWaste}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Waste category</label>
                      <select value={reportForm.wasteCategory} onChange={(e) => setReportForm((prev) => ({ ...prev, wasteCategory: e.target.value }))} className="w-full rounded-xl border p-3">
                        {Object.keys(wasteRewardMap).map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Location</label>
                      <input value={reportForm.location} onChange={(e) => setReportForm((prev) => ({ ...prev, location: e.target.value }))} className="w-full rounded-xl border p-3" placeholder="Location" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Description</label>
                    <textarea value={reportForm.description} onChange={(e) => setReportForm((prev) => ({ ...prev, description: e.target.value }))} className="min-h-[110px] w-full rounded-xl border p-3" placeholder="Describe the waste issue" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Image URL</label>
                      <input value={reportForm.imageUrl} onChange={(e) => setReportForm((prev) => ({ ...prev, imageUrl: e.target.value }))} className="w-full rounded-xl border p-3" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">GPS</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={reportForm.latitude} onChange={(e) => setReportForm((prev) => ({ ...prev, latitude: Number(e.target.value) }))} className="w-full rounded-xl border p-3" type="number" step="0.0001" />
                        <input value={reportForm.longitude} onChange={(e) => setReportForm((prev) => ({ ...prev, longitude: Number(e.target.value) }))} className="w-full rounded-xl border p-3" type="number" step="0.0001" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-xl font-bold">Recent Pickup Requests</h3>
                <div className="space-y-3">
                  {pickups.slice(0, 4).map((pickup) => (
                    <button key={pickup.id} onClick={() => setSelectedPickupId(pickup.pickupId)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${selectedPickupId === pickup.pickupId ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                      <div>
                        <p className="font-semibold">{pickup.pickupId}</p>
                        <p className="text-xs text-slate-500">{pickup.location}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{pickup.status}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="mb-3 font-semibold">Recent rewards</h4>
                  <div className="space-y-2">
                    {recentRewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                        <div>
                          <p className="font-semibold text-emerald-800">+{formatMoney(reward.points)} GP</p>
                          <p className="text-xs text-slate-500">{reward.reason}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-700" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold">Notifications</h3>
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((notification) => (
                    <div key={notification.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{notification.role}</span>
                        <span className="text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2 text-sm">{notification.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold">Green Wallet</h3>
                <div className="rounded-2xl bg-gradient-to-r from-emerald-100 to-lime-100 p-5">
                  <p className="text-sm text-emerald-700">Current Green Points</p>
                  <p className="mt-2 text-4xl font-black text-emerald-800">{formatMoney(citizenPoints)} GP</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Lifetime</p>
                    <p className="mt-1 font-bold">{formatMoney(citizenLifetime)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Redeemed</p>
                    <p className="mt-1 font-bold">{citizens[0].redeemedPoints}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Rate</p>
                    <p className="mt-1 font-bold">₹10 = 10k GP</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentRole === 'driver' && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard title="Today's Pickups" value={String(pickups.length)} icon={<PackageCheck className="h-5 w-5" />} />
              <StatCard title="Completed" value={String(completedPickups)} icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard title="Pending" value={String(pickups.filter((pickup) => pickup.status !== 'VERIFIED' && pickup.status !== 'COMPLETED').length)} icon={<AlertTriangle className="h-5 w-5" />} />
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-bold">Driver Dashboard</h3>
              <div className="space-y-4">
                {pickups.map((pickup) => (
                  <div key={pickup.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-bold">{pickup.pickupId}</p>
                        <p className="text-sm text-slate-500">{pickup.location}</p>
                        <p className="mt-1 text-sm">Waste Type: {pickup.wasteCategory}</p>
                        <p className="text-sm">Citizen: {pickup.citizenId}</p>
                        <p className="text-sm">Status: {pickup.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button disabled={loading} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => updatePickupStatusHandler(pickup.pickupId, 'EN_ROUTE')}>Arrived</button>
                        <button disabled={loading} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => handleDriverComplete()}>Collect Waste</button>
                        <button disabled={loading} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => setSelectedPickupId(pickup.pickupId)}>Complete Collection</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {selectedPickup && (
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold">Collection Verification</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Waste category</label>
                    <select value={driverForm.wasteCategory} onChange={(e) => setDriverForm((prev) => ({ ...prev, wasteCategory: e.target.value }))} className="w-full rounded-xl border p-3">
                      {Object.keys(wasteRewardMap).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Weight (kg)</label>
                    <input type="number" value={driverForm.weightKg} onChange={(e) => setDriverForm((prev) => ({ ...prev, weightKg: e.target.value }))} className="w-full rounded-xl border p-3" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">Collection image URL</label>
                  <input value={driverForm.collectionImageUrl} onChange={(e) => setDriverForm((prev) => ({ ...prev, collectionImageUrl: e.target.value }))} className="w-full rounded-xl border p-3" />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button disabled={loading} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50" onClick={verifyCollectionHandler}>Verify Collection</button>
                  <button disabled={loading} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-50" onClick={() => updatePickupStatusHandler(selectedPickup.pickupId, 'COLLECTED')}>Collected</button>
                </div>
              </section>
            )}
          </div>
        )}

        {currentRole === 'municipal' && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard title="Total Reports" value={String(totalReports)} icon={<Users className="h-5 w-5" />} />
              <StatCard title="Pending Pickups" value={String(pendingPickups)} icon={<Navigation className="h-5 w-5" />} />
              <StatCard title="Active Vehicles" value={String(activeVehicles)} icon={<Truck className="h-5 w-5" />} />
              <StatCard title="Waste Collected" value={`${totalWasteKg} kg`} icon={<Factory className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Hotspot Map</h3>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Red = Reports</span>
                </div>
                <div className="h-[420px] overflow-hidden rounded-2xl">
                  <MapContainer center={[12.9716, 77.5946]} zoom={12} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {reports.map((report) => (
                      <Marker key={report.id} position={[report.latitude, report.longitude]} icon={markerIcon}>
                        <Popup>{report.location}</Popup>
                      </Marker>
                    ))}
                    {pickups.filter((pickup) => pickup.status === 'VERIFIED' || pickup.status === 'COMPLETED').map((pickup) => (
                      <Marker key={pickup.id} position={[reports[0]?.latitude || 12.9716, reports[0]?.longitude || 77.5946]} icon={new L.Icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-green.png', iconSize: [25, 41], iconAnchor: [12, 41], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })} >
                        <Popup>{pickup.pickupId}</Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-xl font-bold">AI Waste Prediction</h3>
                  {predictionData.map((prediction) => (
                    <div key={prediction.sector} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">{prediction.sector}</p>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{prediction.risk}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">Predicted waste tomorrow: <span className="font-bold text-slate-800">{prediction.predictedWaste} kg</span></p>
                      <p className="mt-2 text-sm text-slate-600">Recommendation: {prediction.recommendation}</p>
                      <div className="mt-4 h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={prediction.forecast.map((value, index) => ({ name: `D${index + 1}`, value }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-xl font-bold">Route Optimization</h3>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <p className="font-semibold">Depot → Sector 12 → Sector 15 → Sector 21 → Recycling Center</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-100 p-3"><p className="text-slate-500">Distance</p><p className="font-bold">18.4 km</p></div>
                      <div className="rounded-xl bg-slate-100 p-3"><p className="text-slate-500">Time</p><p className="font-bold">42 min</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-bold">Pickup Requests</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3">Pickup ID</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Waste</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned Driver</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickups.map((pickup) => (
                      <tr key={pickup.id} className="border-b">
                        <td className="p-3 font-semibold">{pickup.pickupId}</td>
                        <td className="p-3">{pickup.location}</td>
                        <td className="p-3">{pickup.wasteCategory}</td>
                        <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{pickup.status}</span></td>
                        <td className="p-3">{pickup.driverId ? drivers.find((driver) => driver.id === pickup.driverId)?.name : 'Unassigned'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button disabled={loading} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50" onClick={() => assignDriverHandler(pickup.pickupId)}>Assign Driver</button>
                            <button disabled={loading} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50" onClick={() => updatePickupStatusHandler(pickup.pickupId, 'COLLECTED')}>Status</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {rewardToast.visible && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-600 px-5 py-4 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="font-bold">🎉 Collection Verified!</p>
                <p className="text-sm">+{formatMoney(rewardToast.points)} Green Points</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">{icon}</div>
      </div>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  )
}

function InfoCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">{icon}</div>
      <p className="font-semibold">{title}</p>
    </div>
  )
}

// Import pickupRequests from mock data
import { pickupRequests } from './lib/mock-data'

export default App


  const citizen = citizens[0]
  const totalReports = reports.length
  const pendingPickups = pickups.filter((pickup) => pickup.status !== 'COMPLETED' && pickup.status !== 'VERIFIED').length
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'ACTIVE').length
  const totalWasteKg = pickups.filter((pickup) => pickup.weightKg).reduce((sum, pickup) => sum + (pickup.weightKg || 0), 0)

  const selectedPickup = pickups.find((pickup) => pickup.pickupId === selectedPickupId) || pickups[0]

  const citizenDashboard = useMemo(() => ({
    greenPoints: citizenPoints,
    verifiedPickups: pickups.filter((pickup) => pickup.status === 'VERIFIED' || pickup.status === 'COMPLETED').length,
    wasteCollected: totalWasteKg,
    cleanCityScore: 87,
  }), [citizenPoints, pickups, totalWasteKg])

  const recentRewards = rewardTransactions.slice(0, 3)

  const assignDriver = (pickupId: string) => {
    setPickups((previous) => previous.map((pickup) => {
      if (pickup.pickupId !== pickupId) return pickup
      return { ...pickup, driverId: drivers[0].id, vehicleId: vehicles[0].id, status: 'ASSIGNED' }
    }))
  }

  const updatePickupStatus = (pickupId: string, nextStatus: PickupRequestType['status']) => {
    setPickups((previous) => previous.map((pickup) => {
      if (pickup.pickupId !== pickupId) return pickup
      return { ...pickup, status: nextStatus }
    }))
  }

  const handleReportWaste = (event: React.FormEvent) => {
    event.preventDefault()
    const newPickupId = generatePickupId()
    const newReport: WasteReport = {
      id: `rep-${Date.now()}`,
      pickupId: newPickupId,
      citizenId: citizen.id,
      wasteCategory: reportForm.wasteCategory as WasteCategory,
      description: reportForm.description,
      location: reportForm.location,
      latitude: reportForm.latitude,
      longitude: reportForm.longitude,
      imageUrl: reportForm.imageUrl,
      status: 'REQUESTED',
      createdAt: new Date().toISOString(),
    }
    const newPickup: PickupRequestType = {
      id: `pick-${Date.now()}`,
      pickupId: newPickupId,
      reportId: newReport.id,
      citizenId: citizen.id,
      driverId: null,
      vehicleId: null,
      wasteCategory: newReport.wasteCategory,
      location: newReport.location,
      imageUrl: newReport.imageUrl,
      status: 'REQUESTED',
      createdAt: newReport.createdAt,
    }
    setReports((previous) => [newReport, ...previous])
    setPickups((previous) => [newPickup, ...previous])
    setSelectedPickupId(newPickupId)
    setReportForm({
      wasteCategory: 'Plastic',
      description: '',
      location: 'Sector 21, Bengaluru',
      imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
      latitude: 12.9716,
      longitude: 77.5946,
    })
  }

  const verifyCollection = () => {
    if (!selectedPickup) return
    const weight = Number(driverForm.weightKg || 0)
    const category = driverForm.wasteCategory as keyof typeof wasteRewardMap
    const points = calculateRewardPoints(category, weight, true)

    if (!selectedPickup.driverId || !selectedPickup.vehicleId || !selectedPickup.collectionImageUrl || !weight) {
      return
    }

    const passportId = generateWastePassportId()
    setPickups((previous) => previous.map((pickup) => {
      if (pickup.pickupId !== selectedPickup.pickupId) return pickup
      return {
        ...pickup,
        status: 'VERIFIED',
        weightKg: weight,
        collectionImageUrl: driverForm.collectionImageUrl,
        collectionDate: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        rewardPoints: points,
        wastePassportId: passportId,
      }
    }))
    setCitizenPoints((previous) => previous + points)
    setCitizenLifetime((previous) => previous + points)
    setRewardToast({ visible: true, points })
    setTimeout(() => setRewardToast({ visible: false, points: 0 }), 3000)
  }

  const handleDriverComplete = () => {
    if (!selectedPickup) return
    setPickups((previous) => previous.map((pickup) => {
      if (pickup.pickupId !== selectedPickup.pickupId) return pickup
      return { ...pickup, status: 'COLLECTED' }
    }))
  }

  const completedPickups = pickups.filter((pickup) => pickup.status === 'VERIFIED' || pickup.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2 text-white"><Leaf className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">SmartWaste AI</p>
              <h1 className="text-xl font-bold">Smart Waste. Smarter Cities.</h1>
            </div>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <button className="font-medium text-slate-700" onClick={() => setCurrentRole('citizen')}>Citizen</button>
            <button className="font-medium text-slate-700" onClick={() => setCurrentRole('driver')}>Driver</button>
            <button className="font-medium text-slate-700" onClick={() => setCurrentRole('municipal')}>Municipal</button>
          </nav>
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Login</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {currentRole === 'citizen' && (
          <>
            <section className="rounded-3xl bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 p-8 text-white shadow-xl">
              <div className="grid gap-8 md:grid-cols-[1.3fr_0.7fr] md:items-center">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">AI-powered platform</p>
                  <h2 className="text-4xl font-black leading-tight">An AI-powered platform for smarter waste collection, verified citizen rewards and cleaner communities.</h2>
                  <div className="mt-6 flex gap-3">
                    <button className="rounded-xl bg-white px-5 py-3 font-bold text-emerald-700">Report Waste</button>
                    <button className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 font-bold text-white">Explore Dashboard</button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoCard title="AI Waste Intelligence" icon={<Sparkles className="h-5 w-5" />} />
                  <InfoCard title="Verified Green Rewards" icon={<Award className="h-5 w-5" />} />
                  <InfoCard title="Smart Collection" icon={<Truck className="h-5 w-5" />} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <StatCard title="Green Points" value={`${formatMoney(citizenDashboard.greenPoints)} GP`} icon={<Award className="h-5 w-5" />} />
              <StatCard title="Verified Pickups" value={String(citizenDashboard.verifiedPickups)} icon={<ClipboardCheck className="h-5 w-5" />} />
              <StatCard title="Waste Collected" value={`${citizenDashboard.wasteCollected} kg`} icon={<Recycle className="h-5 w-5" />} />
              <StatCard title="Clean City Score" value={`${citizenDashboard.cleanCityScore}/100`} icon={<Gauge className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Report Waste</h3>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Status: REQUESTED</span>
                </div>

                <form className="space-y-4" onSubmit={handleReportWaste}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Waste category</label>
                      <select value={reportForm.wasteCategory} onChange={(e) => setReportForm((prev) => ({ ...prev, wasteCategory: e.target.value }))} className="w-full rounded-xl border p-3">
                        {Object.keys(wasteRewardMap).map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Location</label>
                      <input value={reportForm.location} onChange={(e) => setReportForm((prev) => ({ ...prev, location: e.target.value }))} className="w-full rounded-xl border p-3" placeholder="Location" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Description</label>
                    <textarea value={reportForm.description} onChange={(e) => setReportForm((prev) => ({ ...prev, description: e.target.value }))} className="min-h-[110px] w-full rounded-xl border p-3" placeholder="Describe the waste issue" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Image URL</label>
                      <input value={reportForm.imageUrl} onChange={(e) => setReportForm((prev) => ({ ...prev, imageUrl: e.target.value }))} className="w-full rounded-xl border p-3" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">GPS</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={reportForm.latitude} onChange={(e) => setReportForm((prev) => ({ ...prev, latitude: Number(e.target.value) }))} className="w-full rounded-xl border p-3" type="number" step="0.0001" />
                        <input value={reportForm.longitude} onChange={(e) => setReportForm((prev) => ({ ...prev, longitude: Number(e.target.value) }))} className="w-full rounded-xl border p-3" type="number" step="0.0001" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white">Submit Report</button>
                </form>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-xl font-bold">Recent Pickup Requests</h3>
                <div className="space-y-3">
                  {pickups.slice(0, 4).map((pickup) => (
                    <button key={pickup.id} onClick={() => setSelectedPickupId(pickup.pickupId)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${selectedPickupId === pickup.pickupId ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                      <div>
                        <p className="font-semibold">{pickup.pickupId}</p>
                        <p className="text-xs text-slate-500">{pickup.location}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{pickup.status}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="mb-3 font-semibold">Recent rewards</h4>
                  <div className="space-y-2">
                    {recentRewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                        <div>
                          <p className="font-semibold text-emerald-800">+{formatMoney(reward.points)} GP</p>
                          <p className="text-xs text-slate-500">{reward.reason}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-700" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold">Notifications</h3>
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((notification) => (
                    <div key={notification.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{notification.role}</span>
                        <span className="text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2 text-sm">{notification.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold">Green Wallet</h3>
                <div className="rounded-2xl bg-gradient-to-r from-emerald-100 to-lime-100 p-5">
                  <p className="text-sm text-emerald-700">Current Green Points</p>
                  <p className="mt-2 text-4xl font-black text-emerald-800">{formatMoney(citizenPoints)} GP</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Lifetime</p>
                    <p className="mt-1 font-bold">{formatMoney(citizenLifetime)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Redeemed</p>
                    <p className="mt-1 font-bold">{citizens[0].redeemedPoints}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Rate</p>
                    <p className="mt-1 font-bold">₹10 = 10k GP</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentRole === 'driver' && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard title="Today's Pickups" value={String(pickups.length)} icon={<PackageCheck className="h-5 w-5" />} />
              <StatCard title="Completed" value={String(completedPickups)} icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard title="Pending" value={String(pickups.filter((pickup) => pickup.status !== 'VERIFIED' && pickup.status !== 'COMPLETED').length)} icon={<AlertTriangle className="h-5 w-5" />} />
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-bold">Driver Dashboard</h3>
              <div className="space-y-4">
                {pickups.map((pickup) => (
                  <div key={pickup.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-bold">{pickup.pickupId}</p>
                        <p className="text-sm text-slate-500">{pickup.location}</p>
                        <p className="mt-1 text-sm">Waste Type: {pickup.wasteCategory}</p>
                        <p className="text-sm">Citizen: {pickup.citizenId}</p>
                        <p className="text-sm">Status: {pickup.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white" onClick={() => updatePickupStatus(pickup.pickupId, 'EN_ROUTE')}>Arrived</button>
                        <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => handleDriverComplete()}>Collect Waste</button>
                        <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setSelectedPickupId(pickup.pickupId)}>Complete Collection</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {selectedPickup && (
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold">Collection Verification</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Waste category</label>
                    <select value={driverForm.wasteCategory} onChange={(e) => setDriverForm((prev) => ({ ...prev, wasteCategory: e.target.value }))} className="w-full rounded-xl border p-3">
                      {Object.keys(wasteRewardMap).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Weight (kg)</label>
                    <input type="number" value={driverForm.weightKg} onChange={(e) => setDriverForm((prev) => ({ ...prev, weightKg: e.target.value }))} className="w-full rounded-xl border p-3" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">Collection image URL</label>
                  <input value={driverForm.collectionImageUrl} onChange={(e) => setDriverForm((prev) => ({ ...prev, collectionImageUrl: e.target.value }))} className="w-full rounded-xl border p-3" />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white" onClick={verifyCollection}>Verify Collection</button>
                  <button className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700" onClick={() => updatePickupStatus(selectedPickup.pickupId, 'COLLECTED')}>Collected</button>
                </div>
              </section>
            )}
          </div>
        )}

        {currentRole === 'municipal' && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard title="Total Reports" value={String(totalReports)} icon={<Users className="h-5 w-5" />} />
              <StatCard title="Pending Pickups" value={String(pendingPickups)} icon={<Navigation className="h-5 w-5" />} />
              <StatCard title="Active Vehicles" value={String(activeVehicles)} icon={<Truck className="h-5 w-5" />} />
              <StatCard title="Waste Collected" value={`${totalWasteKg} kg`} icon={<Factory className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Hotspot Map</h3>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Red = Reports</span>
                </div>
                <div className="h-[420px] overflow-hidden rounded-2xl">
                  <MapContainer center={[12.9716, 77.5946]} zoom={12} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {reports.map((report) => (
                      <Marker key={report.id} position={[report.latitude, report.longitude]} icon={markerIcon}>
                        <Popup>{report.location}</Popup>
                      </Marker>
                    ))}
                    {pickups.filter((pickup) => pickup.status === 'VERIFIED' || pickup.status === 'COMPLETED').map((pickup) => (
                      <Marker key={pickup.id} position={[reports[0]?.latitude || 12.9716, reports[0]?.longitude || 77.5946]} icon={new L.Icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-green.png', iconSize: [25, 41], iconAnchor: [12, 41], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })} >
                        <Popup>{pickup.pickupId}</Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-xl font-bold">AI Waste Prediction</h3>
                  {predictionData.map((prediction) => (
                    <div key={prediction.sector} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">{prediction.sector}</p>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{prediction.risk}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">Predicted waste tomorrow: <span className="font-bold text-slate-800">{prediction.predictedWaste} kg</span></p>
                      <p className="mt-2 text-sm text-slate-600">Recommendation: {prediction.recommendation}</p>
                      <div className="mt-4 h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={prediction.forecast.map((value, index) => ({ name: `D${index + 1}`, value }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-xl font-bold">Route Optimization</h3>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <p className="font-semibold">Depot → Sector 12 → Sector 15 → Sector 21 → Recycling Center</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-100 p-3"><p className="text-slate-500">Distance</p><p className="font-bold">18.4 km</p></div>
                      <div className="rounded-xl bg-slate-100 p-3"><p className="text-slate-500">Time</p><p className="font-bold">42 min</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-bold">Pickup Requests</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3">Pickup ID</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Waste</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned Driver</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickups.map((pickup) => (
                      <tr key={pickup.id} className="border-b">
                        <td className="p-3 font-semibold">{pickup.pickupId}</td>
                        <td className="p-3">{pickup.location}</td>
                        <td className="p-3">{pickup.wasteCategory}</td>
                        <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{pickup.status}</span></td>
                        <td className="p-3">{pickup.driverId ? drivers.find((driver) => driver.id === pickup.driverId)?.name : 'Unassigned'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => assignDriver(pickup.pickupId)}>Assign Driver</button>
                            <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => updatePickupStatus(pickup.pickupId, 'COLLECTED')}>Status</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {rewardToast.visible && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-600 px-5 py-4 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="font-bold">🎉 Collection Verified!</p>
                <p className="text-sm">+{formatMoney(rewardToast.points)} Green Points</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">{icon}</div>
      </div>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  )
}

function InfoCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">{icon}</div>
      <p className="font-semibold">{title}</p>
    </div>
  )
}

export default App
