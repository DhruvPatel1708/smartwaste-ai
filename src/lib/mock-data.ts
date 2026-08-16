import type { Citizen, Driver, HotspotItem, NotificationItem, PickupRequest, PredictionItem, RewardTransaction, Vehicle, WastePassport, WasteReport } from '../types'

export const ROLES = ['citizen', 'driver', 'municipal'] as const

export const citizens: Citizen[] = [
  {
    id: 'cit-1',
    name: 'Aarav Sharma',
    role: 'citizen',
    greenPoints: 12500,
    lifetimePoints: 12500,
    redeemedPoints: 0,
  },
  {
    id: 'cit-2',
    name: 'Priya Nair',
    role: 'citizen',
    greenPoints: 8200,
    lifetimePoints: 9000,
    redeemedPoints: 800,
  },
  {
    id: 'cit-3',
    name: 'Rohan Mehta',
    role: 'citizen',
    greenPoints: 3400,
    lifetimePoints: 6400,
    redeemedPoints: 300,
  },
]

export const drivers: Driver[] = [
  { id: 'drv-1', name: 'Suresh Kumar', role: 'driver', currentVehicleId: 'veh-1' },
  { id: 'drv-2', name: 'Anita Verma', role: 'driver', currentVehicleId: 'veh-2' },
  { id: 'drv-3', name: 'Rakesh Singh', role: 'driver', currentVehicleId: 'veh-3' },
]

export const vehicles: Vehicle[] = [
  { id: 'veh-1', name: 'Waste Truck 12', driverId: 'drv-1', status: 'ACTIVE' },
  { id: 'veh-2', name: 'Collection Van 07', driverId: 'drv-2', status: 'ACTIVE' },
  { id: 'veh-3', name: 'Pickup Mini 03', driverId: 'drv-3', status: 'IDLE' },
]

export const wasteReports: WasteReport[] = [
  {
    id: 'rep-101',
    pickupId: 'WM-2026-000101',
    citizenId: 'cit-1',
    wasteCategory: 'Plastic',
    description: 'Overflowing plastic waste near bus stand.',
    location: 'Sector 21, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
    status: 'VERIFIED',
    createdAt: '2026-08-12T08:30:00Z',
  },
  {
    id: 'rep-102',
    pickupId: 'WM-2026-000102',
    citizenId: 'cit-2',
    wasteCategory: 'Mixed Waste',
    description: 'Mixed garbage dumped near park boundary.',
    location: 'Sector 12, Bengaluru',
    latitude: 12.9346,
    longitude: 77.5877,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
    status: 'ASSIGNED',
    createdAt: '2026-08-14T09:15:00Z',
  },
  {
    id: 'rep-103',
    pickupId: 'WM-2026-000103',
    citizenId: 'cit-3',
    wasteCategory: 'Organic',
    description: 'Food and organic waste around street corner.',
    location: 'Sector 15, Bengaluru',
    latitude: 12.9659,
    longitude: 77.6098,
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=900&q=80',
    status: 'REQUESTED',
    createdAt: '2026-08-15T07:45:00Z',
  },
  {
    id: 'rep-104',
    pickupId: 'WM-2026-000104',
    citizenId: 'cit-1',
    wasteCategory: 'E-waste',
    description: 'Discarded electronics near apartment gate.',
    location: 'Indiranagar, Bengaluru',
    latitude: 12.9719,
    longitude: 77.6412,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    status: 'COLLECTED',
    createdAt: '2026-08-16T06:00:00Z',
  },
]

export const pickupRequests: PickupRequest[] = [
  {
    id: 'pick-1',
    pickupId: 'WM-2026-000101',
    reportId: 'rep-101',
    citizenId: 'cit-1',
    driverId: 'drv-1',
    vehicleId: 'veh-1',
    wasteCategory: 'Plastic',
    location: 'Sector 21, Bengaluru',
    status: 'COMPLETED',
    imageUrl: wasteReports[0].imageUrl,
    weightKg: 5,
    collectionImageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
    collectionDate: '2026-08-12T10:30:00Z',
    verifiedAt: '2026-08-12T11:00:00Z',
    rewardPoints: 3000,
    wastePassportId: 'WP-82941',
    createdAt: '2026-08-12T08:30:00Z',
  },
  {
    id: 'pick-2',
    pickupId: 'WM-2026-000102',
    reportId: 'rep-102',
    citizenId: 'cit-2',
    driverId: 'drv-2',
    vehicleId: 'veh-2',
    wasteCategory: 'Mixed Waste',
    location: 'Sector 12, Bengaluru',
    status: 'ASSIGNED',
    imageUrl: wasteReports[1].imageUrl,
    createdAt: '2026-08-14T09:15:00Z',
  },
  {
    id: 'pick-3',
    pickupId: 'WM-2026-000103',
    reportId: 'rep-103',
    citizenId: 'cit-3',
    driverId: null,
    vehicleId: null,
    wasteCategory: 'Organic',
    location: 'Sector 15, Bengaluru',
    status: 'REQUESTED',
    imageUrl: wasteReports[2].imageUrl,
    createdAt: '2026-08-15T07:45:00Z',
  },
  {
    id: 'pick-4',
    pickupId: 'WM-2026-000104',
    reportId: 'rep-104',
    citizenId: 'cit-1',
    driverId: 'drv-3',
    vehicleId: 'veh-3',
    wasteCategory: 'E-waste',
    location: 'Indiranagar, Bengaluru',
    status: 'VERIFIED',
    imageUrl: wasteReports[3].imageUrl,
    weightKg: 2,
    collectionImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    collectionDate: '2026-08-16T07:30:00Z',
    verifiedAt: '2026-08-16T08:05:00Z',
    rewardPoints: 2000,
    wastePassportId: 'WP-82942',
    createdAt: '2026-08-16T06:00:00Z',
  },
]

