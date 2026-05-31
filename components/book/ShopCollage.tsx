'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { GalleryPhoto } from '@/lib/gallery'

type Props = {
  photos: GalleryPhoto[]
}

// Portrait-friendly layout — 2×2 grid with a 5th peeking behind center
// Each card is 42% wide with 3:4 aspect ratio (portrait / phone photos)
const CARDS = [
  { rotate: '-5deg', left: '2%',  top: '2%'  },  // top-left
  { rotate:  '4deg', left: '52%', top: '4%'  },  // top-right
  { rotate: '-3deg', left: '4%',  top: '50%' },  // bottom-left
  { rotate:  '5deg', left: '50%', top: '52%' },  // bottom-right
  { rotate: '-1deg', left: '24%', top: '24%' },  // center (behind)
]

export default function ShopCollage({ photos }: Props) {
  const visible = photos.slice(0, 5)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="relative w-full select-none" style={{ minHeight: '560px' }} aria-hidden="true">
      {visible.map((photo, i) => {
        const pos       = CARDS[i]
        const isHovered = hovered === photo.id
        // Center card (index 4) renders behind, others render in order
        const baseZ = i === 4 ? 0 : i + 1

        return (
          <div
            key={photo.id}
            className="absolute"
            style={{
              left:       pos.left,
              top:        pos.top,
              width:      '43%',
              zIndex:     isHovered ? 50 : baseZ,
              transform:  `rotate(${pos.rotate})${isHovered ? ' scale(1.06)' : ''}`,
              transition: 'transform 200ms ease, z-index 0ms',
            }}
            onMouseEnter={() => setHovered(photo.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Polaroid frame */}
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
              {/* Portrait image — 3:4 ratio */}
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

              {/* Caption — only rendered if it exists */}
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
  )
}
