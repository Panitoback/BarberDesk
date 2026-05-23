// Admin allowlist lives in env, not the DB, so a SQL-level compromise can't
// promote anyone to admin. Comma-separated `auth.users.id` UUIDs.
const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false
  return ADMIN_IDS.includes(userId)
}
