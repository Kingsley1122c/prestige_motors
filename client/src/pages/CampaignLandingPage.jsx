import { Link, Navigate, useParams } from 'react-router-dom'
import { CarCard } from '../components/CarCard'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { getVehicleHeroImage, sortVehiclesForMerchandising } from '../utils/media'
import { formatUsd } from '../utils/format'

const SUPERCAR_BRANDS = new Set(['Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Bentley', 'Rolls-Royce'])

const CAMPAIGN_CONFIG = {
  suvs: {
    eyebrow: 'Ad landing page',
    title: 'Luxury SUVs ready for family, executive, and high-visibility delivery needs.',
    description: 'For Facebook, Instagram, TikTok, and Google traffic targeting buyers who want presence, comfort, and clear release steps before payment.',
    chips: ['Luxury SUVs', 'Inspection-first handover', 'Finance-ready deposits'],
    proofPoints: [
      'High-demand models with rental and installment visibility',
      'US showroom routes for Miami, Houston, Dallas, and New York handover',
      'Strong fit for broad Meta and Google high-intent search campaigns',
    ],
    filter: (car) => car.bodyStyle === 'SUV',
    primaryCta: { label: 'Browse all SUV stock', to: '/listings?bodyStyle=SUV' },
    secondaryCta: { label: 'Book inspection support', to: '/contact#inspection' },
  },
  lexus: {
    eyebrow: 'Brand campaign',
    title: 'Lexus inventory for buyers who want reliability, status, and cleaner ownership positioning.',
    description: 'Best used for Lexus-first creatives, keyword ads, and retargeting traffic that already understands the brand and wants immediate stock visibility.',
    chips: ['Lexus RX and ES focus', 'SUV and sedan options', 'Deposit-first purchase flow'],
    proofPoints: [
      'Works for both family SUV and executive sedan ad angles',
      'Supports lower-friction lead generation through payment request forms',
      'Good fit for Instagram carousel, TikTok walkaround clips, and search campaigns',
    ],
    filter: (car) => car.brand === 'Lexus',
    primaryCta: { label: 'See all Lexus stock', to: '/listings?brand=Lexus' },
    secondaryCta: { label: 'Start a finance brief', to: '/financing' },
  },
  supercars: {
    eyebrow: 'Performance campaign',
    title: 'Supercars and halo exotics for attention-led campaigns that need sharp imagery and high-ticket proof.',
    description: 'Built for video-first traffic from TikTok and Instagram plus high-intent Google search terms around Ferrari, Lamborghini, McLaren, and other exotic stock.',
    chips: ['Ferrari and Lamborghini', 'High-ticket exotics', 'Concierge inspection and sourcing'],
    proofPoints: [
      'Use for aspirational creatives and retargeting warm visitors into exact-car pages',
      'Supports deposit requests, financing paths, and private inspection booking',
      'Ideal for premium audience testing across TikTok, Reels, and branded search',
    ],
    filter: (car) => SUPERCAR_BRANDS.has(car.brand) || car.priceUsd >= 250000,
    primaryCta: { label: 'View exotic inventory', to: '/listings?minPrice=250000' },
    secondaryCta: { label: 'Brief the sourcing desk', to: '/services?type=concierge' },
  },
}

export function CampaignLandingPage() {
  const { campaignKey } = useParams()
  const { cars } = useMarket()
  const config = CAMPAIGN_CONFIG[campaignKey]

  if (!config) {
    return <Navigate replace to="/" />
  }

  const filteredCars = sortVehiclesForMerchandising(cars.filter(config.filter))
  const featuredCar = filteredCars[0]
  const supportCars = filteredCars.slice(1, 7)
  const topPrice = filteredCars.reduce((highest, car) => Math.max(highest, car.priceUsd), 0)
  const lowestDeposit = filteredCars.reduce((lowest, car) => Math.min(lowest, car.minimumDepositUsd), Number.POSITIVE_INFINITY)

  return (
    <section className="page-shell section-spaced campaign-page">
      <div className="campaign-hero-grid">
        <article className="surface-card campaign-hero-copy">
          <span className="eyebrow">{config.eyebrow}</span>
          <div className="hero-ribbon">
            {config.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
          <div className="hero-actions">
            <Link className="button button-primary" to={config.primaryCta.to}>
              {config.primaryCta.label}
            </Link>
            <Link className="button button-secondary" to={config.secondaryCta.to}>
              {config.secondaryCta.label}
            </Link>
          </div>
          <div className="campaign-proof-grid">
            {config.proofPoints.map((point) => (
              <article className="surface-card campaign-proof-card" key={point}>
                <span className="muted-label">Campaign angle</span>
                <p>{point}</p>
              </article>
            ))}
          </div>
        </article>

        {featuredCar ? (
          <article className="surface-card campaign-feature-card">
            <img alt={`${featuredCar.brand} ${featuredCar.model}`} className="campaign-feature-image" src={getVehicleHeroImage(featuredCar)} />
            <div className="campaign-feature-overlay">
              <span className="campaign-feature-badge">Featured stock</span>
              <h2>{featuredCar.brand} {featuredCar.model}</h2>
              <p>{featuredCar.location} · {formatUsd(featuredCar.priceUsd)} · Deposit from {formatUsd(featuredCar.minimumDepositUsd)}</p>
              <Link className="glass-view-more" to={`/cars/${featuredCar.id}`}>
                Open vehicle page
              </Link>
            </div>
          </article>
        ) : null}
      </div>

      <div className="campaign-metrics-grid">
        <article className="surface-card campaign-metric-card">
          <strong>{filteredCars.length}</strong>
          <span>Vehicles in this campaign lane</span>
        </article>
        <article className="surface-card campaign-metric-card">
          <strong>{formatUsd(topPrice)}</strong>
          <span>Top visible ticket</span>
        </article>
        <article className="surface-card campaign-metric-card">
          <strong>{Number.isFinite(lowestDeposit) ? formatUsd(lowestDeposit) : 'N/A'}</strong>
          <span>Entry deposit threshold</span>
        </article>
      </div>

      <SectionTitle
        eyebrow="Campaign stock"
        title="Send ad clicks straight into inventory that matches the creative promise"
        description="Each page is filtered for a single campaign theme so the buyer sees aligned stock, tighter pricing context, and immediate paths into inspection, financing, or payment requests."
      />

      <div className="card-grid landing-card-grid">
        {supportCars.map((car) => (
          <CarCard car={car} key={car.id} />
        ))}
      </div>

      <article className="surface-card campaign-footer-card">
        <div>
          <span className="eyebrow">Traffic next step</span>
          <h2>Need a broader inventory view after the campaign click?</h2>
          <p>Move the visitor into the full listings page with preserved buying intent, or push high-intent leads into inspection, sourcing, and payment request flows immediately.</p>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" to="/listings">
            Open full inventory
          </Link>
          <Link className="button button-secondary" to="/contact#inspection">
            Request inspection call
          </Link>
        </div>
      </article>
    </section>
  )
}
