import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { VehicleImageLightbox } from '../components/VehicleImageLightbox'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { getVehicleGalleryItems } from '../utils/media'
import { formatLocal, formatMileage, formatUsd } from '../utils/format'

const readAttachmentAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataUrl: String(reader.result),
      })

    reader.onerror = () => reject(new Error('Unable to read the selected proof file.'))
    reader.readAsDataURL(file)
  })

export function CarDetailsPage() {
  const { carId } = useParams()
  const {
    cars,
    userDashboard,
    requestPaymentInstructions,
    createPayment,
    requestDelivery,
    submitting,
    getLocalizedPrice,
    selectedCountry,
    isAuthenticated,
  } = useMarket()
  const car = useMemo(() => cars.find((entry) => entry.id === carId), [carId, cars])
  const [paymentDraft, setPaymentDraft] = useState({
    carId: '',
    method: 'bank-transfer',
    type: 'deposit',
    amount: 0,
  })
  const [delivery, setDelivery] = useState({ address: '', trigger: 'deposit' })
  const [paymentProof, setPaymentProof] = useState(null)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false)

  if (!car) {
    return (
      <section className="page-shell section-spaced">
        <div className="surface-card empty-state">
          <h2>Vehicle not found</h2>
          <Link className="button button-primary" to="/listings">
            Return to listings
          </Link>
        </div>
      </section>
    )
  }

  const activePaymentType = paymentDraft.carId === car.id ? paymentDraft.type : 'deposit'
  const activePaymentMethod = paymentDraft.carId === car.id ? paymentDraft.method : 'bank-transfer'
  const defaultAmount = activePaymentType === 'deposit' ? car.minimumDepositUsd : car.priceUsd
  const activePaymentAmount =
    paymentDraft.carId === car.id && paymentDraft.amount ? paymentDraft.amount : defaultAmount
  const localPrice = getLocalizedPrice(car.priceUsd)
  const rentalTerms = car.rentalTerms
  const paymentRequests = userDashboard.paymentRequests.filter((entry) => entry.carId === car.id)
  const latestPaymentRequest = paymentRequests[0]
  const latestApprovedAmount = latestPaymentRequest?.approvedAmountUsd || latestPaymentRequest?.requestedAmountUsd || car.minimumDepositUsd
  const needsProofUpload = ['bank-transfer', 'wire-transfer'].includes(latestPaymentRequest?.approvedMethod)
  const galleryItems = useMemo(() => getVehicleGalleryItems(car), [car])

  const openGalleryLightbox = (index) => {
    setActiveGalleryIndex(index)
    setGalleryLightboxOpen(true)
  }

  const handleProofChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setPaymentProof(null)
      return
    }

    setPaymentProof(await readAttachmentAsDataUrl(file))
  }

  const submitPaymentRequest = async (event) => {
    event.preventDefault()
    await requestPaymentInstructions({
      carId: car.id,
      preferredMethod: activePaymentMethod,
      requestedAmountUsd: activePaymentAmount,
      type: activePaymentType,
    })
  }

  const recordApprovedPayment = async () => {
    if (!latestPaymentRequest || latestPaymentRequest.status !== 'Instructions Sent') {
      return
    }

    await createPayment({
      paymentRequestId: latestPaymentRequest.id,
      carId: car.id,
      method: latestPaymentRequest.approvedMethod,
      amountUsd: latestApprovedAmount,
      type: latestPaymentRequest.type,
      proofAttachment: needsProofUpload ? paymentProof : null,
    })

    setPaymentProof(null)
  }

  const submitDelivery = async (event) => {
    event.preventDefault()
    await requestDelivery({ carId: car.id, ...delivery })
    setDelivery({ address: '', trigger: delivery.trigger })
  }

  return (
    <section className="page-shell section-spaced car-details-page">
      <div className="details-hero">
        <div>
          <span className="eyebrow">{car.badge}</span>
          <h1 className="details-title">{car.brand} {car.model}</h1>
          <p className="details-summary">{car.description}</p>
          {car.displayTheme ? (
            <div className="gallery-theme-panel">
              <span className="gallery-theme-badge">{car.displayTheme.name}</span>
              <p>{car.displayTheme.note}</p>
            </div>
          ) : null}
          <div className="detail-meta-grid">
            <span>{car.year}</span>
            <span>{formatMileage(car.mileage)}</span>
            <span>{car.location}</span>
            <span>{car.condition}</span>
            <span>{car.bodyStyle}</span>
            <span>{car.transmission}</span>
          </div>
        </div>
        <div className="price-panel surface-card">
          <strong>{formatUsd(car.priceUsd)}</strong>
          <span>{formatLocal(localPrice.amount, localPrice.currencyCode, localPrice.locale)}</span>
          <p>Local market view: {selectedCountry.name}</p>
          <p>Minimum deposit: {formatUsd(car.minimumDepositUsd)}</p>
          {car.paymentTypes.includes('rental') ? <p>Rental from {formatUsd(rentalTerms.dailyUsd)}/day or {formatUsd(rentalTerms.monthlyUsd)}/month</p> : null}
          <Link className="button button-primary button-block" to={`/financing?carId=${car.id}`}>
            Apply for financing
          </Link>
          {car.paymentTypes.includes('rental') ? (
            <Link className="button button-secondary button-block" to="#rental-terms">
              See rental terms
            </Link>
          ) : null}
          <Link className="button button-secondary button-block" to="/contact#inspection">
            Schedule inspection
          </Link>
        </div>
      </div>

      <div className="gallery-grid">
        {galleryItems.map((item, index) => (
          <figure className={`gallery-card ${index === 0 ? 'gallery-card-featured' : ''}`} key={item.id || `${car.id}-${index + 1}`}>
            <button
              aria-label={`Open ${item.label || `view ${index + 1}`} image`}
              className="gallery-launch"
              onClick={() => openGalleryLightbox(index)}
              type="button"
            >
              <img src={item.src || item} alt={`${car.brand} ${car.model} ${item.label || `view ${index + 1}`}`} />
              <span className="gallery-launch-hint">Tap to enlarge</span>
            </button>
            <figcaption className="gallery-caption surface-card">
              <div className="gallery-caption-topline">
                <span className={`gallery-scene-pill gallery-scene-${item.scene || 'detail'}`}>{item.scene || 'detail'}</span>
                <span className="gallery-theme-inline">{item.themeName || car.displayTheme?.name || 'Verified theme'}</span>
              </div>
              <strong>{item.label || `View ${index + 1}`}</strong>
              <p>{item.detail || 'Verified gallery image'}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <VehicleImageLightbox
        activeIndex={activeGalleryIndex}
        car={car}
        galleryItems={galleryItems}
        isOpen={galleryLightboxOpen}
        onClose={() => setGalleryLightboxOpen(false)}
        onSelectIndex={setActiveGalleryIndex}
      />

      <div className="details-grid">
        <div>
          <SectionTitle
            eyebrow="Vehicle details"
            title="Specifications and verified highlights"
            description="Core details, features, and release conditions are visible before financing or payment."
          />
          <div className="surface-card detail-list-card">
            <div className="spec-grid">
              <span><strong>Fuel:</strong> {car.fuelType}</span>
              <span><strong>Drive:</strong> {car.drivetrain}</span>
              <span><strong>Exterior:</strong> {car.exteriorColor}</span>
              <span><strong>Interior:</strong> {car.interiorColor}</span>
            </div>
            <div className="chip-wrap">
              {car.features.map((feature) => (
                <span className="gold-chip" key={feature}>{feature}</span>
              ))}
            </div>
            <ul className="plain-list">
              {car.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>

          {car.paymentTypes.includes('rental') ? (
            <>
              <SectionTitle
                eyebrow="Rental options"
                title="Daily, weekly, and monthly rental terms"
                description="Verified rentals follow ID review, security deposit clearance, and mileage limits before release."
              />
              <div className="surface-card payment-plan-table" id="rental-terms">
                <div className="plan-row">
                  <strong>Daily rate</strong>
                  <span>{formatUsd(rentalTerms.dailyUsd)} per day</span>
                </div>
                <div className="plan-row">
                  <strong>Weekend package</strong>
                  <span>{formatUsd(rentalTerms.weekendUsd)}</span>
                </div>
                <div className="plan-row">
                  <strong>Weekly rate</strong>
                  <span>{formatUsd(rentalTerms.weeklyUsd)} per week</span>
                </div>
                <div className="plan-row">
                  <strong>Monthly rate</strong>
                  <span>{formatUsd(rentalTerms.monthlyUsd)} per month</span>
                </div>
                <div className="plan-row">
                  <strong>Security deposit</strong>
                  <span>{formatUsd(rentalTerms.securityDepositUsd)}</span>
                </div>
                <div className="plan-row">
                  <strong>Minimum hire</strong>
                  <span>{rentalTerms.minimumDays} day{rentalTerms.minimumDays === 1 ? '' : 's'}</span>
                </div>
                <div className="plan-row">
                  <strong>Mileage allowance</strong>
                  <span>{rentalTerms.mileageLimitDaily} miles per day</span>
                </div>
                <div className="plan-row">
                  <strong>Chauffeur desk</strong>
                  <span>{rentalTerms.chauffeurAvailable ? 'Available on request' : 'Self-drive only'}</span>
                </div>
              </div>
            </>
          ) : null}

          <SectionTitle
            eyebrow="Installment plans"
            title="Monthly payment breakdown"
            description="Choose a tenure from 6 to 24 months based on the deposit requirement for this vehicle."
          />
          <div className="surface-card payment-plan-table">
            {car.monthlyPlans.map((plan) => (
              <div className="plan-row" key={plan.months}>
                <strong>{plan.months} months</strong>
                <span>{formatUsd(plan.monthlyUsd)} per month</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-stack">
          <form className="surface-card action-form" onSubmit={submitPaymentRequest}>
            <SectionTitle
              eyebrow="Deposit approval"
              title="Choose how you want to make the deposit first"
              description={isAuthenticated ? 'Submit your preferred method and amount. Admin will approve it and send bank details, a payment link, or escrow guidance before you pay.' : 'Login or create an account before requesting deposit instructions.'}
            />
            <label htmlFor="payment-type">Payment type</label>
            <select
              id="payment-type"
              value={activePaymentType}
              onChange={(event) => {
                const nextType = event.target.value
                setPaymentDraft({
                  carId: car.id,
                  method: activePaymentMethod,
                  type: nextType,
                  amount: nextType === 'deposit' ? car.minimumDepositUsd : car.priceUsd,
                })
              }}
            >
              <option value="deposit">Deposit</option>
              <option value="full">Full payment</option>
            </select>
            <label htmlFor="payment-method">Preferred method</label>
            <select
              id="payment-method"
              value={activePaymentMethod}
              onChange={(event) =>
                setPaymentDraft({
                  carId: car.id,
                  method: event.target.value,
                  type: activePaymentType,
                  amount: activePaymentAmount,
                })
              }
            >
              <option value="bank-transfer">Bank transfer</option>
              <option value="wire-transfer">Wire transfer</option>
              <option value="payment-link">Payment link</option>
              <option value="escrow">Escrow</option>
            </select>
            <label htmlFor="payment-amount">Requested amount (USD)</label>
            <input
              id="payment-amount"
              type="number"
              min={car.minimumDepositUsd}
              value={activePaymentAmount}
              onChange={(event) =>
                setPaymentDraft({
                  carId: car.id,
                  method: activePaymentMethod,
                  type: activePaymentType,
                  amount: Number(event.target.value),
                })
              }
            />
            <button className="button button-primary button-block" disabled={submitting || ['Pending Approval', 'Instructions Sent'].includes(latestPaymentRequest?.status)} type="submit">
              Request payment instructions
            </button>
          </form>

          {latestPaymentRequest ? (
            <div className="surface-card action-form">
              <SectionTitle
                eyebrow="Payment request status"
                title={latestPaymentRequest.status === 'Instructions Sent' ? 'Admin has sent your payment instructions' : latestPaymentRequest.status === 'Pending Approval' ? 'Waiting for admin approval' : latestPaymentRequest.status === 'Confirmed' ? 'Payment confirmed' : 'Payment request update'}
                description={`Requested ${formatUsd(latestPaymentRequest.requestedAmountUsd)} by ${latestPaymentRequest.requestedMethod.replace('-', ' ')}.`}
              />
              <div className="plain-list">
                <p>Status: {latestPaymentRequest.status}</p>
                {latestPaymentRequest.approvedMethod ? <p>Approved method: {latestPaymentRequest.approvedMethod.replace('-', ' ')}</p> : null}
                {latestPaymentRequest.approvedAmountUsd ? <p>Approved amount: {formatUsd(latestPaymentRequest.approvedAmountUsd)}</p> : null}
                {latestPaymentRequest.instructionsTitle ? <p>{latestPaymentRequest.instructionsTitle}</p> : null}
                {latestPaymentRequest.bankName ? <p>Bank: {latestPaymentRequest.bankName}</p> : null}
                {latestPaymentRequest.accountName ? <p>Account name: {latestPaymentRequest.accountName}</p> : null}
                {latestPaymentRequest.accountNumber ? <p>Account number: {latestPaymentRequest.accountNumber}</p> : null}
                {latestPaymentRequest.referenceCode ? <p>Reference code: {latestPaymentRequest.referenceCode}</p> : null}
                {latestPaymentRequest.paymentLink ? (
                  <p>
                    Payment link: <a href={latestPaymentRequest.paymentLink} rel="noreferrer" target="_blank">Open secure payment link</a>
                  </p>
                ) : null}
                {latestPaymentRequest.proofAttachment ? (
                  <p>
                    Proof uploaded: <a href={latestPaymentRequest.proofAttachment.dataUrl} download={latestPaymentRequest.proofAttachment.name}>{latestPaymentRequest.proofAttachment.name}</a>
                  </p>
                ) : null}
                {latestPaymentRequest.adminNote ? <p>Admin note: {latestPaymentRequest.adminNote}</p> : null}
              </div>
              {latestPaymentRequest.status === 'Instructions Sent' ? (
                <>
                  {needsProofUpload ? (
                    <>
                      <label htmlFor="payment-proof">Upload proof of payment</label>
                      <input accept="image/*,.pdf" id="payment-proof" onChange={handleProofChange} type="file" />
                      <p className="input-note">
                        Upload the transfer slip or wire confirmation before recording this payment.
                        {paymentProof ? ` Selected: ${paymentProof.name}` : ''}
                      </p>
                    </>
                  ) : null}
                  <button className="button button-primary button-block" disabled={submitting || (needsProofUpload && !paymentProof)} onClick={recordApprovedPayment} type="button">
                    {needsProofUpload ? 'Upload proof and record payment' : 'Record payment after using these instructions'}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          <form className="surface-card action-form" onSubmit={submitDelivery}>
            <SectionTitle
              eyebrow="Delivery"
              title="Request delivery after eligibility"
              description={`${isAuthenticated ? 'Delivery fee' : 'Login required · delivery fee'} ${formatUsd(car.delivery.feeUsd)} · Estimated time ${car.delivery.eta}`}
            />
            <label htmlFor="delivery-trigger">Eligible after</label>
            <select
              id="delivery-trigger"
              value={delivery.trigger}
              onChange={(event) => setDelivery((current) => ({ ...current, trigger: event.target.value }))}
            >
              <option value="deposit">Confirmed deposit</option>
              <option value="approved-loan">Approved financing</option>
            </select>
            <label htmlFor="delivery-address">Delivery address</label>
            <textarea
              id="delivery-address"
              rows="4"
              value={delivery.address}
              onChange={(event) => setDelivery((current) => ({ ...current, address: event.target.value }))}
              placeholder="Enter a verified drop-off address"
            />
            <button className="button button-secondary button-block" disabled={submitting} type="submit">
              Request delivery
            </button>
          </form>

          <div className="surface-card trust-card">
            <p className="muted-label">Verification first</p>
            <h3>Inspection before release</h3>
            <p>
              We encourage test drives, showroom inspection, VIN review, and document checks before
              release. Delivery is never advertised before eligibility is met.
            </p>
            <div className="button-row">
              <Link className="button button-secondary" to="/services?type=trade-in">
                Open trade-in brief
              </Link>
              <Link className="button button-primary" to="/services?type=concierge">
                Request sourcing help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
