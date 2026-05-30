import Stripe from 'stripe'

// Singleton — instantiated once at module load
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-05-27.dahlia',
})

export default stripe
