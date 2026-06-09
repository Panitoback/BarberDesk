export const POINTS_PER_VISIT = 10

export type LoyaltyLevel = 'bronze' | 'silver' | 'gold' | 'platinum'
export type LoyaltyMode  = 'levels' | 'stars'

export type LoyaltyReward = {
  id:             string
  name:           string
  description:    string | null
  stars_required: number
  active:         boolean
  display_order:  number
}

export function calculateLevel(points: number): LoyaltyLevel {
  if (points >= 500) return 'platinum'
  if (points >= 250) return 'gold'
  if (points >= 100) return 'silver'
  return 'bronze'
}

export function starsForPrice(price: number, dollarsPerStar: number): number {
  return Math.max(1, Math.floor(price / Math.max(dollarsPerStar, 1)))
}
