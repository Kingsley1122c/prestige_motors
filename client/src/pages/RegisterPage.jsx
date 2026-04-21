import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, register, submitting, meta } = useMarket()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    country: '',
    location: '',
  })

  const countries = useMemo(() => meta.countries || [], [meta.countries])

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />
  }

  const submitForm = async (event) => {
    event.preventDefault()
    await register(form)
    navigate('/dashboard')
  }

  return (
    <section className="page-shell section-spaced auth-page">
      <div className="auth-layout">
        <div>
          <SectionTitle
            eyebrow="Create account"
            title="Register with valid buyer credentials"
            description="Your selected country sets the local currency used across car pricing after login."
          />
          <div className="surface-card auth-note-card">
            <p className="muted-label">What we collect</p>
            <p>Full name, email, phone, password, country, and location are required before a buyer can open the dashboard.</p>
          </div>
        </div>

        <form className="surface-card auth-form" onSubmit={submitForm}>
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />

          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />

          <label htmlFor="register-phone">Phone</label>
          <input
            id="register-phone"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            minLength="8"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />

          <label htmlFor="register-country">Country</label>
          <select
            id="register-country"
            value={form.country}
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
            required
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>

          <label htmlFor="register-location">Location</label>
          <input
            id="register-location"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            required
          />

          <button className="button button-primary button-block" disabled={submitting} type="submit">
            Create account
          </button>
          <p>
            Already registered? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </section>
  )
}