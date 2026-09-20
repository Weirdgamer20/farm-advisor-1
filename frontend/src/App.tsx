import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Advisory from './pages/Advisory'
import Disease from './pages/Disease'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/advisory" element={<Advisory />} />
        <Route path="/disease" element={<Disease />} />
      </Routes>
    </BrowserRouter>
  )
}
