'use client'

import Image from 'next/image'
import { useState } from 'react'

type GalleryPhoto = {
  id: string
  photo_url: string
  caption: string | null
}

type Props = {
  photos: GalleryPhoto[]
}

// Fixed layout positions — stable on hydration, no random values
const CARDS = [
  { rotate: '-6deg',  left: '5%',  top: '0%'  },
  { rotate: '3deg',   left: '28%', top: '22%' },
  { rotate: '-3deg',  left: '8%',  top: '46%' },
  { rotate: '5deg',   left: '32%', top: '14%' },
  { rotate: '-4deg',  left: '12%', top: '68%' },
]

export default function ShopCollage({ photos }: Props) {
  const visible = photos.slice(0, 5)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="relative w-full min-h-[560px] select-none" aria-hidden="true">
      {visible.map((photo, i) => {
        const pos      = CARDS[i]
        const isHovered = hovered === photo.id

        return (
          <div
            key={photo.id}
            className="absolute"
            style={{
              left:      pos.left,
              top:       pos.top,
              width:     '60%',
              zIndex:    isHovered ? 50 : i + 1,
              transform: `rotate(${pos.rotate})${isHovered ? ' scale(1.08)' : ''}`,
              transition: 'transform 200ms ease, z-index 0ms',
            }}
            onMouseEnter={() => setHovered(photo.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Polaroid frame */}
            <div
              className="bg-white rounded-sm"
              style={{
                padding:   '8px 8px 30px 8px',
                boxShadow: isHovered
                  ? '0 16px 40px rgba(0,0,0,0.30)'
                  : '0 4px 16px rgba(0,0,0,0.18)',
                transition: 'box-shadow 200ms ease',
              }}
            >
              {/* Image */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <Image
                  src={photo.photo_url}
                  alt={photo.caption ?? 'Shop photo'}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 22vw, 0vw"
                  draggable={false}
                />
              </div>

              {/* Caption */}
              <p className="mt-1.5 text-center text-xs text-slate-500 truncate px-1 min-h-[16px]">
                {photo.caption ?? ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
