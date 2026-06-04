const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken  = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

export async function sendSms(to: string, body: string, from?: string): Promise<string> {
  // `from` is the tenant's own Twilio number; falls back to the platform default
  // env number only when a caller doesn't know the tenant's number (legacy paths).
  const sender = from ?? fromNumber

  if (!accountSid || !authToken || !sender) {
    throw new Error('Twilio credentials not configured')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams({ To: to, From: sender, Body: body })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Twilio error ${err.code}: ${err.message}`)
  }

  const data = await res.json()
  return data.sid as string
}
