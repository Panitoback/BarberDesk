export const metadata = { title: 'Privacy Policy — BarberQueue' }

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-slate-400 text-sm">Last updated: June 7, 2026</p>

      <p>
        This policy explains what data BarberQueue collects, why we collect it,
        and how we protect it. By using BarberQueue, you agree to this policy.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — shop name, email address, and your password (stored as a secure hash, never in plain text).</li>
        <li><strong>Shop configuration</strong> — business hours, services, and settings you configure in the dashboard.</li>
        <li><strong>Client data</strong> — names and phone numbers you record about your customers as part of normal barbershop operations.</li>
        <li><strong>Appointment data</strong> — booking history, visit records, and loyalty points tied to your clients.</li>
        <li><strong>SMS history</strong> — messages exchanged through our platform between you and your clients.</li>
        <li><strong>Usage data</strong> — basic server logs (IP address, browser type, timestamps) used to keep the service running and detect abuse.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the booking, scheduling, loyalty, and SMS automation features you signed up for.</li>
        <li>To send you important account notices and product updates.</li>
        <li>To detect, investigate, and prevent misuse of the platform.</li>
        <li>We do not use your data for advertising and we do not sell it to third parties.</li>
      </ul>

      <h2>Sub-processors</h2>
      <p>
        We rely on a small set of trusted providers to deliver the service. Each
        receives only the data necessary to perform their function:
      </p>
      <ul>
        <li><strong>Supabase</strong> — database and authentication (data stored in the United States).</li>
        <li><strong>Twilio</strong> — SMS delivery to your clients.</li>
        <li><strong>Resend</strong> — transactional email (appointment reminders, reactivation campaigns).</li>
        <li><strong>OpenRouter</strong> — AI-powered auto-replies to inbound client SMS messages.</li>
        <li><strong>Vercel</strong> — application hosting (data processed in the United States).</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Your data is retained for as long as your account is active. On cancellation
        or termination, data is available for export for 30 days, after which it is
        permanently deleted.
      </p>

      <h2>Your client&apos;s data</h2>
      <p>
        You are the data controller for the client information you enter into
        BarberQueue. You are responsible for ensuring your clients are aware that
        their contact information is used to send appointment reminders and
        follow-up messages, as required under CASL and PIPEDA.
      </p>

      <h2>Your rights</h2>
      <p>
        Under PIPEDA (Canada&apos;s Personal Information Protection and Electronic
        Documents Act) you have the right to access, correct, or request deletion
        of your personal information at any time. To exercise any of these rights,
        email <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a>.
        We will respond within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard security practices: encrypted connections (HTTPS),
        row-level security on the database, and hashed passwords. No system is
        perfectly secure — if you believe your account has been compromised, contact
        us immediately.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. We will notify active users
        by email before material changes take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a>.
      </p>
    </>
  )
}
