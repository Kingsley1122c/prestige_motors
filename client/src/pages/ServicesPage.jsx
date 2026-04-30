import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { formatDate, formatUsd } from '../utils/format'

const serviceModes = {
  'trade-in': {
    eyebrow: 'Trade-in desk',
    title: 'Move out of your current car and into a stronger vehicle',
    description: 'Submit your current vehicle details, target upgrade, and value expectations for a structured trade review.',
    assetLabel: 'Current vehicle details',
    assetPlaceholder: 'Example: 2022 Mercedes-Benz GLE 450, 18,000 miles, graphite over black, clean title.',
    outcomeLabel: 'Target vehicle or upgrade brief',
    outcomePlaceholder: 'Example: Want to step into a 2024 G 63 or a late-model Range Rover with finance support.',
  },
  concierge: {
    eyebrow: 'Concierge sourcing',
    title: 'Brief the sourcing desk on the exact car you want us to find',
    description: 'Share the marque, spec, location preference, and budget so the Miami client desk can prepare a sourcing response.',
    assetLabel: 'Desired vehicle brief',
    assetPlaceholder: 'Example: 2024 Bentley Flying Spur Speed, black over linen, rear entertainment, under 5,000 miles.',
    outcomeLabel: 'Preferred sourcing outcome',
    outcomePlaceholder: 'Example: US inventory first, Japan or GCC stock second, enclosed delivery to Manhattan.',
  },
  'private-sale': {
    eyebrow: 'Private sale intake',
    title: 'List a high-value car for discreet representation',
    description: 'Send the vehicle profile, price expectations, and sale goals so the private client team can assess fit and route to market.',
    assetLabel: 'Vehicle you want to sell',
    assetPlaceholder: 'Example: 2023 Rolls-Royce Cullinan Black Badge, 3,800 miles, full Miami service history.',
    outcomeLabel: 'Sale brief and outcome',
    outcomePlaceholder: 'Example: Seeking an off-market client sale within 45 days with escrow-ready paperwork.',
  },
}

const createDraft = (user, type) => ({
  type,
  title: '',
  fullName: user?.fullName || '',
  email: user?.email || '',
  phone: user?.phone || '',
  location: user?.location || '',
  assetDetails: '',
  desiredOutcome: '',
  budgetUsd: '',
  notes: '',
})

