import { Link } from 'react-router-dom'
import { useMarket } from '../context/MarketContext'
import { formatLocal, formatMileage, formatUsd } from '../utils/format'

export function CarCard({ car }) {
  const { favoriteIds, toggleFavorite, submitting, getLocalizedPrice } = useMarket()
  const leadPlan = car.monthlyPlans[0]
  const localPrice = getLocalizedPrice(car.priceUsd)
  const highlightPreview = car.highlights.slice(0, 2)
  const cardImage = car.heroImage || car.displayHeroImage

  return (
    <article className="car-card">
      <div className="car-card-media">
        <img src={cardImage} alt={`${car.brand} ${car.model}`} />
        <span className="car-badge">{car.badge}</span>
        <span className="car-location-chip">{car.location}</span>
        <button
          className={`icon-button ${favoriteIds.has(car.id) ? 'icon-button-active' : ''}`}
          type="button"
          onClick={() => toggleFavorite(car.id)}
          disabled={submitting}
          aria-label="Save car"
        >
          {favoriteIds.has(car.id) ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="car-card-body">
        <div className="car-card-topline">
          <div>
            <p className="muted-label">{car.brand}</p>
            <h3>{car.model}</h3>
          </div>
          <div className="text-right">
            <strong>{formatUsd(car.priceUsd)}</strong>
            <span>{formatLocal(localPrice.amount, localPrice.currencyCode, localPrice.locale)}</span>
          </div>
        </div>
        <div className="car-meta-grid">
          <span>{car.year}</span>
          <span>{formatMileage(car.mileage)}</span>
          <span>{car.condition}</span>
          <span>{car.location}</span>
        </div>
        <p className="car-card-marketline">
          {car.bodyStyle} collection with {car.paymentTypes.includes('installment') ? 'installment-ready' : 'full-payment'} release terms.
        </p>
        <p className="card-description">{car.description}</p>
        <div className="car-highlight-row">
          {highlightPreview.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
        <div className="finance-chip-row">
          <span>Deposit from {formatUsd(car.minimumDepositUsd)}</span>
          <span>{leadPlan.months} months from {formatUsd(leadPlan.monthlyUsd)}/mo</span>
        </div>
        <div className="card-actions">
          <Link className="button button-primary" to={`/cars/${car.id}`}>
            View details
          </Link>
          <Link className="button button-secondary" to={`/financing?carId=${car.id}`}>
            Apply for loan
          </Link>
        </div>
      </div>
    </article>
  )
}
