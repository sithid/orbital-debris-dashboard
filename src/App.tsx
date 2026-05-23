import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import About from './pages/About'
import Home from './pages/Home'
import ObjectDetail from './pages/ObjectDetail'
import Objects from './pages/Objects'
import { MobileDrawer } from './components/MobileDrawer'
import { Sidebar } from './components/Sidebar'

function NotFound() {
  return (
    <section className="px-8 py-16">
      <p className="text-xs uppercase tracking-widest text-muted">404</p>
      <h1 className="mt-2 text-4xl font-semibold text-fg">Not found</h1>
      <p className="mt-4 text-muted">
        The page you're looking for doesn't exist.
      </p>
    </section>
  )
}

function Shell({ children }: { children: ReactNode }) {
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

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/objects" element={<Objects />} />
          <Route path="/objects/:id" element={<ObjectDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
