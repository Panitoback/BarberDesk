export const POINTS_PER_VISIT = 10

export type LoyaltyLevel = 'bronze' | 'silver' | 'gold' | 'platinum'

export function calculateLevel(points: number): LoyaltyLevel {
  if (points >= 500) return 'platinum'
  if (points >= 250) return 'gold'
  if (points >= 100) return 'silver'
  return 'bronze'
}