export function ServicesPage() {
  const { currentUser, submitting, submitServiceRequest, userDashboard, isAuthenticated } = useMarket()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeType = serviceModes[searchParams.get('type')] ? searchParams.get('type') : 'concierge'
  const [draftByType, setDraftByType] = useState({})
  const draft = useMemo(
    () => ({ ...createDraft(currentUser, activeType), ...(draftByType[activeType] || {}), type: activeType }),
    [activeType, currentUser, draftByType],
  )

  const activeMode = serviceModes[activeType]
  const recentBriefs = useMemo(() => userDashboard.serviceRequests.slice(0, 4), [userDashboard.serviceRequests])

  const switchType = (type) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('type', type)
    setSearchParams(nextParams)
  }

  const updateField = (key, value) => {
    setDraftByType((current) => ({
      ...current,
      [activeType]: {
        ...(current[activeType] || {}),
        [key]: value,
      },
    }))
  }

  const submitBrief = async (event) => {
    event.preventDefault()
    await submitServiceRequest({
      ...draft,
      budgetUsd: draft.budgetUsd ? Number(draft.budgetUsd) : undefined,
    })
    setDraftByType((current) => ({ ...current, [activeType]: {} }))
  }

  return (
    <section className="page-shell section-spaced services-page">
      <div className="services-hero">
        <div className="surface-card services-hero-copy">
          <p className="eyebrow">Client services desk</p>
          <h1>Trade-in, sourcing, and private sale intake with the same dealership-grade discipline.</h1>
          <p>
            These flows are built for clients who need more than inventory browsing: acquisition briefs,
            discreet sale representation, and structured trade discussions handled through the Miami desk.
          </p>
          <div className="services-chip-row">
            <span>Trade appraisals</span>
            <span>Concierge sourcing</span>
            <span>Private client sales</span>
          </div>
        </div>
        <div className="surface-card services-status-card">
          <p className="muted-label">Recent briefs</p>
          {recentBriefs.length ? recentBriefs.map((request) => (
            <article className="services-status-item" key={request.id}>
              <strong>{request.title}</strong>
              <span>{request.status} · {formatDate(request.createdAt)}</span>
            </article>
          )) : (
            <p>{isAuthenticated ? 'No service briefs submitted yet.' : 'Log in to submit and track service briefs.'}</p>
          )}
        </div>
      </div>

      <div className="service-mode-grid">
        {Object.entries(serviceModes).map(([type, mode]) => (
          <button
            className={`surface-card service-mode-card ${activeType === type ? 'service-mode-card-active' : ''}`}
            key={type}
            onClick={() => switchType(type)}
            type="button"
          >
            <p className="muted-label">{mode.eyebrow}</p>
            <strong>{mode.title}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </div>

      <div className="services-layout">
        <form className="surface-card services-form" onSubmit={submitBrief}>
          <SectionTitle
            eyebrow={activeMode.eyebrow}
            title={activeMode.title}
            description={isAuthenticated ? activeMode.description : 'Log in or create an account before submitting a client services brief.'}
          />

          <div className="form-grid">
            <div>
              <label htmlFor="service-title">Brief title</label>
              <input id="service-title" value={draft.title} onChange={(event) => updateField('title', event.target.value)} />
            </div>
            <div>
              <label htmlFor="service-budget">Budget or value target (USD)</label>
              <input id="service-budget" type="number" min="0" value={draft.budgetUsd} onChange={(event) => updateField('budgetUsd', event.target.value)} />
            </div>
            <div>
              <label htmlFor="service-name">Full name</label>
              <input id="service-name" value={draft.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
            </div>
            <div>
              <label htmlFor="service-email">Email</label>
              <input id="service-email" type="email" value={draft.email} onChange={(event) => updateField('email', event.target.value)} />
            </div>
            <div>
              <label htmlFor="service-phone">Phone</label>
              <input id="service-phone" value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </div>
            <div>
              <label htmlFor="service-location">Location</label>
              <input id="service-location" value={draft.location} onChange={(event) => updateField('location', event.target.value)} />
            </div>
            <div className="form-grid-wide">
              <label htmlFor="service-asset-details">{activeMode.assetLabel}</label>
              <textarea id="service-asset-details" rows="4" placeholder={activeMode.assetPlaceholder} value={draft.assetDetails} onChange={(event) => updateField('assetDetails', event.target.value)} />
            </div>
            <div className="form-grid-wide">
              <label htmlFor="service-outcome">{activeMode.outcomeLabel}</label>
              <textarea id="service-outcome" rows="4" placeholder={activeMode.outcomePlaceholder} value={draft.desiredOutcome} onChange={(event) => updateField('desiredOutcome', event.target.value)} />
            </div>
            <div className="form-grid-wide">
              <label htmlFor="service-notes">Notes</label>
              <textarea id="service-notes" rows="4" placeholder="Add timing, paperwork, finance, delivery, or discretion requirements." value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} />
            </div>
          </div>

          <button className="button button-primary" disabled={submitting} type="submit">
            Submit client brief
          </button>
        </form>

        <div className="sidebar-stack">
          <div className="surface-card services-note-card">
            <p className="muted-label">How this works</p>
            <h3>Client services sequence</h3>
            <ul className="plain-list">
              <li>Submit a short, high-quality brief with asset details and your desired outcome.</li>
              <li>The Miami desk reviews the file and responds with next steps or valuation guidance.</li>
              <li>Status changes appear in the user dashboard and in the admin control surface.</li>
            </ul>
          </div>

          <div className="surface-card services-note-card">
            <p className="muted-label">Recent dashboard activity</p>
            {recentBriefs.length ? recentBriefs.map((request) => (
              <div className="table-row" key={request.id}>
                <div>
                  <strong>{request.type.replace('-', ' ')}</strong>
                  <span>{request.title}</span>
                </div>
                <div className="text-right">
                  <strong>{request.status}</strong>
                  <span>{request.budgetUsd ? formatUsd(request.budgetUsd) : 'Budget on file'}</span>
                </div>
              </div>
            )) : <p>Submitted briefs will appear here after intake.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}