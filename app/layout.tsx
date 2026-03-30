import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Multi-Clip Video Editor',
  description: 'Professional video editor for creating multi-clip videos with instant export',
  generator: 'v0.app',
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
      style={{ backgroundColor: '#020617', color: '#e2e8f0' }}
    >
      <body
        className="h-full font-sans antialiased selection:bg-cyan-400 selection:text-slate-950"
        style={{ backgroundColor: '#020617', color: '#e2e8f0' }}
      >
        <div className="min-h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
}
