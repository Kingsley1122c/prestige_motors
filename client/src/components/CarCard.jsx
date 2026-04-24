import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { VehicleImageLightbox } from './VehicleImageLightbox'
import { useMarket } from '../context/MarketContext'
import { getVehicleGalleryItems, getVehicleHeroImage } from '../utils/media'
import { formatLocal, formatMileage, formatUsd } from '../utils/format'

export function CarCard({ car }) {
  const { favoriteIds, toggleFavorite, submitting, getLocalizedPrice } = useMarket()
  const leadPlan = car.monthlyPlans[0]
  const rentalTerms = car.rentalTerms
  const localPrice = getLocalizedPrice(car.priceUsd)
  const highlightPreview = car.highlights.slice(0, 2)
  const cardImage = getVehicleHeroImage(car)
  const galleryItems = useMemo(() => getVehicleGalleryItems(car), [car])
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false)

  const openGalleryLightbox = () => {
    setActiveGalleryIndex(0)
    setGalleryLightboxOpen(true)
  }

  return (
    <>
      <article className="car-card">
      <div className="car-card-media">
        <button
          aria-label={`Open ${car.brand} ${car.model} gallery`}
          className="car-card-media-launch"
          onClick={openGalleryLightbox}
          type="button"
        >
          <img src={cardImage} alt={`${car.brand} ${car.model}`} />
          <span className="car-card-media-hint">Open gallery</span>
        </button>
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
          {car.bodyStyle} collection with {car.paymentTypes.includes('rental') ? 'rental and ' : ''}{car.paymentTypes.includes('installment') ? 'installment-ready' : 'full-payment'} release terms.
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
          {car.paymentTypes.includes('rental') ? <span>Rent from {formatUsd(rentalTerms.dailyUsd)}/day</span> : null}
        </div>
        <div className="card-actions">
          <Link className="button button-primary" to={`/cars/${car.id}`}>
            View details
          </Link>
          <Link className="button button-secondary" to={car.paymentTypes.includes('rental') ? `/cars/${car.id}#rental-terms` : `/financing?carId=${car.id}`}>
            {car.paymentTypes.includes('rental') ? 'Rent options' : 'Apply for loan'}
          </Link>
        </div>
      </div>
      </article>
      <VehicleImageLightbox
        activeIndex={activeGalleryIndex}
        car={car}
        galleryItems={galleryItems}
        isOpen={galleryLightboxOpen}
        onClose={() => setGalleryLightboxOpen(false)}
        onSelectIndex={setActiveGalleryIndex}
      />
    </>
  )
}
