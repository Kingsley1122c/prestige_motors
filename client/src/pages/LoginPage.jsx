import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, login, submitting, meta } = useMarket()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  if (isAuthenticated) {
    return <Navigate replace to={isAdmin ? '/admin' : '/dashboard'} />
  }

  const submitForm = async (event) => {
    event.preventDefault()
    const result = await login(form)
    navigate(result.user.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <section className="page-shell section-spaced auth-page">
      <div className="auth-layout">
        <div>
          <SectionTitle
            eyebrow="Login required"
            title="Sign in before viewing your dashboard"
            description="User dashboards require login. Admin controls remain hidden until the correct admin credentials are used."
          />
          <div className="surface-card auth-note-card">
            <p className="muted-label">Admin hint</p>
            <p>Admin email: {meta.adminCredentialsHint?.email}</p>
            <p>Use the seeded admin password configured in the demo data to access the admin dashboard.</p>
          </div>
        </div>

        <form className="surface-card auth-form" onSubmit={submitForm}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />

          <button className="button button-primary button-block" disabled={submitting} type="submit">
            Sign in
          </button>
          <p>
            No account yet? <Link to="/create-account">Create account</Link>
          </p>
        </form>
      </div>
    </section>
  )
}