export const rewardTransactions: RewardTransaction[] = [
  {
    id: 'rw-1',
    citizenId: 'cit-1',
    pickupId: 'WM-2026-000101',
    points: 3000,
    reason: 'Verified Plastic Collection',
    createdAt: '2026-08-12T11:00:00Z',
  },
  {
    id: 'rw-2',
    citizenId: 'cit-1',
    pickupId: 'WM-2026-000104',
    points: 2000,
    reason: 'Verified E-waste Collection',
    createdAt: '2026-08-16T08:05:00Z',
  },
]

export const greenWallet = {
  current: 12500,
  lifetime: 14500,
  redeemed: 0,
}

export const notifications: NotificationItem[] = [
  { id: 'n-1', userId: 'cit-1', role: 'citizen', message: 'Your pickup has been assigned.', createdAt: '2026-08-12T09:20:00Z' },
  { id: 'n-2', userId: 'cit-1', role: 'citizen', message: 'Collection verified. 🎉 3,000 Green Points credited.', createdAt: '2026-08-12T11:00:00Z' },
  { id: 'n-3', userId: 'drv-1', role: 'driver', message: 'New pickup assigned.', createdAt: '2026-08-12T08:50:00Z' },
  { id: 'n-4', userId: 'municipal', role: 'municipal', message: 'New waste report received.', createdAt: '2026-08-15T07:45:00Z' },
]

export const wastePassports: WastePassport[] = [
  {
    id: 'WP-82941',
    pickupId: 'WM-2026-000101',
    citizenId: 'cit-1',
    wasteType: 'Plastic',
    weightKg: 5,
    collectionDate: '2026-08-12T10:30:00Z',
    location: 'Sector 21, Bengaluru',
    driverName: 'Suresh Kumar',
    vehicleName: 'Waste Truck 12',
    status: 'Verified',
  },
  {
    id: 'WP-82942',
    pickupId: 'WM-2026-000104',
    citizenId: 'cit-1',
    wasteType: 'E-waste',
    weightKg: 2,
    collectionDate: '2026-08-16T07:30:00Z',
    location: 'Indiranagar, Bengaluru',
    driverName: 'Rakesh Singh',
    vehicleName: 'Pickup Mini 03',
    status: 'Verified',
  },
]

export const hotspotData: HotspotItem[] = [
  { id: 'h-1', sector: 'Sector 21', score: 92, reports: 47, status: 'High Risk', latitude: 12.9716, longitude: 77.5946 },
  { id: 'h-2', sector: 'Sector 12', score: 74, reports: 28, status: 'Moderate', latitude: 12.9346, longitude: 77.5877 },
  { id: 'h-3', sector: 'Sector 15', score: 68, reports: 19, status: 'Moderate', latitude: 12.9659, longitude: 77.6098 },
  { id: 'h-4', sector: 'Indiranagar', score: 61, reports: 15, status: 'Low', latitude: 12.9719, longitude: 77.6412 },
]

export const predictionData: PredictionItem[] = [
  {
    sector: 'Sector 21',
    predictedWaste: 1840,
    risk: 'HIGH',
    recommendation: 'Schedule additional collection.',
    historical: [1100, 1200, 1340, 1500, 1680, 1760],
    forecast: [1450, 1600, 1720, 1810, 1840, 1890],
  },
  {
    sector: 'Sector 12',
    predictedWaste: 1315,
    risk: 'MEDIUM',
    recommendation: 'Add one extra route sweep.',
    historical: [900, 980, 1080, 1200, 1240, 1280],
    forecast: [1000, 1080, 1170, 1260, 1310, 1350],
  },
]
