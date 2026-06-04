import type { ReactNode } from 'react'
import { Sidebar } from '../organisms/Sidebar'
import { MobileDrawer } from '../organisms/MobileDrawer'

// The app shell: fixed desktop sidebar + mobile drawer, with routed content in
// the main column (offset by the sidebar width at md+).
export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-fg">
      <Sidebar />
      <MobileDrawer />
      <div className="md:pl-60">
        <main>{children}</main>
      </div>
    </div>
  )
}
