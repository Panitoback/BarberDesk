import Image from 'next/image'

/** Logo + wordmark header shared across the auth pages. */
export default function AuthBrand() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="" width={36} height={36} priority className="h-8 w-8" />
      <span className="bq-display text-lg leading-none text-[var(--ink)]">BarberQueue</span>
    </div>
  )
}
