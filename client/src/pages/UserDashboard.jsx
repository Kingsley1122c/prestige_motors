import { Link } from 'react-router-dom'
import { CarCard } from '../components/CarCard'
import { SectionTitle } from '../components/SectionTitle'
import { useMarket } from '../context/MarketContext'
import { formatDate, formatUsd } from '../utils/format'

export function UserDashboard() {
  const { userDashboard, lastReceipt, currentUser, selectedCountry } = useMarket()

  return (
    <section className="page-shell section-spaced dashboard-page">
      <SectionTitle
        eyebrow="User dashboard"
        title="Track saved cars, financing, and payment activity"
        description="This dashboard shows the buyer-side workflow from favorites through application review, receipts, and delivery coordination."
      />

      <div className="surface-card profile-card">
        <strong>{currentUser?.fullName}</strong>
        <p>
          {currentUser?.email} · {currentUser?.phone}
        </p>
        <p>
          Country: {selectedCountry.name} · Location: {userDashboard.profile?.location}
        </p>
      </div>

      <div className="metric-grid">
        <article className="surface-card metric-card">
          <strong>{userDashboard.favoriteCars.length}</strong>
          <span>Saved cars</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{userDashboard.applications.length}</strong>
          <span>Applications</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{userDashboard.payments.length}</strong>
          <span>Payments</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{userDashboard.paymentRequests.length}</strong>
          <span>Payment requests</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{userDashboard.deliveryRequests.length}</strong>
          <span>Delivery requests</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{userDashboard.rentalRequests.length}</strong>
          <span>Rental requests</span>
        </article>
        <article className="surface-card metric-card">
          <strong>{userDashboard.serviceRequests.length}</strong>
          <span>Service briefs</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <div>
          <SectionTitle eyebrow="Favorites" title="Saved vehicles" />
          <div className="card-grid compact-grid">
            {userDashboard.favoriteCars.length ? (
              userDashboard.favoriteCars.map((car) => <CarCard key={car.id} car={car} />)
            ) : (
              <div className="surface-card empty-state">
                <p>No saved cars yet.</p>
                <Link className="button button-primary" to="/listings">
                  Browse inventory
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-stack">
          <div className="surface-card notification-card">
            <p className="muted-label">Notifications</p>
            {userDashboard.notifications.map((notification) => (
              <article className="notification-item" key={notification.id}>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                <span>{formatDate(notification.createdAt)}</span>
              </article>
            ))}
          </div>

          {lastReceipt ? (
            <div className="surface-card receipt-card">
              <p className="muted-label">Latest receipt</p>
              <strong>{lastReceipt.receiptNumber}</strong>
              <p>{formatUsd(lastReceipt.amountUsd)} via {lastReceipt.method}</p>
              <span>{formatDate(lastReceipt.issuedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="dashboard-grid second-grid">
        <div className="surface-card table-card">
          <p className="muted-label">Applications</p>
          <div className="table-list">
            {userDashboard.applications.map((application) => (
              <div className="table-row" key={application.id}>
                <div>
                  <strong>{application.car?.brand} {application.car?.model}</strong>
                  <span>{application.months} months · Deposit {formatUsd(application.depositUsd)}</span>
                </div>
                <div className="text-right">
                  <strong>{application.status}</strong>
                  <span>{formatDate(application.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card table-card">
          <p className="muted-label">Payment instructions</p>
          <div className="table-list">
            {userDashboard.paymentRequests.map((paymentRequest) => (
              <div className="table-row" key={paymentRequest.id}>
                <div>
                  <strong>{paymentRequest.car?.brand} {paymentRequest.car?.model}</strong>
                  <span>{paymentRequest.type} · requested {paymentRequest.requestedMethod.replace('-', ' ')}</span>
                  <span>{paymentRequest.instructionsTitle || paymentRequest.adminNote || 'Waiting for admin review.'}</span>
                  {paymentRequest.proofAttachment ? (
                    <span>
                      Proof uploaded: <a href={paymentRequest.proofAttachment.dataUrl} download={paymentRequest.proofAttachment.name}>{paymentRequest.proofAttachment.name}</a>
                    </span>
                  ) : null}
                </div>
                <div className="text-right">
                  <strong>{paymentRequest.status}</strong>
                  <span>{formatUsd(paymentRequest.approvedAmountUsd || paymentRequest.requestedAmountUsd)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card table-card">
          <p className="muted-label">Payment plans & receipts</p>
          <div className="table-list">
            {userDashboard.payments.map((payment) => (
              <div className="table-row" key={payment.id}>
                <div>
                  <strong>{payment.car?.brand} {payment.car?.model}</strong>
                  <span>{payment.type} · {payment.method}</span>
                  {payment.proofAttachment ? (
                    <span>
                      Proof: <a href={payment.proofAttachment.dataUrl} download={payment.proofAttachment.name}>{payment.proofAttachment.name}</a>
                    </span>
                  ) : null}
                </div>
                <div className="text-right">
                  <strong>{formatUsd(payment.amountUsd)}</strong>
                  <span>{payment.receiptNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface-card table-card">
        <p className="muted-label">Delivery requests</p>
        <div className="table-list">
          {userDashboard.deliveryRequests.map((request) => (
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

      <div className="surface-card table-card">
        <p className="muted-label">Rental requests</p>
        <div className="table-list">
          {userDashboard.rentalRequests.length ? userDashboard.rentalRequests.map((request) => (
            <div className="table-row" key={request.id}>
              <div>
                <strong>{request.car?.brand} {request.car?.model}</strong>
                <span>{request.pickupLocation} to {request.dropoffLocation}</span>
                <span>{formatDate(request.pickupDate)} to {formatDate(request.returnDate)}</span>
                {request.contactEmail || request.contactPhone ? <span>Desk contact: {request.contactEmail || request.contactPhone}</span> : null}
                {request.adminNote ? <span>{request.adminNote}</span> : null}
              </div>
              <div className="text-right">
                <strong>{request.status}</strong>
                <span>{request.chauffeurRequired ? 'Chauffeur requested' : 'Self-drive request'}</span>
              </div>
            </div>
          )) : (
            <div className="table-row">
              <div>
                <strong>No rental requests yet</strong>
                <span>Open a rentable car and submit pickup, return, and driver details.</span>
              </div>
              <div className="text-right">
                <Link className="button button-secondary" to="/rentals">
                  Browse rentals
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="surface-card table-card">
        <p className="muted-label">Trade-in, sourcing, and private sale briefs</p>
        <div className="table-list">
          {userDashboard.serviceRequests.length ? userDashboard.serviceRequests.map((request) => (
            <div className="table-row" key={request.id}>
              <div>
                <strong>{request.title}</strong>
                <span>{request.type.replace('-', ' ')} · {request.location}</span>
              </div>
              <div className="text-right">
                <strong>{request.status}</strong>
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </div>
          )) : (
            <div className="table-row">
              <div>
                <strong>No service briefs yet</strong>
                <span>Use concierge sourcing, trade-in, or private sale intake from the services page.</span>
              </div>
              <div className="text-right">
                <Link className="button button-secondary" to="/services">
                  Open services
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
