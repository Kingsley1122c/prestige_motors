import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'

const contactCards = [
  {
    title: 'Private showings and inspections',
    text: 'Use the direct line or email to reserve a showroom slot, request a VIN file, or arrange an independent inspection before deposit.',
  },
  {
    title: 'Finance and structuring desk',
    text: 'Submit a financing request when you are ready for a real affordability review. The desk will respond with deposit expectations, tenure, and next steps.',
  },
  {
    title: 'Enclosed transport and release',
    text: 'Delivery planning starts only after verified funds or approved credit. Route cost, ETA, and release conditions are disclosed before transport is booked.',
  },
]

export function ContactPage() {
  const { meta } = useMarket()

  return (
    <section className="page-shell section-spaced">
      <SectionTitle
        eyebrow="Contact"
        title="Speak with the Miami client services desk before you commit"
        description="Use these channels to inspect a car, review paperwork, discuss finance structure, or arrange transport before payment release."
      />
      <div className="contact-layout">
        <div className="info-stack">
          {contactCards.map((card) => (
            <article className="surface-card step-card" id={card.title.includes('inspection') ? 'inspection' : undefined} key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        <div className="surface-card contact-card">
          <p className="muted-label">Client services</p>
          <h3>{meta.company?.name}</h3>
          <p>{meta.company?.address}</p>
          <p>{meta.company?.phone}</p>
          <p>{meta.company?.email}</p>
          <p>{meta.company?.hours}</p>
          <div className="plain-list">
            <p>Inspection visits should be scheduled before any payment release is authorized.</p>
            <p>Bring valid ID for showroom access, file review, and handover appointments.</p>
            <p>Escrow, enclosed transport, and export coordination are available for qualifying deals.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
