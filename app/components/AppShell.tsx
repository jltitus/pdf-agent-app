'use client'

import { usePathname } from 'next/navigation'
import HeaderBar from './HeaderBar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const hideHeader =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/request-access' ||
    pathname.startsWith('/reset-password')

  return (
    <>
      {!hideHeader && <HeaderBar />}
      {children}
    </>
  )
}