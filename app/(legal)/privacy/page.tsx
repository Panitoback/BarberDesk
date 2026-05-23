export const metadata = { title: 'Privacy Policy — BarberQueue' }

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-slate-400 text-sm">Last updated: May 22, 2026</p>

      <p>
        This is a placeholder privacy policy. Replace before launching to production.
        The final version should be reviewed by a lawyer familiar with PIPEDA (Canada)
        and any other jurisdictions you operate in.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — shop name, email address, password hash.</li>
        <li><strong>Client data</strong> — names and phone numbers you record about your customers.</li>
        <li><strong>SMS history</strong> — messages exchanged through our platform with your clients.</li>
        <li><strong>Usage data</strong> — basic logs (IP, user agent) needed to keep the service running.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the booking, loyalty, and SMS automations you signed up for.</li>
        <li>To send you product updates and important account notices.</li>
        <li>To detect and prevent abuse of the service.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We use a small set of trusted sub-processors to deliver the service —
        Supabase (database + auth), Twilio (SMS), Resend (email), and OpenRouter
        (AI auto-replies). We do not sell your data.
      </p>

      <h2>Your rights</h2>
      <p>
        You can export your data or delete your account at any time by emailing
        essoloparajuegos37@gmail.com. We will respond within 30 days.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email essoloparajuegos37@gmail.com.
      </p>
    </>
  )
}
