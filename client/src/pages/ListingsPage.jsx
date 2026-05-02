import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarCard } from '../components/CarCard'
import { FilterPanel } from '../components/FilterPanel'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { getVehicleHeroImage, sortVehiclesForMerchandising } from '../utils/media'
import { formatUsd } from '../utils/format'

const DEFAULT_MAX_PRICE = '800000'

const serviceCards = [
  {
    title: 'Trade-in desk',
    description: 'Bring your current car into the deal with a structured review, value discussion, and upgrade brief.',
    cta: 'Start trade-in brief',
    href: '/services?type=trade-in',
  },
  {
    title: 'Concierge sourcing',
    description: 'Ask the Miami desk to source the exact spec you want across US stock and selective Asia export channels.',
    cta: 'Open sourcing brief',
    href: '/services?type=concierge',
  },
  {
    title: 'Private sale intake',
    description: 'List a high-value car for discreet representation, paperwork review, and buyer matching.',
    cta: 'Open private sale brief',
    href: '/services?type=private-sale',
  },
]

export function ListingsPage() {
  const { cars, meta } = useMarket()
  const [searchParams, setSearchParams] = useSearchParams()
  const bodyStyles = useMemo(
    () => [...new Set(cars.map((car) => car.bodyStyle).filter(Boolean))].sort((first, second) => first.localeCompare(second)),
    [cars],
  )

  const filters = {
    brand: searchParams.get('brand') || 'All',
    location: searchParams.get('location') || 'All',
    paymentType: searchParams.get('paymentType') || 'All',
    bodyStyle: searchParams.get('bodyStyle') || 'All',
    minPrice: searchParams.get('minPrice') || '0',
    maxPrice: searchParams.get('maxPrice') || DEFAULT_MAX_PRICE,
  }

  const updateFilter = (key, value) => {
    const nextParams = new URLSearchParams(searchParams)

    if (!value || value === 'All' || (key === 'minPrice' && value === '0') || (key === 'maxPrice' && value === DEFAULT_MAX_PRICE)) {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }

    setSearchParams(nextParams)
  }

  const filteredCars = useMemo(
    () =>
      sortVehiclesForMerchandising(cars.filter((car) => {
        if (filters.brand !== 'All' && car.brand !== filters.brand) {
          return false
        }

        if (filters.location !== 'All' && car.location !== filters.location) {
          return false
        }

        if (filters.paymentType === 'rental' && !car.rentable) {
          return false
        }

        if (filters.paymentType !== 'All' && filters.paymentType !== 'rental' && !car.paymentTypes.includes(filters.paymentType)) {
          return false
        }

        if (filters.bodyStyle !== 'All' && car.bodyStyle !== filters.bodyStyle) {
          return false
        }

        if (car.priceUsd < Number(filters.minPrice) || car.priceUsd > Number(filters.maxPrice)) {
          return false
        }

        return true
      })),
    [cars, filters.bodyStyle, filters.brand, filters.location, filters.maxPrice, filters.minPrice, filters.paymentType],
  )

  const editorialCars = useMemo(() => sortVehiclesForMerchandising(cars).slice(0, 3), [cars])

  return (
    <section className="page-shell section-spaced">
      <div className="listings-intro">
        <div className="surface-card listings-hero-card">
          <p className="eyebrow">Worldwide used inventory</p>
          <div className="hero-ribbon listings-ribbon">
            <span>Truck-led selling</span>
            <span>Used-car purchase and rental</span>
            <span>Rental-only halo exotics</span>
          </div>
          <h1>Used trucks, used Lexus, and budget cars positioned for worldwide buyers.</h1>
          <p>
            The catalog now leans into used trucks for direct selling, neatly used Lexus RX and ES stock,
            lower-budget used daily cars, and rental-only halo machines above $300,000 for premium clients.
          </p>
          <div className="listings-hero-chips">
            <span>Worldwide export support</span>
            <span>Used truck desk</span>
            <span>Used Lexus lane</span>
            <span>Rental-only exotics</span>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" to="/services?type=concierge">
              Brief the sourcing desk
            </Link>
            <Link className="button button-secondary" to="/contact#inspection">
              Book inspection support
            </Link>
          </div>
        </div>
        <div className="surface-card listings-snapshot-card">
          <p className="muted-label">Client release standard</p>
          <p>
            Every purchase or rental moves through identity review, deposit confirmation,
            and delivery planning before the vehicle is released.
          </p>
          <div className="listings-hero-chips">
            <span>ID review first</span>
            <span>Verified deposit flow</span>
            <span>Delivery planned before release</span>
          </div>
        </div>
      </div>

      <div className="listing-editorial-grid">
        {editorialCars.map((car) => (
          <article className="surface-card listing-editorial-card" key={car.id}>
            <img alt={`${car.brand} ${car.model}`} src={getVehicleHeroImage(car)} />
            <div className="listing-editorial-copy">
              <p className="muted-label">{car.location} flagship</p>
              <h3>{car.brand} {car.model}</h3>
              <p>{car.description}</p>
              <div className="finance-chip-row">
                <span>{formatUsd(car.priceUsd)}</span>
                <span>Deposit {formatUsd(car.minimumDepositUsd)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <SectionTitle
        eyebrow="Inventory"
        title="Browse used trucks, used Lexus, budget cars, and rental-only halo exotics"
        description="Filter by region, brand, body style, price, or payment type and move straight into purchase, rental, inspection, or delivery planning once the right vehicle appears."
      />
      <div className="service-lane-grid">
        {serviceCards.map((card) => (
          <article className="surface-card service-lane-card" key={card.title}>
            <p className="muted-label">Client services</p>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <Link className="button button-secondary" to={card.href}>
              {card.cta}
            </Link>
          </article>
        ))}
      </div>
      <div className="listing-layout">
        <FilterPanel
          filters={filters}
          onChange={updateFilter}
          brands={meta.brands}
          locations={meta.locations}
          bodyStyles={bodyStyles}
        />
        <div className="listing-results">
          <div className="listing-toolbar surface-card">
            <strong>Available cars</strong>
          </div>
          <div className="card-grid">
            {filteredCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
