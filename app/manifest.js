export default function manifest() {
  return {
    name: 'CuedUp',
    short_name: 'CuedUp',
    description: 'Discover movies and TV shows — where to watch, trailers, cast, and more.',
    start_url: '/browse?section=movies',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    lang: 'en',
    scope: '/',
    icons: [
      { src: '/PopCorn.png', sizes: '192x192', type: 'image/png' },
      { src: '/PopCorn.png', sizes: '512x512', type: 'image/png' },
      { src: '/PopCorn.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
