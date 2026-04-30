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
  const isRentable = Boolean(car.rentable || car.paymentTypes.includes('rental'))
  const supportsInstallment = car.paymentTypes.includes('installment')
  const supportsFullPurchase = car.paymentTypes.includes('full')
  const supportsSale = supportsInstallment || supportsFullPurchase
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
          {supportsSale && isRentable
            ? `${car.bodyStyle} inventory with purchase and rental release options.`
            : isRentable
              ? `${car.bodyStyle} inventory reserved for approved rental bookings only.`
              : supportsInstallment
                ? `${car.bodyStyle} inventory with full-payment and installment purchase options.`
                : `${car.bodyStyle} inventory with direct-purchase release terms.`}
        </p>
        <p className="card-description">{car.description}</p>
        <div className="car-highlight-row">
          {highlightPreview.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
        <div className="finance-chip-row">
          {supportsSale ? <span>Deposit from {formatUsd(car.minimumDepositUsd)}</span> : null}
          {supportsInstallment ? <span>{leadPlan.months} months from {formatUsd(leadPlan.monthlyUsd)}/mo</span> : null}
          {isRentable ? <span>Rent from {formatUsd(rentalTerms.dailyUsd)}/day</span> : null}
        </div>
        <div className="card-actions">
          <Link className="button button-primary" to={`/cars/${car.id}`}>
            View details
          </Link>
          <Link className="button button-secondary" to={isRentable ? `/cars/${car.id}#rental-terms` : `/financing?carId=${car.id}`}>
            {isRentable ? 'Rent options' : supportsInstallment ? 'Apply for loan' : 'Purchase review'}
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
