export type Role = 'citizen' | 'driver' | 'municipal';

export type WasteCategory =
  | 'Plastic'
  | 'Paper'
  | 'Metal'
  | 'Glass'
  | 'Organic'
  | 'E-waste'
  | 'Mixed Waste';

export type PickupStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'COLLECTED'
  | 'VERIFIED'
  | 'COMPLETED';

export interface Citizen {
  id: string;
  name: string;
  role: Role;
  greenPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
}

export interface WasteReport {
  id: string;
  pickupId: string;
  citizenId: string;
  wasteCategory: WasteCategory;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'COLLECTED' | 'VERIFIED' | 'COMPLETED';
  createdAt: string;
}

export interface PickupRequest {
  id: string;
  pickupId: string;
  reportId: string;
  citizenId: string;
  driverId: string | null;
  vehicleId: string | null;
  wasteCategory: WasteCategory;
  location: string;
  status: PickupStatus;
  imageUrl: string;
  weightKg?: number;
  collectionImageUrl?: string;
  collectionDate?: string;
  verifiedAt?: string;
  rewardPoints?: number;
  wastePassportId?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  role: 'driver';
  currentVehicleId: string | null;
}

export interface Vehicle {
  id: string;
  name: string;
  driverId: string | null;
  status: 'ACTIVE' | 'IDLE';
}

export interface RewardTransaction {
  id: string;
  citizenId: string;
  pickupId: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface WastePassport {
  id: string;
  pickupId: string;
  citizenId: string;
  wasteType: WasteCategory;
  weightKg: number;
  collectionDate: string;
  location: string;
  driverName: string;
  vehicleName: string;
  status: 'Verified';
}

export interface NotificationItem {
  id: string;
  userId: string;
  role: Role;
  message: string;
  createdAt: string;
}

export interface PredictionItem {
  sector: string;
  predictedWaste: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  historical: number[];
  forecast: number[];
}

export interface HotspotItem {
  id: string;
  sector: string;
  score: number;
  reports: number;
  status: 'High Risk' | 'Moderate' | 'Low';
  latitude: number;
  longitude: number;
}
