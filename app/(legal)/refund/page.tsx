export const metadata = { title: 'Refund Policy — BarberQueue' }

export default function RefundPage() {
  return (
    <>
      <h1>Refund Policy</h1>
      <p className="text-slate-400 text-sm">Last updated: June 7, 2026</p>

      <h2>7-day free trial</h2>
      <p>
        Every new shop starts with a 7-day free trial. No credit card is required
        and you will not be charged anything during this period. If you decide
        BarberQueue is not for you, simply do not subscribe — no action needed.
      </p>

      <h2>Subscriptions after a free trial</h2>
      <p>
        If you used the 7-day free trial before subscribing, you have already had
        the opportunity to evaluate the product at no cost. For this reason, payments
        made after a completed free trial are <strong>non-refundable</strong>.
      </p>

      <h2>Subscriptions without a free trial</h2>
      <p>
        If you subscribed without having used the 7-day free trial, you may request
        a full refund within <strong>7 days</strong> of your first payment. To request
        a refund, email <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a> with
        your shop name and the date of the charge.
      </p>

      <h2>Cancellations</h2>
      <p>
        You can cancel your subscription at any time by contacting us. Cancellations
        take effect at the end of the current billing period. We do not issue refunds
        for partial months after the refund window has passed.
      </p>

      <h2>Billing errors</h2>
      <p>
        If you were charged by mistake or the service was unavailable for an extended
        period, email <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a> and
        we will make it right.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about a charge? Email <a href="mailto:founder@barberqueue.pro">founder@barberqueue.pro</a> with
        your shop name and the date of the charge. We respond within 2 business days.
      </p>
    </>
  )
}
