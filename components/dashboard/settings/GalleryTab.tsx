'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Images } from 'lucide-react'
import type { GalleryPhoto } from '@/lib/gallery'
import { GALLERY_MAX, GALLERY_MIN } from '@/lib/gallery'
import Image from 'next/image'

export default function GalleryTab({ initialPhotos }: { initialPhotos: GalleryPhoto[] }) {
  const [photos,    setPhotos]    = useState<GalleryPhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [feedback,  setFeedback]  = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const atMax = photos.length >= GALLERY_MAX
  const atMin = photos.length <= GALLERY_MIN

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setFeedback(null)

    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res  = await fetch('/api/gallery', { method: 'POST', body: formData })
      const json = await res.json() as { photo?: GalleryPhoto; error?: string }

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setPhotos(prev => [...prev, json.photo!])
      setFeedback({ type: 'success', text: 'Photo added.' })
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (atMin) return
    if (!confirm('Remove this photo from the gallery?')) return

    setFeedback(null)
    try {
      const res  = await fetch(`/api/gallery/${id}`, { method: 'DELETE' })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')
      setPhotos(prev => prev.filter(p => p.id !== id))
      setFeedback({ type: 'success', text: 'Photo removed.' })
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' })
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Images className="w-5 h-5 text-indigo-500" />
            Shop Gallery
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Photos of your shop and work displayed on your booking page.
          </p>
        </div>
        <span className={`text-sm font-medium px-2.5 py-1 rounded-full shrink-0 ${
          atMax ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {photos.length} / {GALLERY_MAX}
        </span>
      </div>

      {/* Min warning */}
      {photos.length < GALLERY_MIN && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Add at least {GALLERY_MIN} photos to enable the gallery on your booking page.
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
              <Image
                src={photo.photo_url}
                alt={photo.caption ?? 'Gallery photo'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {/* Delete overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  disabled={atMin}
                  title={atMin ? `Must keep at least ${GALLERY_MIN} photos` : 'Remove photo'}
                  className="bg-white/90 hover:bg-white text-red-600 rounded-full p-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Caption */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || atMax}
        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px]"
      >
        <ImagePlus className="w-4 h-4" />
        {uploading ? 'Uploading…' : atMax ? 'Gallery full (10/10)' : 'Add photo'}
      </button>

      {/* Feedback */}
      {feedback && (
        <p
          role="status"
          className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
        >
          {feedback.text}
        </p>
      )}
    </section>
  )
}
