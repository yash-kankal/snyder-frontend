import { Suspense } from 'react'
import '../src/index.css'
import '../src/App.css'
import { AuthProvider } from '../src/contexts/AuthContext'
import Navbar from '../src/components/Navbar'
import Toaster from '../src/components/Toaster'

export const metadata = {
  metadataBase: new URL('https://cuedup.online'),
  title: 'CuedUp',
  description: 'Discover movies, TV shows, people and more on CuedUp.',
  openGraph: {
    siteName: 'CuedUp',
    type: 'website',
    title: 'CuedUp',
    description: 'Discover movies, TV shows, people and more on CuedUp.',
    images: [{ url: '/CuedUpLogo.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CuedUp',
    description: 'Discover movies, TV shows, people and more on CuedUp.',
    images: ['/CuedUpLogo.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
