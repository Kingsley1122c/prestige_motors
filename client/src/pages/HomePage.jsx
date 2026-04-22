import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CarCard } from '../components/CarCard'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'

const processSteps = [
  'Browse verified listings with full pricing, deposit, and monthly plan visibility.',
  'Schedule inspection or test drive before making any release payment.',
  'Apply for financing, wait for admin review, then request delivery after approval or deposit confirmation.',
]

const showroomLanes = [
  {
    title: 'Miami flagship desk',
    text: 'White-glove client service for local handover, finance review, and enclosed transport scheduling.',
  },
  {
    title: 'US showroom network',
    text: 'Inventory placed across Miami, Los Angeles, New York, Houston, Chicago, Scottsdale, Seattle, and Beverly Hills.',
  },
  {
    title: 'Asia sourcing office',
    text: 'Selective Japan, Singapore, Thailand, and Korea vehicles with export paperwork and inspection support before release.',
  },
]

const normalizeAdToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cars, featuredCars, meta } = useMarket()
  const [quickSearch, setQuickSearch] = useState({
    brand: 'All',
    location: 'All',
    paymentType: 'All',
  })

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

  const landingCars = useMemo(() => {
    let inventorySlice = featuredCars

    if (adSignals.matchedBrand) {
      inventorySlice = cars.filter((car) => car.brand === adSignals.matchedBrand)
    } else if (adSignals.matchedBodyStyle) {
      inventorySlice = cars.filter((car) => car.bodyStyle === adSignals.matchedBodyStyle)
    }

    return (inventorySlice.length ? inventorySlice : featuredCars).slice(0, 2)
  }, [adSignals.matchedBodyStyle, adSignals.matchedBrand, cars, featuredCars])

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
          primaryCta: `See ${adSignals.matchedBrand} inventory`,
        }
      : adSignals.matchedBodyStyle
        ? {
            primaryCta: `See ${adSignals.matchedBodyStyle} inventory`,
          }
        : {
            primaryCta: 'View all cars',
          }
    : {
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

  const heroStats = useMemo(() => {
    const topPrice = cars.reduce((highest, car) => Math.max(highest, car.priceUsd), 0)

    return [
      { value: `${cars.length}`, label: 'Curated vehicles live' },
      { value: `${meta.locations.length}`, label: 'Showroom and sourcing hubs' },
      { value: `$${Math.round(topPrice / 1000)}k`, label: 'Top exotic ticket' },
    ]
  }, [cars, meta.locations.length])

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
          <div className="landing-inventory-header">
            <div className="landing-inventory-actions">
              <Link className="button button-primary" to={landingInventoryHref}>
                {landingContent.primaryCta}
              </Link>
              <a className="button button-whatsapp" href={whatsappHref} rel="noreferrer" target="_blank">
                WhatsApp now
              </a>
            </div>
          </div>
          <div className="card-grid landing-card-grid">
            {landingCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </div>
      </section>

      <section className="hero-section page-shell">
        <div className="hero-copy glass-panel">
          <span className="eyebrow">Miami flagship inventory</span>
          <div className="hero-ribbon">
            <span>Same-day VIN pack</span>
            <span>Concierge finance desk</span>
            <span>Enclosed US transport</span>
          </div>
          <h1>
            Exotic Metal.
            <span> Executive Delivery.</span>
          </h1>
          <p>
            Prestige Motors Miami curates high-value US showroom cars and selective Asia imports
            for buyers who want clean paperwork, disciplined finance terms, and a dealership-grade
            handover process instead of listing-site guesswork.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/listings">
              View inventory
            </Link>
            <Link className="button button-secondary" to="/contact#inspection">
              Book a private showing
            </Link>
          </div>
          <div className="stat-row">
            {heroStats.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
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
          </select>
          <button className="button button-primary button-block" type="submit">
            Search inventory
          </button>
          <div className="search-tags">
            <span>Maybach</span>
            <span>Rolls-Royce</span>
            <span>Ferrari</span>
            <span>Bentley</span>
          </div>
          <div className="hero-search-note">
            <strong>Client services</strong>
            <span>Showings are arranged with ID verification, finance desk prep, and route-based delivery planning.</span>
          </div>
        </form>
      </section>

      <section className="page-shell section-spaced signature-section">
        <SectionTitle
          eyebrow="Flagship experience"
          title="The front end now reads like a luxury showroom, not a catalog template"
          description="Each lane below mirrors how the business operates: showroom appointments, finance review, and selective sourcing across US and Asia inventory." 
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
            title="A dealership workflow with less noise and more discipline"
            description="The sequence is fixed: inspect the car, review the numbers, confirm the file, then authorize payment and delivery in that order."
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
          title="What buyers say after working the file with us"
          description="The language is deliberately grounded: paperwork, timing, finance clarity, and handover quality rather than vague praise."
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
          title="Questions serious buyers typically ask first"
          description="These answers focus on the real points of friction in premium transactions: financing, inspection, paperwork, and delivery sequencing."
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
