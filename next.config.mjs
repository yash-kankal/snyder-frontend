/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.cuedup.online' }],
        destination: 'https://cuedup.online/:path*',
        permanent: true,
      },
    ]
  },
  experimental: {},
}

export default nextConfig
