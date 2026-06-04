import { BrowserRouter, Route, Routes } from 'react-router-dom'
import About from './pages/About'
import GlobePage from './pages/Globe'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ObjectDetail from './pages/ObjectDetail'
import Objects from './pages/Objects'
import { DashboardLayout } from './components/templates/DashboardLayout'

export default function App() {
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
