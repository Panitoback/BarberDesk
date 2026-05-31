import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateTenantConfig, type Service } from '@/lib/tenant-config'
import { galleryPhotoUrl, GALLERY_MIN, type GalleryPhoto } from '@/lib/gallery'
import { themeStyle } from '@/lib/theme'
import { logoUrl as buildLogoUrl } from '@/lib/session'
import BookingForm from './BookingForm'
import ShopCollage from '@/components/book/ShopCollage'

export const dynamic = 'force-dynamic'

function readServices(config: unknown): Service[] {
  const result = validateTenantConfig(config ?? {})
  if (!result.ok) return []
  return result.config.services ?? []
}

export default async function BookPage() {
  const subdomain = await getSubdomain()
  if (!subdomain) notFound()

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, subdomain, config, plan')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const isSuspended = tenant.plan === 'suspended'
  const services = readServices(tenant.config)
  const hasServices = services.length > 0
  const configResult = validateTenantConfig(tenant.config ?? {})
  const depositActive    = configResult.ok ? (configResult.config.deposit_active ?? false) : false
  const depositAmountCad = configResult.ok ? (configResult.config.deposit_amount_cad ?? 20) : 20

  const { data: photos } = await supabase
    .from('shop_gallery')
    .select('id, photo_path, caption, display_order')
    .eq('tenant_id', tenant.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  const gallery: GalleryPhoto[] = (photos ?? []).map(p => ({
    id:            p.id,
    photo_path:    p.photo_path,
    caption:       p.caption,
    display_order: p.display_order,
    photo_url:     galleryPhotoUrl(p.photo_path),
  }))

  const hasGallery = gallery.length >= GALLERY_MIN
  const tenantTheme = themeStyle(configResult.ok ? configResult.config.brand_theme : undefined)
  const tenantLogoUrl = buildLogoUrl(configResult.ok ? configResult.config.logo_path : undefined)

  return (
    <div className="min-h-screen bg-slate-50" style={tenantTheme}>
      <header className="border-b border-white/10" style={{ background: 'var(--theme-bg, #0f172a)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {tenantLogoUrl ? (
              <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0">
                <img src={tenantLogoUrl} alt={tenant.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <Scissors className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-accent, #818cf8)' }} />
            )}
            <span className="text-white font-semibold tracking-tight truncate">
              {tenant.name}
            </span>
          </div>
          <Link
            href="https://barberqueue.pro"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Powered by BarberQueue
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 sm:py-16">
        {isSuspended ? (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
            <p className="text-slate-900 font-semibold">Online booking is paused.</p>
            <p className="text-slate-500 text-sm mt-2">
              Please contact {tenant.name} directly to book an appointment.
            </p>
          </div>
        ) : !hasServices ? (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 text-center">
            <p className="text-slate-900 font-semibold">Online booking is not available yet.</p>
            <p className="text-slate-500 text-sm mt-2">
              Please contact {tenant.name} directly to book an appointment.
            </p>
          </div>
        ) : hasGallery ? (
          /* ── Two-column layout: collage left, form right ── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left: collage — hidden on mobile */}
            <div className="hidden lg:block sticky top-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {tenant.name}
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                  Book your appointment online.
                </p>
              </div>
              <ShopCollage photos={gallery} />
            </div>

            {/* Right: form */}
            <div>
              {/* Mobile heading (collage hidden) */}
              <div className="lg:hidden mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Book your appointment
                </h1>
                <p className="text-slate-500 mt-2 text-sm">
                  {tenant.name} will text you to confirm.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
                <BookingForm
                  services={services}
                  shopName={tenant.name}
                  depositActive={depositActive}
                  depositAmountCad={depositAmountCad}
                />
              </div>

              {/* Mobile gallery — below the form */}
              <div className="lg:hidden mt-10">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Our Work</h2>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map(photo => (
                    <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption ?? 'Shop photo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                          <p className="text-white text-xs truncate">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-slate-400 text-xs text-center mt-6">
                By booking you agree to receive SMS messages about your appointment.
              </p>
            </div>
          </div>
        ) : (
          /* ── Single-column layout (no gallery or < 2 photos) ── */
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Book your appointment
              </h1>
              <p className="text-slate-500 mt-2 text-sm sm:text-base">
                Pick a service and a time. {tenant.name} will text you to confirm.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
              <BookingForm
                services={services}
                shopName={tenant.name}
                depositActive={depositActive}
                depositAmountCad={depositAmountCad}
              />
            </div>

            <p className="text-slate-400 text-xs text-center mt-6">
              By booking you agree to receive SMS messages about your appointment.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
