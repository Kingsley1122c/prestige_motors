import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'

const pillars = [
  {
    title: 'Boutique showroom discipline',
    text: 'We present real numbers, documented car files, and a defined inspection path before moving a client into deposit or finance conversations.',
  },
  {
    title: 'Verification before handover',
    text: 'Clients are encouraged to inspect, test, and review documentation first. No vehicle is positioned as available for release before the file is cleared.',
  },
  {
    title: 'Premium client servicing',
    text: 'Finance coordination, enclosed transport, escrow conversations, and handover timing are handled with the expectations of a high-value US dealership sale.',
  },
]

export function AboutPage() {
  const { meta } = useMarket()

  return (
    <section className="page-shell section-spaced">
      <SectionTitle
        eyebrow="About us"
        title="A Miami luxury auto desk with US showroom reach and selective Asia sourcing"
        description="Prestige Motors Miami is positioned like a boutique dealership and sourcing office for buyers who want stronger inventory, cleaner process, and less sales noise."
      />

      <div className="about-grid">
        <div className="surface-card story-card">
          <h3>Why clients use this desk</h3>
          <p>
            Prestige Motors Miami was built for clients who are tired of vague listing sites, soft
            numbers, and unclear release promises. The business model is straightforward: source strong
            US inventory, add selective Asia-market halo cars, and present finance and handover terms
            with enough clarity for a serious buyer to make a decision.
          </p>
          <p>
            In practice, that means documented vehicle files, appointment-led inspections, realistic
            deposit thresholds, and transport planning that begins only after funds or credit approval
            are genuinely in place.
          </p>
        </div>
        <div className="info-stack">
          {pillars.map((pillar) => (
            <article className="surface-card step-card" key={pillar.title}>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="policy-grid">
        <article className="surface-card">
          <p className="muted-label">Business address</p>
          <h3>{meta.company?.name}</h3>
          <p>{meta.company?.address}</p>
          <p>{meta.company?.hours}</p>
        </article>
        <article className="surface-card">
          <p className="muted-label">Privacy policy</p>
          <p>{meta.policies?.privacy}</p>
        </article>
        <article className="surface-card">
          <p className="muted-label">Terms & conditions</p>
          <p>{meta.policies?.terms}</p>
        </article>
      </div>
    </section>
  )
}
