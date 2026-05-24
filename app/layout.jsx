import { Suspense } from 'react'
import '../src/index.css'
import '../src/App.css'
import { AuthProvider } from '../src/contexts/AuthContext'
import Navbar from '../src/components/Navbar'
import Toaster from '../src/components/Toaster'
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '../src/lib/seo'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_IMAGE],
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
