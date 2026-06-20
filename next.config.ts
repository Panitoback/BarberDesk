import type { NextConfig } from "next";

const securityHeaders = [
  // Force HTTPS for 2 years incl. subdomains (each tenant is a subdomain).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Anti-clickjacking. frame-ancestors is the modern equivalent; both set for coverage.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  // Block MIME sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down powerful APIs the app never uses.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  async redirects() {
    return [
      {
        source: '/demo',
        destination: 'https://gjefeiwsvcjroklvkbuk.supabase.co/storage/v1/object/public/landing-assets/demo.mp4',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
