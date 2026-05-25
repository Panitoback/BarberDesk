'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Download, QrCode } from 'lucide-react'

export default function BookingQRCode({ subdomain }: { subdomain: string }) {
  const qrRef = useRef<HTMLDivElement>(null)
  const bookingUrl = `https://${subdomain}.barberqueue.pro/book`

  function downloadPng() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const padding = 24
      const size = img.width + padding * 2
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, padding, padding)
      URL.revokeObjectURL(url)

      const link = document.createElement('a')
      link.download = `${subdomain}-booking-qr.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <QrCode className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Booking QR code</h2>
          <p className="text-sm text-slate-500 mt-1">
            Print this and put it on your window or counter — clients scan it to book instantly.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div
          ref={qrRef}
          className="border border-slate-200 rounded-xl p-4 bg-white shrink-0"
        >
          <QRCode value={bookingUrl} size={160} />
        </div>

        <div className="flex flex-col gap-4 justify-between flex-1">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Booking link</p>
            <p className="text-sm font-mono text-slate-700 break-all">{bookingUrl}</p>
          </div>

          <button
            onClick={downloadPng}
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-lg w-fit min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>
    </section>
  )
}
