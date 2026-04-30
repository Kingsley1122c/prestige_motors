import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout'
import { MarketingTracker } from './components/MarketingTracker'
import { BrandLogo } from './components/BrandLogo'
import { useMarket } from './context/MarketContext'
import { AboutPage } from './pages/AboutPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { CampaignLandingPage } from './pages/CampaignLandingPage'
import { CarDetailsPage } from './pages/CarDetailsPage'
import { ContactPage } from './pages/ContactPage'
import { FinancingPage } from './pages/FinancingPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ListingsPage } from './pages/ListingsPage'
import { RegisterPage } from './pages/RegisterPage'
import { RentalsPage } from './pages/RentalsPage'
import { ServicesPage } from './pages/ServicesPage'
import { UserDashboard } from './pages/UserDashboard'

function RequireUser({ children }) {
  const { isAuthenticated } = useMarket()

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return children
}

function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin } = useMarket()

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  if (!isAdmin) {
    return <Navigate replace to="/dashboard" />
  }

  return children
}

function App() {
  const { loading } = useMarket()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="surface-card loading-panel">
          <BrandLogo showLocation={false} variant="header" />
          <span className="eyebrow">Prestige Motors</span>
          <h1>Loading verified inventory</h1>
          <p>Preparing listings, financing plans, and dashboard data.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <MarketingTracker />
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<ListingsPage />} path="listings" />
          <Route element={<CampaignLandingPage />} path="campaigns/:campaignKey" />
          <Route element={<RentalsPage />} path="rentals" />
          <Route element={<CarDetailsPage />} path="cars/:carId" />
          <Route element={<FinancingPage />} path="financing" />
          <Route element={<LoginPage />} path="login" />
          <Route element={<RegisterPage />} path="create-account" />
          <Route element={<AboutPage />} path="about" />
          <Route element={<ContactPage />} path="contact" />
          <Route element={<ServicesPage />} path="services" />
          <Route element={<RequireUser><UserDashboard /></RequireUser>} path="dashboard" />
          <Route element={<RequireAdmin><AdminDashboard /></RequireAdmin>} path="admin" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Route>
      </Routes>
    </>
  )
}

export default App
