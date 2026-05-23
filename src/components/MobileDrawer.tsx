import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { NavLinks } from './NavLinks'

export function MobileDrawer() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link
          to="/"
          className="rounded-md font-mono text-sm text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          orbital-debris
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-md p-2 text-fg hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <Bars3Icon aria-hidden="true" className="h-6 w-6" />
        </button>
      </header>

      <Dialog
        open={open}
        onClose={setOpen}
        className="relative z-50 md:hidden"
      >
        <DialogBackdrop className="fixed inset-0 bg-background/80" />
        <div className="fixed inset-0 flex">
          <DialogPanel className="flex w-72 max-w-[80vw] flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between px-5 py-4">
              <DialogTitle className="font-mono text-sm text-cyan">
                orbital-debris
              </DialogTitle>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-2 text-fg hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              >
                <XMarkIcon aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>
            <nav
              aria-label="Primary navigation"
              className="flex-1 overflow-y-auto px-3 pb-6"
            >
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t border-border px-5 py-4 text-xs text-faint">
              SATCAT + UCS merged
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
