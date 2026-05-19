/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
  },
  // Suppress the metadataBase warning — we set it in layout
  experimental: {},
}

export default nextConfig
