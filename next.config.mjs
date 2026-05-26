/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
  },

  async headers() {
    return [
      {
        // All HTML routes — browsers must always fetch fresh from Vercel.
        // Excludes _next/static (content-hashed JS/CSS — safe to cache forever)
        // and _next/image (Next.js manages its own image cache headers).
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },

  experimental: {},
}

export default nextConfig
