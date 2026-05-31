'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import type { GalleryPhoto } from '@/lib/gallery'

type Props = {
  photos: GalleryPhoto[]
}

// 4 cards max — angles chosen so no two adjacent cards feel parallel.
// Left column alternates: strong left / right lean
// Right column alternates: subtle right / left lean (always opposite of left column)
const CARDS = [
  { rotate: '-8deg', left: '2%',  top: '1%'  },  // top-left    — hard left
  { rotate:  '3deg', left: '52%', top: '7%'  },  // top-right   — gentle right
  { rotate:  '6deg', left: '5%',  top: '50%' },  // bottom-left — right (≠ top-left)
  { rotate: '-5deg', left: '50%', top: '55%' },  // bottom-right— left  (≠ top-right)
]

export default function ShopCollage({ photos }: Props) {
  const visible = photos.slice(0, 4)
  const hasMore = photos.length > 4

  const [hovered,       setHovered]       = useState<string | null>(null)
  const [carouselOpen,  setCarouselOpen]  = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const closeCarousel = useCallback(() => setCarouselOpen(false), [])

  const prev = useCallback(() => {
    setCarouselIndex(i => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  const next = useCallback(() => {
    setCarouselIndex(i => (i + 1) % photos.length)
  }, [photos.length])

  // Keyboard: Escape to close, arrows to navigate
  useEffect(() => {
    if (!carouselOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      closeCarousel()
      if (e.key === 'ArrowLeft')   prev()
      if (e.key === 'ArrowRight')  next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [carouselOpen, closeCarousel, prev, next])

  function openCarousel(startIndex = 0) {
    setCarouselIndex(startIndex)
    setCarouselOpen(true)
  }

  return (
    <>
      {/* ── Collage (4 photos max) ── */}
      <div
        className="relative w-full select-none"
        style={{ minHeight: '600px' }}
        aria-hidden={carouselOpen}
      >
        {visible.map((photo, i) => {
          const pos       = CARDS[i]
          const isHovered = hovered === photo.id

          return (
            <div
              key={photo.id}
              className="absolute cursor-pointer"
              style={{
                left:       pos.left,
                top:        pos.top,
                width:      '44%',
                zIndex:     isHovered ? 50 : i + 1,
                transform:  `rotate(${pos.rotate})${isHovered ? ' scale(1.06)' : ''}`,
                transition: 'transform 200ms ease',
              }}
              onClick={() => openCarousel(i)}
              onMouseEnter={() => setHovered(photo.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="bg-white rounded-sm"
                style={{
                  padding:    '6px 6px 10px 6px',
                  boxShadow:  isHovered
                    ? '0 14px 36px rgba(0,0,0,0.32)'
                    : '0 4px 14px rgba(0,0,0,0.20)',
                  transition: 'box-shadow 200ms ease',
                }}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  <Image
                    src={photo.photo_url}
                    alt={photo.caption ?? 'Shop photo'}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 20vw, 0vw"
                    draggable={false}
                  />
                </div>
                {photo.caption && (
                  <p className="mt-1 text-center text-xs text-slate-500 truncate px-1">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── "See all" link — OUTSIDE the collage so it's never hidden behind cards ── */}
      {hasMore && (
        <button
          type="button"
          onClick={() => openCarousel(0)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors mx-auto"
        >
          <span className="underline underline-offset-2">
            See all {photos.length} photos
          </span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* ── Carousel modal ── */}
      {carouselOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85"
          onClick={closeCarousel}
        >
          <div
            className="relative flex flex-col items-center"
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Counter + close row */}
            <div className="flex items-center justify-between w-full mb-3 px-1">
              <p className="text-white/60 text-sm">
                {carouselIndex + 1} / {photos.length}
              </p>
              <button
                type="button"
                onClick={closeCarousel}
                className="text-white/70 hover:text-white text-sm flex items-center gap-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Polaroid image */}
            <div
              className="bg-white rounded-sm"
              style={{
                padding: '8px 8px 28px 8px',
                width: 'min(340px, 80vw)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <Image
                  src={photos[carouselIndex].photo_url}
                  alt={photos[carouselIndex].caption ?? 'Shop photo'}
                  fill
                  className="object-cover"
                  sizes="340px"
                />
              </div>
              {photos[carouselIndex].caption && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  {photos[carouselIndex].caption}
                </p>
              )}
            </div>

            {/* Prev / Next + dots */}
            <div className="flex items-center gap-5 mt-4">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-lg"
              >
                ←
              </button>

              <div className="flex gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    aria-label={`Go to photo ${i + 1}`}
                    className={`rounded-full transition-all ${
                      i === carouselIndex
                        ? 'w-3 h-1.5 bg-white'
                        : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-lg"
              >
                →
              </button>
            </div>

            <p className="mt-3 text-white/30 text-xs">
              ← → arrow keys to navigate · Esc to close
            </p>
          </div>
        </div>
      )}
    </>
  )
}
