export const wasteRewardMap = {
  Plastic: 500,
  Paper: 200,
  Metal: 700,
  Glass: 400,
  'E-waste': 1000,
  Organic: 100,
  'Mixed Waste': 100,
} as const

export function generatePickupId() {
  const next = Math.floor(Math.random() * 900000) + 100000
  return `WM-2026-${String(next).padStart(6, '0')}`
}

export function generateWastePassportId() {
  return `WP-${Math.floor(Math.random() * 90000) + 10000}`
}

export function calculateRewardPoints(category: keyof typeof wasteRewardMap, weightKg: number, isSegregated = true) {
  const base = wasteRewardMap[category] * weightKg
  const segregationBonus = isSegregated ? 500 : 0
  return base + segregationBonus
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
