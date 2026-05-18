import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Multi-Clip Video Editor',
  description: 'Professional video editor for creating multi-clip videos with instant export',
  generator: 'muhammad waqas',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="h-full"
      style={{ backgroundColor: '#12072f', color: '#f8f7ff' }}
    >
      <body
        className="h-full font-sans antialiased"
        style={{ backgroundColor: '#12072f', color: '#f8f7ff' }}
      >
        <div className="min-h-full">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
}
