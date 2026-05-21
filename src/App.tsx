  import type { ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import Home from './pages/Home'

function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <section className="px-8 py-16">
      <p className="text-xs uppercase tracking-widest text-muted">{phase}</p>
      <h1 className="mt-2 text-4xl font-semibold text-fg">{title}</h1>
      <p className="mt-4 text-muted">Placeholder — implemented in a later phase.</p>
    </section>
  )
}

function ObjectDetailPlaceholder() {
  const { id } = useParams()
  return (
    <section className="px-8 py-16">
      <p className="text-xs uppercase tracking-widest text-muted">Phase 3</p>
      <h1 className="mt-2 text-4xl font-semibold text-fg">
        Object <span className="font-mono text-cyan">{id}</span>
      </h1>
      <p className="mt-4 text-muted">Placeholder — implemented in a later phase.</p>
    </section>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-fg">
      <header className="border-b border-border px-8 py-4">
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/" className="font-mono text-cyan">
            orbital-debris-dashboard
          </Link>
          <Link to="/objects" className="text-muted hover:text-fg">
            Objects
          </Link>
          <Link to="/about" className="text-muted hover:text-fg">
            About
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/objects"
            element={<Placeholder phase="Phase 2" title="Objects" />}
          />
          <Route path="/objects/:id" element={<ObjectDetailPlaceholder />} />
          <Route
            path="/about"
            element={<Placeholder phase="Phase 4" title="About" />}
          />
          <Route
            path="*"
            element={<Placeholder phase="404" title="Not found" />}
          />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
