// Shape of the per-visit extra services stored in visits.extras (jsonb).
// Used by the dashboard popover to break down what made up the final price.
export type VisitExtra = { name: string; price: number }

export function parseExtras(input: unknown): VisitExtra[] {
  if (!Array.isArray(input)) return []
  const out: VisitExtra[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const name = (item as { name?: unknown }).name
    const price = (item as { price?: unknown }).price
    if (typeof name !== 'string' || name.trim().length === 0) continue
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) continue
    out.push({ name: name.trim().slice(0, 80), price })
  }
  return out.slice(0, 20)
}
