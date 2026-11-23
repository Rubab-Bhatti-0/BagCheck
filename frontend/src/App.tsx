import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import BrowsePage from './pages/BrowsePage'
import ItemDetailPage from './pages/ItemDetailPage'
import ReportPage from './pages/ReportPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import HowItWorksPage from './pages/HowItWorksPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0f1117] text-white">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/browse" replace />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
          </Routes>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1d2e', color: '#fff', border: '1px solid #2d3148' },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
