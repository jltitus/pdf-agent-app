'use client'

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { usePathname } from "next/navigation"
import "./globals.css"
import HeaderBar from "./components/HeaderBar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "MFP Publication Agent",
  description: "Master Food Preservers Publication Assistant",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const hideHeader =
    pathname === "/login" || pathname === "/request-access"

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        {!hideHeader && <HeaderBar />}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
