const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export type GalleryPhoto = {
  id: string
  photo_path: string
  caption: string | null
  display_order: number
  photo_url: string
}

export function galleryPhotoUrl(photoPath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/shop-gallery/${photoPath}`
}

export const GALLERY_MAX = 10
export const GALLERY_MIN = 2
