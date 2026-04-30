import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { useMarket } from '../context/MarketContext'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { meta, error, flash, clearFlash, currentUser, isAuthenticated, isAdmin, logout, selectedCountry } = useMarket()
  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/listings', label: 'Inventory' },
    { to: '/rentals', label: 'Rentals' },
    { to: '/services', label: 'Services' },
    { to: '/financing', label: 'Financing' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    ...(isAuthenticated ? [{ to: '/dashboard', label: 'User Dashboard' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Dashboard' }] : []),
  ]

  return (
    <div className="app-shell">
      <header className="site-header">
        <BrandLogo showLocation={false} variant="header" />
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)}>
          Menu
        </button>
        <span className="mobile-country-pill country-pill">{selectedCountry.code}</span>
        <nav className={`site-nav ${menuOpen ? 'site-nav-open' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
              to={item.to}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mobile-auth-links">
            {!isAuthenticated ? (
              <>
                <Link className="button button-secondary header-cta" to="/login" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link className="button button-primary header-cta" to="/create-account" onClick={() => setMenuOpen(false)}>
                  Create account
                </Link>
              </>
            ) : (
              <>
                <Link className="button button-secondary header-cta" to="/dashboard" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button className="button button-primary header-cta" onClick={logout} type="button">
                  Log out
                </button>
              </>
            )}
          </div>
        </nav>
        <div className="header-auth">
          <span className="country-pill">{selectedCountry.code}</span>
          {isAuthenticated ? (
            <>
              <span className="header-user">{currentUser.fullName}</span>
              <button className="button button-secondary header-cta" onClick={logout} type="button">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="button button-secondary header-cta" to="/login">
                Login
              </Link>
              <Link className="button button-primary header-cta" to="/create-account">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      {flash ? (
        <div className="banner banner-success" role="status" onClick={clearFlash}>
          {flash}
        </div>
      ) : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer-brand">
          <BrandLogo showLocation={false} variant="footer" />
          <p className="muted-label">Flagship showroom</p>
          <strong>{meta.company?.name}</strong>
          <p>{meta.company?.address}</p>
          <p>
            {meta.company?.phone} · {meta.company?.email}
          </p>
        </div>
        <div>
          <p className="muted-label">Client policy</p>
          <p>{meta.policies?.privacy}</p>
        </div>
        <div>
          <p className="muted-label">Release terms</p>
          <p>{meta.policies?.terms}</p>
        </div>
      </footer>
    </div>
  )
}
