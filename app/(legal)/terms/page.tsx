export const metadata = { title: 'Terms of Service — BarberQueue' }

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-slate-400 text-sm">Last updated: June 7, 2026</p>

      <p>
        By creating an account or using BarberQueue, you agree to these terms.
        If you do not agree, do not use the service.
      </p>

      <h2>The service</h2>
      <p>
        BarberQueue provides software-as-a-service tools for independent barbershops,
        including an online booking page, SMS automations, a loyalty program, and a
        private management dashboard. The service is offered on an &quot;as is&quot; basis.
        We make reasonable efforts to keep it available and reliable, but we do not
        guarantee uninterrupted access.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older and authorized to act on behalf of your shop.</li>
        <li>You are responsible for the accuracy of the client data you record.</li>
        <li>
          You are responsible for obtaining proper consent from your clients before
          sending them SMS messages, in accordance with Canada&apos;s Anti-Spam
          Legislation (CASL).
        </li>
        <li>Keep your credentials secure. You are responsible for all activity on your account.</li>
        <li>Notify us immediately at <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a> if you suspect unauthorized access.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        You may not use BarberQueue to send unsolicited marketing messages, harass
        anyone, impersonate another person or business, or violate any applicable law.
        We reserve the right to suspend or terminate accounts that abuse SMS sending,
        violate CASL, or engage in any prohibited conduct without prior notice.
      </p>

      <h2>Billing</h2>
      <ul>
        <li>
          <strong>Solo plan:</strong> $19.99 CAD/month (launch rate). Regular price $29.99 CAD/month.
        </li>
        <li>
          <strong>Multi-barber plan:</strong> $29.99 CAD/month (launch rate). Regular price $49.99 CAD/month.
        </li>
        <li>All prices are in Canadian dollars and exclude applicable taxes.</li>
        <li>A 7-day free trial is included for every new shop. No credit card required to start.</li>
        <li>
          Refunds are governed by our <a href="/refund">Refund Policy</a>.
        </li>
        <li>
          We reserve the right to change pricing with 30 days&apos; notice. Continued
          use after the notice period constitutes acceptance of the new price.
        </li>
      </ul>

      <h2>Your data</h2>
      <p>
        You own all client and business data you enter into BarberQueue. We do not
        sell it or use it for any purpose other than delivering the service to you.
        See our <a href="/privacy">Privacy Policy</a> for details.
      </p>

      <h2>Termination</h2>
      <p>
        Either party may terminate the agreement at any time. On termination, you
        retain access to your data for 30 days so you can export it. After that period,
        your data is permanently deleted from our systems.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Our maximum liability to you is limited to the total amount you paid in the
        12 months preceding the claim. We are not liable for any indirect, incidental,
        or consequential damages, including lost revenue or lost client data.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Province of Ontario and the federal
        laws of Canada applicable therein. Any disputes will be resolved in the courts
        of Ontario.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a>.
        We respond within 2 business days.
      </p>
    </>
  )
}
