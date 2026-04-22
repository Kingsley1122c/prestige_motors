import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { getVehicleHeroImage } from '../utils/media'
import { formatUsd } from '../utils/format'

export function FinancingPage() {
  const [searchParams] = useSearchParams()
  const { cars, applyForFinancing, submitting, isAuthenticated, selectedCountry } = useMarket()
  const requestedCarId = searchParams.get('carId') || ''
  const selectedCar = useMemo(
    () => cars.find((car) => car.id === requestedCarId) || cars[0],
    [cars, requestedCarId],
  )
  const [form, setForm] = useState({
    carId: requestedCarId,
    fullName: '',
    phone: '',
    email: '',
    incomeUsd: '',
    location: '',
    depositUsd: '',
    months: '12',
  })

  const activeCar = useMemo(
    () => cars.find((car) => car.id === form.carId) || selectedCar,
    [cars, form.carId, selectedCar],
  )
  const activeCarId = activeCar?.id || ''
  const activeDeposit = form.depositUsd || String(activeCar?.minimumDepositUsd || '')
  const activeMonths = form.months || String(activeCar?.monthlyPlans[0]?.months || '12')

  const submitForm = async (event) => {
    event.preventDefault()
    await applyForFinancing({
      ...form,
      carId: activeCarId,
      incomeUsd: Number(form.incomeUsd),
      depositUsd: Number(activeDeposit),
      months: Number(activeMonths),
    })
    setForm({
      carId: activeCarId,
      fullName: '',
      phone: '',
      email: '',
      incomeUsd: '',
      location: '',
      depositUsd: String(activeCar?.minimumDepositUsd || ''),
      months: String(activeCar?.monthlyPlans[0]?.months || '12'),
    })
  }

  return (
    <section className="page-shell section-spaced financing-layout">
      <div>
        <SectionTitle
          eyebrow="Financing application"
          title="Apply for installment or loan approval"
          description="Provide identity, contact, income, and location details so the admin team can review affordability and next steps."
        />
        {!isAuthenticated ? (
          <div className="surface-card auth-note-card">
            <p className="muted-label">Account required</p>
            <p>Create an account or log in before submitting financing. Local pricing will follow your selected country.</p>
          </div>
        ) : null}
        <form className="surface-card financing-form" onSubmit={submitForm}>
          <label htmlFor="finance-car">Vehicle</label>
          <select
            id="finance-car"
            value={activeCarId}
            onChange={(event) => {
              const vehicle = cars.find((car) => car.id === event.target.value)
              setForm((current) => ({
                ...current,
                carId: event.target.value,
                depositUsd: String(vehicle?.minimumDepositUsd || ''),
                months: String(vehicle?.monthlyPlans[0]?.months || '12'),
              }))
            }}
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.brand} {car.model}
              </option>
            ))}
          </select>
          <div className="form-grid">
            <div>
              <label htmlFor="finance-name">Full name</label>
              <input
                id="finance-name"
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="finance-phone">Phone</label>
              <input
                id="finance-phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="finance-email">Email</label>
              <input
                id="finance-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="finance-income">Monthly income (USD)</label>
              <input
                id="finance-income"
                type="number"
                min="0"
                value={form.incomeUsd}
                onChange={(event) => setForm((current) => ({ ...current, incomeUsd: event.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="finance-location">Location</label>
              <input
                id="finance-location"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="finance-deposit">Deposit (USD)</label>
              <input
                id="finance-deposit"
                type="number"
                min={activeCar?.minimumDepositUsd || 0}
                value={activeDeposit}
                onChange={(event) => setForm((current) => ({ ...current, depositUsd: event.target.value }))}
                required
              />
            </div>
          </div>
          <label htmlFor="finance-months">Duration</label>
          <select
            id="finance-months"
            value={activeMonths}
            onChange={(event) => setForm((current) => ({ ...current, months: event.target.value }))}
          >
            {activeCar?.monthlyPlans.map((plan) => (
              <option key={plan.months} value={plan.months}>
                {plan.months} months · {formatUsd(plan.monthlyUsd)}/month
              </option>
            ))}
          </select>
          <button className="button button-primary" disabled={submitting} type="submit">
            Submit financing request
          </button>
        </form>
      </div>

      <aside className="surface-card financing-summary">
        <p className="muted-label">Approval notes</p>
        <h3>{activeCar ? `${activeCar.brand} ${activeCar.model}` : 'Select a vehicle'}</h3>
        {activeCar ? (
          <>
            <img src={getVehicleHeroImage(activeCar)} alt={`${activeCar.brand} ${activeCar.model}`} />
            <p>Minimum deposit: {formatUsd(activeCar.minimumDepositUsd)}</p>
            <p>Selected country: {selectedCountry.name}</p>
            <div className="plain-list">
              {activeCar.monthlyPlans.map((plan) => (
                <div className="plan-row" key={plan.months}>
                  <strong>{plan.months} months</strong>
                  <span>{formatUsd(plan.monthlyUsd)}/month</span>
                </div>
              ))}
            </div>
            <p>
              Approval is never guaranteed. Admin review considers your deposit, income, location,
              and verification readiness.
            </p>
          </>
        ) : null}
      </aside>
    </section>
  )
}
