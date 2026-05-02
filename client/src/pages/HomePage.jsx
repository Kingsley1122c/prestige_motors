import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { getVehicleHeroImage, sortVehiclesForMerchandising } from '../utils/media'
import { formatUsd } from '../utils/format'

const processSteps = [
  'Browse used trucks, neatly used Lexus RX and ES stock, and lower-budget daily cars with full pricing visibility.',
  'Schedule inspection or a remote walkaround before making any release payment or rental booking.',
  'Used vehicles support purchase and rental, while halo exotics above $300,000 stay rental-only with worldwide coordination.',
]

const showroomLanes = [
  {
    title: 'Global truck desk',
    text: 'Used pickups and utility trucks sourced for work, family, towing, and export buyers across multiple continents.',
  },
  {
    title: 'Worldwide delivery network',
    text: 'Inventory now spans the Americas, Europe, the Middle East, Asia, and Africa with export paperwork support before release.',
  },
  {
    title: 'Luxury rental desk',
    text: 'Super-luxury and halo cars above $300,000 are positioned as rental-only units with premium client handling.',
  },
]

const normalizeAdToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cars, featuredCars, meta } = useMarket()
  const landingTransitionDurationMs = 280
  const [quickSearch, setQuickSearch] = useState({
    brand: 'All',
    location: 'All',
    paymentType: 'All',
  })
  const [selectedLandingCarId, setSelectedLandingCarId] = useState('')
  const [isLandingCarVisible, setIsLandingCarVisible] = useState(true)

  const adSignals = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const source = String(params.get('utm_source') || params.get('source') || '').toLowerCase()
    const medium = String(params.get('utm_medium') || '').toLowerCase()
    const campaign = String(params.get('utm_campaign') || '').toLowerCase()
    const adDescriptor = [
      campaign,
      params.get('utm_content'),
      params.get('utm_term'),
      params.get('inventory'),
      params.get('style'),
      params.get('brand'),
    ]
      .map((value) => normalizeAdToken(value))
      .join(' ')
      .trim()
    const bodyStyles = [...new Set(cars.map((car) => car.bodyStyle).filter(Boolean))]
    const matchedBrand = meta.brands.find((brand) => adDescriptor.includes(normalizeAdToken(brand))) || null
    const matchedBodyStyle = bodyStyles.find((bodyStyle) => adDescriptor.includes(normalizeAdToken(bodyStyle))) || null

    return {
      isAdTraffic: Boolean(
      params.get('fbclid') ||
        source.includes('facebook') ||
        source.includes('instagram') ||
        source.includes('meta') ||
        medium.includes('paid') ||
        medium.includes('social') ||
        campaign.includes('facebook') ||
        campaign.includes('instagram') ||
        campaign.includes('meta'),
      ),
      matchedBrand,
      matchedBodyStyle,
    }
  }, [cars, location.search, meta.brands])

  const landingInventory = useMemo(() => {
    let inventorySlice = featuredCars

    if (adSignals.matchedBrand) {
      inventorySlice = cars.filter((car) => car.brand === adSignals.matchedBrand)
    } else if (adSignals.matchedBodyStyle) {
      inventorySlice = cars.filter((car) => car.bodyStyle === adSignals.matchedBodyStyle)
    }

    return sortVehiclesForMerchandising(inventorySlice.length ? inventorySlice : featuredCars)
  }, [adSignals.matchedBodyStyle, adSignals.matchedBrand, cars, featuredCars])

  const landingSliderCars = useMemo(() => landingInventory.slice(0, 8), [landingInventory])
  const activeLandingCarId = useMemo(
    () => landingSliderCars.find((car) => car.id === selectedLandingCarId)?.id || landingSliderCars[0]?.id || '',
    [landingSliderCars, selectedLandingCarId],
  )

  const selectedLandingCar = useMemo(
    () => landingSliderCars.find((car) => car.id === activeLandingCarId) || null,
    [activeLandingCarId, landingSliderCars],
  )

  useEffect(() => {
    if (!landingSliderCars.length) {
      return undefined
    }

    let switchTimer
    const rotationTimer = window.setInterval(() => {
      setIsLandingCarVisible(false)
      switchTimer = window.setTimeout(() => {
        setSelectedLandingCarId((currentId) => {
          const resolvedCurrentId = landingSliderCars.find((car) => car.id === currentId)?.id || landingSliderCars[0].id
          const currentIndex = landingSliderCars.findIndex((car) => car.id === resolvedCurrentId)
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % landingSliderCars.length : 0
          return landingSliderCars[nextIndex].id
        })
        setIsLandingCarVisible(true)
      }, landingTransitionDurationMs)
    }, 4200)

    return () => {
      window.clearInterval(rotationTimer)
      if (switchTimer) {
        window.clearTimeout(switchTimer)
      }
    }
  }, [landingSliderCars, landingTransitionDurationMs])

  const landingInventoryHref = useMemo(() => {
    const params = new URLSearchParams()

    if (adSignals.matchedBrand) {
      params.set('brand', adSignals.matchedBrand)
    }

    if (adSignals.matchedBodyStyle) {
      params.set('bodyStyle', adSignals.matchedBodyStyle)
    }

    const query = params.toString()
    return query ? `/listings?${query}` : '/listings'
  }, [adSignals.matchedBodyStyle, adSignals.matchedBrand])

  const landingContent = adSignals.isAdTraffic
    ? adSignals.matchedBrand
      ? {
          eyebrow: `${adSignals.matchedBrand} inventory`,
          primaryCta: `See ${adSignals.matchedBrand} inventory`,
        }
      : adSignals.matchedBodyStyle
        ? {
            eyebrow: `${adSignals.matchedBodyStyle} inventory`,
            primaryCta: `See ${adSignals.matchedBodyStyle} inventory`,
          }
        : {
            eyebrow: 'Shop cars now',
            primaryCta: 'View all cars',
          }
    : {
        eyebrow: 'Available now',
        primaryCta: 'Browse all cars',
      }

  const whatsappHref = useMemo(() => {
    const phone = String(meta.company?.phone || '').replace(/\D/g, '')

    if (!phone) {
      return '/contact'
    }

    const message = adSignals.matchedBrand
      ? `Hi, I came from your ad and want to ask about ${adSignals.matchedBrand} inventory.`
      : adSignals.matchedBodyStyle
        ? `Hi, I came from your ad and want to ask about your ${adSignals.matchedBodyStyle.toLowerCase()} inventory.`
        : 'Hi, I came from your ad and want to ask about your available cars.'

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }, [adSignals.matchedBodyStyle, adSignals.matchedBrand, meta.company?.phone])

  const truckSpotlightCars = useMemo(
    () => sortVehiclesForMerchandising(cars.filter((car) => car.bodyStyle === 'Truck')).slice(0, 3),
    [cars],
  )

  const lexusSpotlightCars = useMemo(
    () => sortVehiclesForMerchandising(
      cars.filter((car) => car.brand === 'Lexus' && /^(RX|ES)\b/.test(car.model) && /used/i.test(car.condition)),
    ).slice(0, 3),
    [cars],
  )

  const budgetSpotlightCars = useMemo(
    () => sortVehiclesForMerchandising(cars.filter((car) => /used/i.test(car.condition) && car.priceUsd <= 40000)).slice(0, 3),
    [cars],
  )

  const rentalHaloCars = useMemo(
    () => sortVehiclesForMerchandising(cars.filter((car) => car.rentable && !car.paymentTypes.includes('full') && !car.paymentTypes.includes('installment'))).slice(0, 3),
    [cars],
  )

  const categorySpotlights = useMemo(() => ([
    {
      key: 'truck',
      eyebrow: 'Truck row',
      title: 'Used trucks positioned for sale and rental',
      href: '/listings?bodyStyle=Truck',
      cta: 'View trucks',
      cars: truckSpotlightCars,
    },
    {
      key: 'lexus',
      eyebrow: 'Lexus row',
      title: 'Neatly used Lexus RX and ES inventory',
      href: '/listings?brand=Lexus',
      cta: 'View Lexus',
      cars: lexusSpotlightCars,
    },
    {
      key: 'budget',
      eyebrow: 'Budget row',
      title: 'Lower-budget used cars for global buyers',
      href: '/listings?maxPrice=40000',
      cta: 'View budget cars',
      cars: budgetSpotlightCars,
    },
  ]), [budgetSpotlightCars, lexusSpotlightCars, truckSpotlightCars])

  const submitSearch = (event) => {
    event.preventDefault()
    const params = new URLSearchParams()

    Object.entries(quickSearch).forEach(([key, value]) => {
      if (value !== 'All') {
        params.set(key, value)
      }
    })

    navigate(`/listings?${params.toString()}`)
  }

  return (
    <>
      <section className="page-shell landing-inventory">
        <div className="landing-inventory-shell glass-panel">
          {selectedLandingCar ? (
            <div className="landing-slider-shell">
              <article
                className={`landing-slider-spotlight ${isLandingCarVisible ? 'landing-slider-spotlight-live' : 'landing-slider-spotlight-transitioning'}`}
              >
                <img
                  alt={`${selectedLandingCar.brand} ${selectedLandingCar.model}`}
                  className="landing-slider-spotlight-image"
                  src={getVehicleHeroImage(selectedLandingCar)}
                />
                <div className="landing-slider-overlay">
                  <div className="landing-slider-meta">
                    <span className="landing-slider-badge">Selected car</span>
                    <h2>{selectedLandingCar.brand} {selectedLandingCar.model}</h2>
                    <p>
                      {selectedLandingCar.location} · ${selectedLandingCar.priceUsd.toLocaleString()} · {selectedLandingCar.bodyStyle}
                    </p>
                  </div>
                  <Link className="glass-view-more" to={`/cars/${selectedLandingCar.id}`}>
                    View more
                  </Link>
                </div>
              </article>
            </div>
          ) : null}

          <div className="landing-inventory-header">
            <div className="landing-inventory-copy">
              <span className="eyebrow">{landingContent.eyebrow}</span>
            </div>
            <div className="landing-inventory-actions">
              <Link className="button button-primary" to={landingInventoryHref}>
                {landingContent.primaryCta}
              </Link>
              <a className="button button-whatsapp" href={whatsappHref} rel="noreferrer" target="_blank">
                WhatsApp now
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="hero-section page-shell">
        <div className="hero-copy glass-panel">
          <span className="eyebrow">Worldwide truck-first inventory</span>
          <div className="hero-ribbon">
            <span>Used truck desk</span>
            <span>Used-car purchase and rental</span>
            <span>Worldwide delivery coordination</span>
          </div>
          <h1>
            Used Trucks.
            <span> Global Delivery.</span>
          </h1>
          <p>
            Prestige Motors now leads with neatly used trucks, verified Lexus RX and ES stock,
            and lower-budget daily cars for buyers who want clean paperwork, worldwide delivery
            support, and rental-only access to halo exotics above $300,000.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/listings">
              View inventory
            </Link>
            <Link className="button button-secondary" to="/contact#inspection">
              Book a private showing
            </Link>
          </div>
          <div className="hero-ledger">
            {showroomLanes.map((lane) => (
              <article className="hero-ledger-card" key={lane.title}>
                <strong>{lane.title}</strong>
                <p>{lane.text}</p>
              </article>
            ))}
          </div>
        </div>

        <form className="hero-search glass-panel" onSubmit={submitSearch}>
          <div className="search-header">
            <strong>Search the floor</strong>
            <span>Filter by showroom, marque, or payment structure.</span>
          </div>
          <label htmlFor="hero-brand">Brand</label>
          <select
            id="hero-brand"
            value={quickSearch.brand}
            onChange={(event) => setQuickSearch((current) => ({ ...current, brand: event.target.value }))}
          >
            <option value="All">All</option>
            {meta.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <label htmlFor="hero-location">Location</label>
          <select
            id="hero-location"
            value={quickSearch.location}
            onChange={(event) =>
              setQuickSearch((current) => ({ ...current, location: event.target.value }))
            }
          >
            <option value="All">All</option>
            {meta.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <label htmlFor="hero-payment">Payment type</label>
          <select
            id="hero-payment"
            value={quickSearch.paymentType}
            onChange={(event) =>
              setQuickSearch((current) => ({ ...current, paymentType: event.target.value }))
            }
          >
            <option value="All">All</option>
            <option value="full">Full payment</option>
            <option value="installment">Installment</option>
            <option value="rental">Rental</option>
          </select>
          <button className="button button-primary button-block" type="submit">
            Search inventory
          </button>
          <div className="search-tags">
            <span>Tacoma</span>
            <span>Hilux</span>
            <span>Lexus RX</span>
            <span>Toyota Camry</span>
          </div>
          <div className="hero-search-note">
            <strong>Client services</strong>
            <span>Showings are arranged with ID verification, worldwide delivery planning, and rental-only handling for halo cars above $300,000.</span>
          </div>
        </form>
      </section>

      <section className="page-shell section-spaced signature-section">
        <SectionTitle
          eyebrow="Category spotlights"
          title="Used trucks first, then used Lexus and lower-budget daily cars"
          description="Jump straight into the main truck, Lexus RX/ES, and budget-used groups before narrowing by region, brand, or rental preference."
        />
        <div className="info-stack">
          {categorySpotlights.map((group) => (
            <div className="category-spotlight-block" key={group.key}>
              <div className="landing-inventory-header category-spotlight-header">
                <div className="landing-inventory-copy">
                  <span className="eyebrow">{group.eyebrow}</span>
                  <h2>{group.title}</h2>
                </div>
                <Link className="button button-secondary" to={group.href}>
                  {group.cta}
                </Link>
              </div>
              <div className="listing-editorial-grid">
                {group.cars.map((car) => (
                  <article className="surface-card listing-editorial-card" key={car.id}>
                    <img alt={`${car.brand} ${car.model}`} src={getVehicleHeroImage(car)} />
                    <div className="listing-editorial-copy">
                      <p className="muted-label">{car.location} {group.key} lane</p>
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
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell section-spaced signature-section">
        <SectionTitle
          eyebrow="Lexus lane"
          title="Fresh RX, ES, TX, GX, LS, and LC inventory now live"
          description="Use the shortcut filters or go straight into the newest Lexus stock with updated pricing and model-specific verified photography."
        />
        <div className="service-lane-grid">
          <article className="surface-card service-lane-card">
            <p className="muted-label">Quick filter</p>
            <h3>Lexus inventory</h3>
            <p>Browse every Lexus listing currently live, from RX and ES daily drivers to LC and LS halo cars.</p>
            <Link className="button button-primary" to="/listings?brand=Lexus">
              View all Lexus cars
            </Link>
          </article>
          <article className="surface-card service-lane-card">
            <p className="muted-label">Quick filter</p>
            <h3>Lexus SUVs</h3>
            <p>Jump directly into RX, GX, LX, and TX models if the search starts with Lexus utility and family comfort.</p>
            <Link className="button button-secondary" to="/listings?brand=Lexus&bodyStyle=SUV">
              View Lexus SUVs
            </Link>
          </article>
          <article className="surface-card service-lane-card">
            <p className="muted-label">Quick filter</p>
            <h3>Lexus sedans</h3>
            <p>Open the ES, IS, and LS sedan lane for buyers focused on executive comfort, traction, and quieter long-distance use.</p>
            <Link className="button button-secondary" to="/listings?brand=Lexus&bodyStyle=Sedan">
              View Lexus sedans
            </Link>
          </article>
        </div>
        <div className="listing-editorial-grid">
          {lexusSpotlightCars.map((car) => (
            <article className="surface-card listing-editorial-card" key={car.id}>
              <img alt={`${car.brand} ${car.model}`} src={getVehicleHeroImage(car)} />
              <div className="listing-editorial-copy">
                <p className="muted-label">{car.location} Lexus stock</p>
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
      </section>

      <section className="page-shell section-spaced split-section">
        <div>
          <SectionTitle
            eyebrow="Rental-only halo desk"
            title="Halo exotics above $300,000 stay rental only"
            description="The top exotic lane now stays focused on premium rental handling for Ferrari, Lamborghini, Bentley, and similar halo inventory above the purchase threshold."
          />
          <div className="listing-editorial-grid">
            {rentalHaloCars.map((car) => (
              <article className="surface-card listing-editorial-card" key={car.id}>
                <img alt={`${car.brand} ${car.model}`} src={getVehicleHeroImage(car)} />
                <div className="listing-editorial-copy">
                  <p className="muted-label">{car.location} rental-only lane</p>
                  <h3>{car.brand} {car.model}</h3>
                  <p>{car.description}</p>
                  <div className="finance-chip-row">
                    <span>{formatUsd(car.priceUsd)}</span>
                    <span>Rental only</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="surface-card policy-card">
          <p className="muted-label">Rental-only filters</p>
          <h3>Jump straight into the halo rental desk</h3>
          <ul className="plain-list">
            <li><Link to="/listings?brand=Ferrari">Ferrari inventory</Link></li>
            <li><Link to="/listings?brand=Lamborghini">Lamborghini inventory</Link></li>
            <li><Link to="/listings?brand=McLaren">McLaren inventory</Link></li>
            <li><Link to="/listings?brand=Porsche&bodyStyle=Coupe">Porsche coupe inventory</Link></li>
          </ul>
          <Link className="button button-primary" to="/listings?minPrice=200000">
            View supercar-priced stock
          </Link>
        </div>
      </section>

      <section className="page-shell section-spaced signature-section">
        <SectionTitle
          eyebrow="Showroom lanes"
          title="Three desks buyers use first"
          description="Inspection, finance review, and sourcing stay separated so each step is easier to follow." 
        />
        <div className="signature-grid">
          {showroomLanes.map((lane) => (
            <article className="surface-card signature-card" key={lane.title}>
              <p className="muted-label">Client lane</p>
              <h3>{lane.title}</h3>
              <p>{lane.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell section-spaced split-section">
        <div>
          <SectionTitle
            eyebrow="Client process"
            title="Inspect, review, approve, release"
            description="Payment never moves ahead of vehicle review, finance confirmation, and release approval."
          />
          <div className="info-stack">
            {processSteps.map((step) => (
              <article className="surface-card step-card" key={step}>
                <strong>Step</strong>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="surface-card policy-card">
          <p className="muted-label">Client assurance</p>
          <h3>How the Miami desk handles premium transactions</h3>
          <ul className="plain-list">
            <li>Vehicle files are reviewed before a client is asked to release funds.</li>
            <li>Finance terms, deposit thresholds, and timing are stated before submission.</li>
            <li>Escrow and enclosed transport can be discussed for qualified transactions.</li>
            <li>Delivery is never offered ahead of verified payment or approved credit.</li>
          </ul>
          <Link className="button button-secondary" to="/about">
            Read showroom details
          </Link>
        </div>
      </section>

      <section className="page-shell section-spaced">
        <SectionTitle
          eyebrow="Client notes"
          title="What clients mention most"
          description="Most feedback centers on paperwork clarity, timing, and handover quality."
          align="center"
        />
        <div className="testimonial-grid">
          {meta.testimonials.map((review) => (
            <article className="surface-card testimonial-card" key={review.id}>
              <p>“{review.quote}”</p>
              <strong>{review.name}</strong>
              <span>{review.role}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell section-spaced faq-section">
        <SectionTitle
          eyebrow="FAQ"
          title="Questions before deposit or financing"
          description="Short answers on inspection, payment, paperwork, and delivery timing."
        />
        <div className="faq-list">
          {meta.faqs.map((item) => (
            <article className="surface-card faq-card" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
