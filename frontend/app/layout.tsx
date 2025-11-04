import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CS2 PRO Analyzer',
  description: 'Análise profissional de demos CS2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  )
}

