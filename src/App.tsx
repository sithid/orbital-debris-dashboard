import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import About from './pages/About'
import GlobePage from './pages/Globe'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ObjectDetail from './pages/ObjectDetail'
import Objects from './pages/Objects'
import { DashboardLayout } from './components/templates/DashboardLayout'

export default function App() {
  // Record one visit per page load (any entry route). Fire-and-forget; the
  // server dedupes per IP/day. Static assets bypass the Worker, so this client
  // beacon is what drives the counter.
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/visit', { signal: controller.signal }).catch(() => {})
    return () => controller.abort()
  }, [])

  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/objects" element={<Objects />} />
          <Route path="/objects/:id" element={<ObjectDetail />} />
          <Route path="/globe" element={<GlobePage />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  )
}
