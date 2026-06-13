import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('c')

  const clientId = token ? verifyUnsubscribeToken(token) : null
  if (!clientId) {
    return new Response('Invalid or expired unsubscribe link.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const supabase = createAdminClient()
  await supabase
    .from('clients')
    .update({ email_unsubscribed: true })
    .eq('id', clientId)

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Unsubscribed — BarberQueue</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:16px;padding:48px 40px;max-width:380px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04)}
    h1{font-size:20px;font-weight:700;color:#0f172a;margin-bottom:10px}
    p{font-size:14px;color:#64748b;line-height:1.6}
    .check{width:48px;height:48px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
  </style>
</head>
<body>
  <div class="card">
    <div class="check">
      <svg width="22" height="22" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h1>You've been unsubscribed</h1>
    <p>You won't receive marketing emails from this shop anymore.</p>
  </div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
