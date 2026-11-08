import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YouTube Video Trimmer & Cutter – Free Online Clip Maker',
  description: 'Trim and cut YouTube videos online for free. Paste a link, set start and end times, find top moments, add subtitles and export clips for Shorts and Reels.',
  generator: 'v0.app',
  verification: {
    google: 'BxkoUjNYT7xrfLbQvzP6n2Os7yg4mj5Xz7FPbnCLENI',
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
      style={{ backgroundColor: '#f8f9fd', color: '#110d2e' }}
    >
      <body
        className="h-full font-sans antialiased"
        style={{ backgroundColor: '#f8f9fd', color: '#110d2e' }}
      >
        <div className="min-h-full">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
}
