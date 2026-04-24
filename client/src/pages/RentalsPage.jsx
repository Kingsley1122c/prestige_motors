import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarCard } from '../components/CarCard'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { sortVehiclesForMerchandising } from '../utils/media'
import { formatUsd } from '../utils/format'

export function RentalsPage() {
  const { cars } = useMarket()
  const [searchParams] = useSearchParams()
  const requestedCarId = searchParams.get('carId') || ''

  const rentalCars = useMemo(
    () => sortVehiclesForMerchandising(cars.filter((car) => car.rentable)),
    [cars],
  )

  const featuredRental = useMemo(
    () => rentalCars.find((car) => car.id === requestedCarId) || rentalCars[0] || null,
    [rentalCars, requestedCarId],
  )

  const rentalSnapshot = useMemo(() => {
    if (!rentalCars.length) {
      return { lowestDaily: 0, highestMonthly: 0, chauffeurCount: 0 }
    }

    return {
      lowestDaily: Math.min(...rentalCars.map((car) => car.rentalTerms?.dailyUsd || Number.MAX_SAFE_INTEGER)),
      highestMonthly: Math.max(...rentalCars.map((car) => car.rentalTerms?.monthlyUsd || 0)),
      chauffeurCount: rentalCars.filter((car) => car.rentalTerms?.chauffeurAvailable).length,
    }
  }, [rentalCars])

  if (!rentalCars.length) {
    return (
      <section className="page-shell section-spaced">
        <div className="surface-card empty-state">
          <h2>No rental inventory is live yet</h2>
          <Link className="button button-primary" to="/listings">
            Browse listings
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-shell section-spaced">
      <div className="listings-intro">
        <div className="surface-card listings-hero-card">
          <p className="eyebrow">Verified luxury rentals</p>
          <div className="hero-ribbon listings-ribbon">
            <span>Daily to monthly terms</span>
            <span>ID-reviewed release</span>
            <span>Optional chauffeur desk</span>
          </div>
          <h1>Book verified luxury cars with structured daily, weekly, and monthly rental options.</h1>
          <p>
            Rental inventory follows the same verification standard as the sales desk, with visible security deposits,
            mileage limits, and optional chauffeur coordination before release.
          </p>
          {featuredRental ? (
            <div className="finance-chip-row">
              <span>{featuredRental.brand} {featuredRental.model}</span>
              <span>From {formatUsd(featuredRental.rentalTerms.dailyUsd)}/day</span>
              <span>{formatUsd(featuredRental.rentalTerms.monthlyUsd)}/month</span>
            </div>
          ) : null}
          <div className="hero-actions">
            <Link className="button button-primary" to={featuredRental ? `/cars/${featuredRental.id}#rental-terms` : '/listings'}>
              View rental terms
            </Link>
            <Link className="button button-secondary" to="/contact#inspection">
              Request rental quote
            </Link>
          </div>
        </div>
        <div className="surface-card listings-snapshot-card">
          <p className="muted-label">Rental snapshot</p>
          <div className="listing-snapshot-grid">
            <div>
              <strong>{rentalCars.length}</strong>
              <span>Cars available to rent</span>
            </div>
            <div>
              <strong>{formatUsd(rentalSnapshot.lowestDaily)}</strong>
              <span>Lowest daily rate</span>
            </div>
            <div>
              <strong>{formatUsd(rentalSnapshot.highestMonthly)}</strong>
              <span>Highest monthly rate</span>
            </div>
            <div>
              <strong>{rentalSnapshot.chauffeurCount}</strong>
              <span>Chauffeur-ready models</span>
            </div>
          </div>
        </div>
      </div>

      <SectionTitle
        eyebrow="Rental inventory"
        title="Explore verified cars with transparent rental terms"
        description="Each car keeps its sale pricing and financing profile, but also shows daily, weekly, and monthly rental visibility before you contact the desk."
      />

      <div className="card-grid">
        {rentalCars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  )
}