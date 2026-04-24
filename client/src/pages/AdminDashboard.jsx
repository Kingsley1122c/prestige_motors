import { useMemo, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle'
import { VehicleImageLightbox } from '../components/VehicleImageLightbox'
import { useMarket } from '../context/MarketContext'
import { formatDate, formatUsd } from '../utils/format'
import { getVehicleGalleryItems, getVehicleHeroImage } from '../utils/media'

const createEmptyForm = () => ({
  brand: '',
  model: '',
  year: '2024',
  mileage: '0',
  location: '',
  condition: 'Certified used',
  priceUsd: '',
  minimumDepositUsd: '',
  rentalDailyUsd: '',
  rentalWeekendUsd: '',
  rentalWeeklyUsd: '',
  rentalMonthlyUsd: '',
  rentalSecurityDepositUsd: '',
  rentalMinimumDays: '',
  rentalMileageLimitDaily: '',
  rentable: true,
  bodyStyle: 'SUV',
  fuelType: 'Petrol',
  transmission: 'Automatic',
  drivetrain: 'AWD',
  exteriorColor: '',
  interiorColor: '',
  description: '',
  heroImage: '',
  gallery: '',
  features: '',
  highlights: '',
})

const createEmptyPaymentInstructionForm = () => ({
  status: 'Instructions Sent',
  approvedMethod: 'bank-transfer',
  approvedAmountUsd: '',
  instructionsTitle: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  referenceCode: '',
  paymentLink: '',
  adminNote: '',
})

const createEmptyRentalReviewForm = () => ({
  status: 'Pending Review',
  contactEmail: '',
  contactPhone: '',
  adminNote: '',
})

export function AdminDashboard() {
  const {
    adminDashboard,
    addCar,
    updateCar,
    deleteCar,
    deleteUser,
    updateApplicationStatus,
    updatePaymentRequestInstructions,
    updateServiceRequestStatus,
    updateRentalRequestStatus,
    submitting,
  } = useMarket()
  const [editingCarId, setEditingCarId] = useState('')
  const [form, setForm] = useState(createEmptyForm())
  const [previewCarId, setPreviewCarId] = useState('')
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const [editingPaymentRequestId, setEditingPaymentRequestId] = useState('')
  const [editingRentalRequestId, setEditingRentalRequestId] = useState('')
  const [paymentInstructionForm, setPaymentInstructionForm] = useState(createEmptyPaymentInstructionForm())
  const [rentalReviewForm, setRentalReviewForm] = useState(createEmptyRentalReviewForm())
  const [pendingUserDeletion, setPendingUserDeletion] = useState(null)

  const editingCar = useMemo(
    () => adminDashboard.cars.find((car) => car.id === editingCarId),
    [adminDashboard.cars, editingCarId],
  )

  const editingPaymentRequest = useMemo(
    () => adminDashboard.paymentRequests.find((paymentRequest) => paymentRequest.id === editingPaymentRequestId),
    [adminDashboard.paymentRequests, editingPaymentRequestId],
  )

  const editingRentalRequest = useMemo(
    () => adminDashboard.rentalRequests.find((request) => request.id === editingRentalRequestId),
    [adminDashboard.rentalRequests, editingRentalRequestId],
  )

  const previewCar = useMemo(
    () => adminDashboard.cars.find((car) => car.id === previewCarId) || null,
    [adminDashboard.cars, previewCarId],
  )

  const previewGalleryItems = useMemo(
    () => (previewCar ? getVehicleGalleryItems(previewCar) : []),
    [previewCar],
  )

  const populateForm = (car) => {
    setEditingCarId(car.id)
    setForm({
      brand: car.brand,
      model: car.model,
      year: String(car.year),
      mileage: String(car.mileage),
      location: car.location,
      condition: car.condition,
      priceUsd: String(car.priceUsd),
      minimumDepositUsd: String(car.minimumDepositUsd),
      rentalDailyUsd: String(car.rentalTerms?.dailyUsd || ''),
      rentalWeekendUsd: String(car.rentalTerms?.weekendUsd || ''),
      rentalWeeklyUsd: String(car.rentalTerms?.weeklyUsd || ''),
      rentalMonthlyUsd: String(car.rentalTerms?.monthlyUsd || ''),
      rentalSecurityDepositUsd: String(car.rentalTerms?.securityDepositUsd || ''),
      rentalMinimumDays: String(car.rentalTerms?.minimumDays || ''),
      rentalMileageLimitDaily: String(car.rentalTerms?.mileageLimitDaily || ''),
      rentable: Boolean(car.rentable),
      bodyStyle: car.bodyStyle,
      fuelType: car.fuelType,
      transmission: car.transmission,
      drivetrain: car.drivetrain,
      exteriorColor: car.exteriorColor,
      interiorColor: car.interiorColor,
      description: car.description,
      heroImage: car.heroImage,
      gallery: car.gallery.join(', '),
      features: car.features.join(', '),
      highlights: car.highlights.join(', '),
    })
  }

  const resetEditor = () => {
    setEditingCarId('')
    setForm(createEmptyForm())
  }

  const openInventoryPreview = (car) => {
    setPreviewCarId(car.id)
    setActivePreviewIndex(0)
  }

  const closeInventoryPreview = () => {
    setPreviewCarId('')
    setActivePreviewIndex(0)
  }

  const populatePaymentInstructionForm = (paymentRequest) => {
    setEditingPaymentRequestId(paymentRequest.id)
    setPaymentInstructionForm({
      status: paymentRequest.status === 'Declined' ? 'Declined' : 'Instructions Sent',
      approvedMethod: paymentRequest.approvedMethod || paymentRequest.requestedMethod,
      approvedAmountUsd: String(paymentRequest.approvedAmountUsd || paymentRequest.requestedAmountUsd),
      instructionsTitle: paymentRequest.instructionsTitle || '',
      bankName: paymentRequest.bankName || '',
      accountName: paymentRequest.accountName || '',
      accountNumber: paymentRequest.accountNumber || '',
      referenceCode: paymentRequest.referenceCode || '',
      paymentLink: paymentRequest.paymentLink || '',
      adminNote: paymentRequest.adminNote || '',
    })
  }

  const resetPaymentInstructionEditor = () => {
    setEditingPaymentRequestId('')
    setPaymentInstructionForm(createEmptyPaymentInstructionForm())
  }

  const populateRentalReviewForm = (request) => {
    setEditingRentalRequestId(request.id)
    setRentalReviewForm({
      status: request.status || 'Pending Review',
      contactEmail: request.contactEmail || '',
      contactPhone: request.contactPhone || '',
      adminNote: request.adminNote || '',
    })
  }

  const resetRentalReviewEditor = () => {
    setEditingRentalRequestId('')
    setRentalReviewForm(createEmptyRentalReviewForm())
  }

  const confirmUserDeletion = async () => {
    if (!pendingUserDeletion) {
      return
    }

    await deleteUser(pendingUserDeletion.id)
    setPendingUserDeletion(null)
  }

  const submitCar = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      gallery: form.gallery.split(',').map((value) => value.trim()).filter(Boolean),
      features: form.features.split(',').map((value) => value.trim()).filter(Boolean),
      highlights: form.highlights.split(',').map((value) => value.trim()).filter(Boolean),
      paymentTypes: ['full', 'installment'],
      rentalTerms: {
        dailyUsd: Number(form.rentalDailyUsd),
        weekendUsd: Number(form.rentalWeekendUsd),
        weeklyUsd: Number(form.rentalWeeklyUsd),
        monthlyUsd: Number(form.rentalMonthlyUsd),
        securityDepositUsd: Number(form.rentalSecurityDepositUsd),
        minimumDays: Number(form.rentalMinimumDays),
        mileageLimitDaily: Number(form.rentalMileageLimitDaily),
      },
    }

    delete payload.rentalDailyUsd
    delete payload.rentalWeekendUsd
    delete payload.rentalWeeklyUsd
    delete payload.rentalMonthlyUsd
    delete payload.rentalSecurityDepositUsd
    delete payload.rentalMinimumDays
    delete payload.rentalMileageLimitDaily

    if (editingCar) {
      await updateCar(editingCar.id, payload)
    } else {
      await addCar(payload)
    }

    resetEditor()
  }

  const submitPaymentInstructions = async (event) => {
    event.preventDefault()

    if (!editingPaymentRequest) {
      return
    }

    await updatePaymentRequestInstructions(editingPaymentRequest.id, {
      ...paymentInstructionForm,
      approvedAmountUsd: Number(paymentInstructionForm.approvedAmountUsd),
    })

    resetPaymentInstructionEditor()
  }

  const submitRentalReview = async (event) => {
    event.preventDefault()

    if (!editingRentalRequest) {
      return
    }

    await updateRentalRequestStatus(editingRentalRequest.id, rentalReviewForm)
    resetRentalReviewEditor()
  }

  const getRentalReviewPayload = (request, status) => {
    if (editingRentalRequestId === request.id) {
      return { ...rentalReviewForm, status }
    }

    return {
      status,
      contactEmail: request.contactEmail || '',
      contactPhone: request.contactPhone || '',
      adminNote: request.adminNote || '',
    }
  }

  return (
    <section className="page-shell section-spaced dashboard-page">
      <SectionTitle
        eyebrow="Admin dashboard"
        title="Manage inventory, approvals, users, and payments"
        description="This demo admin panel supports listing updates, application decisions, and payment visibility without misleading financing claims."
      />

      <div className="metric-grid">
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.totalCars || 0}</strong>
          <span>Total listings</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.totalUsers || 0}</strong>
          <span>Users</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.activeApplications || 0}</strong>
          <span>Pending applications</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.confirmedPayments || 0}</strong>
          <span>Confirmed payments</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.pendingPaymentRequests || 0}</strong>
          <span>Pending payment requests</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.openServiceRequests || 0}</strong>
          <span>Open service briefs</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{adminDashboard.stats.openRentalRequests || 0}</strong>
          <span>Open rental requests</span>
        </article>
      </div>

      <div className="dashboard-grid admin-grid">
        <form className="surface-card admin-form" onSubmit={submitCar}>
          <p className="muted-label">Inventory editor</p>
          <h3>{editingCar ? 'Edit listing' : 'Add new listing'}</h3>
          <div className="form-grid">
            {Object.entries(form).map(([key, value]) => (
              <div className={key === 'description' || key === 'gallery' || key === 'features' || key === 'highlights' ? 'form-grid-wide' : ''} key={key}>
                <label htmlFor={key}>{key.replace(/([A-Z])/g, ' $1')}</label>
                {key === 'description' ? (
                  <textarea
                    id={key}
                    rows="4"
                    value={value}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  />
                ) : key === 'rentable' ? (
                  <input
                    checked={Boolean(value)}
                    id={key}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                    type="checkbox"
                  />
                ) : (
                  <input
                    id={key}
                    value={value}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="button-row">
            <button className="button button-primary" disabled={submitting} type="submit">
              {editingCar ? 'Save changes' : 'Create listing'}
            </button>
            <button className="button button-secondary" onClick={resetEditor} type="button">
              Clear form
            </button>
          </div>
        </form>

        <div className="sidebar-stack">
          <form className="surface-card admin-form" onSubmit={submitPaymentInstructions}>
            <p className="muted-label">Payment instruction editor</p>
            <h3>{editingPaymentRequest ? 'Prepare buyer payment instructions' : 'Choose a payment request below'}</h3>
            <div className="form-grid">
              <div>
                <label htmlFor="payment-request-status">Status</label>
                <select id="payment-request-status" value={paymentInstructionForm.status} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="Instructions Sent">Instructions Sent</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
              <div>
                <label htmlFor="approved-method">Approved method</label>
                <select id="approved-method" value={paymentInstructionForm.approvedMethod} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, approvedMethod: event.target.value }))}>
                  <option value="bank-transfer">Bank transfer</option>
                  <option value="wire-transfer">Wire transfer</option>
                  <option value="payment-link">Payment link</option>
                  <option value="escrow">Escrow</option>
                </select>
              </div>
              <div>
                <label htmlFor="approved-amount">Approved amount (USD)</label>
                <input id="approved-amount" value={paymentInstructionForm.approvedAmountUsd} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, approvedAmountUsd: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="instructions-title">Instruction title</label>
                <input id="instructions-title" value={paymentInstructionForm.instructionsTitle} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, instructionsTitle: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="bank-name">Bank name</label>
                <input id="bank-name" value={paymentInstructionForm.bankName} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, bankName: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="account-name">Account name</label>
                <input id="account-name" value={paymentInstructionForm.accountName} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, accountName: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="account-number">Account number</label>
                <input id="account-number" value={paymentInstructionForm.accountNumber} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, accountNumber: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="reference-code">Reference code</label>
                <input id="reference-code" value={paymentInstructionForm.referenceCode} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, referenceCode: event.target.value }))} />
              </div>
              <div className="form-grid-wide">
                <label htmlFor="payment-link">Payment link</label>
                <input id="payment-link" value={paymentInstructionForm.paymentLink} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, paymentLink: event.target.value }))} />
              </div>
              <div className="form-grid-wide">
                <label htmlFor="payment-admin-note">Admin note</label>
                <textarea id="payment-admin-note" rows="4" value={paymentInstructionForm.adminNote} onChange={(event) => setPaymentInstructionForm((current) => ({ ...current, adminNote: event.target.value }))} />
              </div>
            </div>
            <div className="button-row">
              <button className="button button-primary" disabled={submitting || !editingPaymentRequest} type="submit">
                Send instructions
              </button>
              <button className="button button-secondary" onClick={resetPaymentInstructionEditor} type="button">
                Clear editor
              </button>
            </div>
          </form>

          <form className="surface-card admin-form" onSubmit={submitRentalReview}>
            <p className="muted-label">Rental review editor</p>
            <h3>{editingRentalRequest ? 'Review rental request' : 'Choose a rental request below'}</h3>
            <div className="form-grid">
              <div>
                <label htmlFor="rental-request-status">Status</label>
                <select id="rental-request-status" value={rentalReviewForm.status} onChange={(event) => setRentalReviewForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved for contact">Approved for contact</option>
                  <option value="Vehicle reserved">Vehicle reserved</option>
                  <option value="Closed">Closed</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
              <div>
                <label htmlFor="rental-contact-email">Contact email</label>
                <input id="rental-contact-email" value={rentalReviewForm.contactEmail} onChange={(event) => setRentalReviewForm((current) => ({ ...current, contactEmail: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="rental-contact-phone">Contact phone</label>
                <input id="rental-contact-phone" value={rentalReviewForm.contactPhone} onChange={(event) => setRentalReviewForm((current) => ({ ...current, contactPhone: event.target.value }))} />
              </div>
              <div className="form-grid-wide">
                <label htmlFor="rental-admin-note">Admin note</label>
                <textarea id="rental-admin-note" rows="4" value={rentalReviewForm.adminNote} onChange={(event) => setRentalReviewForm((current) => ({ ...current, adminNote: event.target.value }))} />
              </div>
            </div>
            <div className="button-row">
              <button className="button button-primary" disabled={submitting || !editingRentalRequest} type="submit">
                Save rental review
              </button>
              <button className="button button-secondary" onClick={resetRentalReviewEditor} type="button">
                Clear editor
              </button>
            </div>
          </form>

          <div className="surface-card table-card">
            <p className="muted-label">Financing requests</p>
            <div className="table-list">
              {adminDashboard.applications.map((application) => (
                <div className="table-row table-row-actions" key={application.id}>
                  <div>
                    <strong>{application.fullName}</strong>
                    <span>
                      {application.car?.brand} {application.car?.model} · {formatUsd(application.depositUsd)} deposit
                    </span>
                  </div>
                  <div className="button-row compact-row">
                    <button
                      className="button button-secondary"
                      disabled={submitting || application.status === 'Approved'}
                      onClick={() => updateApplicationStatus(application.id, 'Approved')}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="button button-muted"
                      disabled={submitting || application.status === 'Rejected'}
                      onClick={() => updateApplicationStatus(application.id, 'Rejected')}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card table-card">
            <p className="muted-label">Payment method requests</p>
            <div className="table-list">
              {adminDashboard.paymentRequests.map((paymentRequest) => (
                <div className="table-row table-row-actions" key={paymentRequest.id}>
                  <div>
                    <strong>{paymentRequest.user?.fullName}</strong>
                    <span>{paymentRequest.car?.brand} {paymentRequest.car?.model} · {paymentRequest.type} · {paymentRequest.requestedMethod.replace('-', ' ')}</span>
                    <span>{formatUsd(paymentRequest.requestedAmountUsd)} · {paymentRequest.status}</span>
                    {paymentRequest.proofAttachment ? (
                      <span>
                        Proof: <a href={paymentRequest.proofAttachment.dataUrl} download={paymentRequest.proofAttachment.name}>{paymentRequest.proofAttachment.name}</a>
                      </span>
                    ) : null}
                  </div>
                  <div className="button-row compact-row">
                    <button className="button button-secondary" onClick={() => populatePaymentInstructionForm(paymentRequest)} type="button">
                      Prepare instructions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card table-card">
            <p className="muted-label">Recent payments</p>
            <div className="table-list">
              {adminDashboard.payments.map((payment) => (
                <div className="table-row" key={payment.id}>
                  <div>
                    <strong>{payment.receiptNumber}</strong>
                    <span>{payment.car?.brand} {payment.car?.model}</span>
                    {payment.proofAttachment ? (
                      <span>
                        Proof: <a href={payment.proofAttachment.dataUrl} download={payment.proofAttachment.name}>{payment.proofAttachment.name}</a>
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <strong>{formatUsd(payment.amountUsd)}</strong>
                    <span>{formatDate(payment.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card table-card">
            <p className="muted-label">Client service briefs</p>
            <div className="table-list">
              {adminDashboard.serviceRequests.map((request) => (
                <div className="table-row table-row-actions" key={request.id}>
                  <div>
                    <strong>{request.title}</strong>
                    <span>{request.type.replace('-', ' ')} · {request.fullName} · {request.location}</span>
                  </div>
                  <div className="button-row compact-row">
                    <button
                      className="button button-secondary"
                      disabled={submitting || request.status === 'Reviewing brief'}
                      onClick={() => updateServiceRequestStatus(request.id, 'Reviewing brief')}
                      type="button"
                    >
                      Review
                    </button>
                    <button
                      className="button button-muted"
                      disabled={submitting || request.status === 'Client contacted'}
                      onClick={() => updateServiceRequestStatus(request.id, 'Client contacted')}
                      type="button"
                    >
                      Contacted
                    </button>
                    <button
                      className="button button-primary"
                      disabled={submitting || request.status === 'Closed'}
                      onClick={() => updateServiceRequestStatus(request.id, 'Closed')}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card table-card">
            <p className="muted-label">Rental requests</p>
            <div className="table-list">
              {adminDashboard.rentalRequests.map((request) => (
                <div className="table-row table-row-actions" key={request.id}>
                  <div>
                    <strong>{request.car?.brand} {request.car?.model}</strong>
                    <span>{request.fullName} · {request.pickupLocation} to {request.dropoffLocation}</span>
                    <span>{formatDate(request.pickupDate)} to {formatDate(request.returnDate)} · {request.chauffeurRequired ? 'chauffeur' : 'self-drive'}</span>
                    {request.contactEmail || request.contactPhone ? <span>Desk contact: {request.contactEmail || request.contactPhone}</span> : null}
                    {request.adminNote ? <span>{request.adminNote}</span> : null}
                  </div>
                  <div className="button-row compact-row">
                    <button
                      className="button button-secondary"
                      onClick={() => populateRentalReviewForm(request)}
                      type="button"
                    >
                      Review
                    </button>
                    <button
                      className="button button-primary"
                      disabled={submitting || request.status === 'Vehicle reserved'}
                      onClick={() => updateRentalRequestStatus(request.id, getRentalReviewPayload(request, 'Vehicle reserved'))}
                      type="button"
                    >
                      Reserve
                    </button>
                    <button
                      className="button button-muted"
                      disabled={submitting || request.status === 'Closed'}
                      onClick={() => updateRentalRequestStatus(request.id, getRentalReviewPayload(request, 'Closed'))}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card table-card">
        <p className="muted-label">Inventory</p>
        <div className="table-list">
          {adminDashboard.cars.map((car) => (
            <div className="table-row table-row-actions" key={car.id}>
              <div className="admin-inventory-cell">
                <button
                  aria-label={`Open ${car.brand} ${car.model} gallery`}
                  className="admin-inventory-preview"
                  onClick={() => openInventoryPreview(car)}
                  type="button"
                >
                  <img alt={`${car.brand} ${car.model}`} src={getVehicleHeroImage(car)} />
                  <span className="admin-inventory-preview-label">Preview</span>
                </button>
                <div>
                  <strong>{car.brand} {car.model}</strong>
                  <span>{car.location} · {formatUsd(car.priceUsd)} · Deposit {formatUsd(car.minimumDepositUsd)} · {car.rentable ? `Rent from ${formatUsd(car.rentalTerms?.dailyUsd || 0)}/day` : 'Rental disabled'}</span>
                </div>
              </div>
              <div className="button-row compact-row">
                <button className="button button-secondary" onClick={() => populateForm(car)} type="button">
                  Edit
                </button>
                <button className="button button-muted" onClick={() => deleteCar(car.id)} type="button">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewCar ? (
        <VehicleImageLightbox
          activeIndex={activePreviewIndex}
          car={previewCar}
          galleryItems={previewGalleryItems}
          isOpen={Boolean(previewCar)}
          onClose={closeInventoryPreview}
          onSelectIndex={setActivePreviewIndex}
        />
      ) : null}

      <div className="dashboard-grid second-grid">
        <div className="surface-card table-card">
          <p className="muted-label">Users</p>
          <div className="table-list">
            {adminDashboard.users.map((user) => (
              <div className="table-row table-row-actions" key={user.id}>
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="button-row compact-row">
                  <div className="text-right">
                    <strong>{user.location}</strong>
                    <span>{user.phone}</span>
                  </div>
                  <button
                    className="button button-muted"
                    disabled={submitting || user.role === 'admin'}
                    onClick={() => setPendingUserDeletion(user)}
                    type="button"
                  >
                    {user.role === 'admin' ? 'Protected' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card table-card">
          <p className="muted-label">Delivery orders</p>
          <div className="table-list">
            {adminDashboard.deliveryRequests.map((request) => (
              <div className="table-row" key={request.id}>
                <div>
                  <strong>{request.car?.brand} {request.car?.model}</strong>
                  <span>{request.address}</span>
                </div>
                <div className="text-right">
                  <strong>{request.status}</strong>
                  <span>{formatUsd(request.feeUsd)} · {request.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pendingUserDeletion ? (
        <div className="confirm-modal-backdrop" role="presentation">
          <div aria-labelledby="confirm-user-delete-title" aria-modal="true" className="confirm-modal surface-card" role="dialog">
            <p className="muted-label">Confirm deletion</p>
            <h3 id="confirm-user-delete-title">Remove {pendingUserDeletion.fullName}?</h3>
            <p>
              This will permanently remove the user from the admin dashboard together with their financing,
              payment, delivery, service, and rental records.
            </p>
            <div className="button-row">
              <button className="button button-secondary" disabled={submitting} onClick={() => setPendingUserDeletion(null)} type="button">
                Cancel
              </button>
              <button className="button button-muted" disabled={submitting} onClick={confirmUserDeletion} type="button">
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
