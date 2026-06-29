'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function AuthBrand() {
  const [brand, setBrand] = useState('BarberQueue')
  useEffect(() => {
    const h = window.location.hostname
    if (h === 'salonqueue.pro' || h.endsWith('.salonqueue.pro')) setBrand('SalonQueue')
  }, [])

  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="" width={36} height={36} priority className="h-8 w-8" />
      <span className="bq-display text-lg leading-none text-[var(--ink)]">{brand}</span>
    </div>
  )
}
