import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Order Tracking System',
  description: 'Track orders through multiple interfaces',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
