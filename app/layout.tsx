import type { Metadata } from 'next'
import '@radix-ui/themes/styles.css'
import './globals.css'
import { Theme } from '@radix-ui/themes'

export const metadata: Metadata = {
  title: 'AM Copilot - MoA Account Manager AI',
  description: 'AI-powered profitability and billing management for Map of Ag',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Theme appearance="light" accentColor="blue" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  )
}
