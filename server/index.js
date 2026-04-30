const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const {
  nextId,
  createCarRecord,
  createUserRecord,
  getCountrySettings,
  attachVehicleDisplayMedia,
} = require('./data/store')
const {
  DATABASE_FILE_PATH,
  cars,
  users,
  financingApplications,
  payments,
  paymentEvents,
  paymentRequests,
  deliveryRequests,
  serviceRequests,
  rentalRequests,
  meta,
  refreshMetaCollections,
  getDatabaseSnapshot,
  saveDatabase,
} = require('./data/database')

const app = express()
const PORT = process.env.PORT || 4000
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || ''
const APP_STARTED_AT = new Date().toISOString()

app.use(cors({
  origin(origin, callback) {
    if (!FRONTEND_ORIGIN || !origin || origin === FRONTEND_ORIGIN) {
      callback(null, true)
      return
    }

    callback(new Error('Origin not allowed by CORS'))
  },
}))
app.post('/api/payments/paystack/webhook', express.raw({ type: 'application/json' }), (request, response, next) => next())
app.use(express.json({ limit: '8mb' }))

const PASSWORD_SALT_ROUNDS = 10
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30
const TOKEN_HEADER_PREFIX = 'Bearer '
const readConfiguredValue = (key, fallback = '') => String(process.env[key] || '').trim() || fallback
const AUTH_TOKEN_SECRET = readConfiguredValue('AUTH_TOKEN_SECRET', 'development-token-secret-change-me')
const PAYSTACK_SECRET_KEY = readConfiguredValue('PAYSTACK_SECRET_KEY')
const PAYSTACK_PUBLIC_KEY = readConfiguredValue('PAYSTACK_PUBLIC_KEY')
const PAYSTACK_CURRENCY = readConfiguredValue('PAYSTACK_CURRENCY', 'USD')
const PAYSTACK_TEST_MODE = readConfiguredValue('PAYSTACK_TEST_MODE', 'off')
const PAYSTACK_API_BASE_URL = 'https://api.paystack.co'

const isPasswordHash = (password) => String(password || '').startsWith('$2')
const hashPassword = (password) => bcrypt.hashSync(String(password), PASSWORD_SALT_ROUNDS)
const verifyPassword = (password, passwordHash) => {
  if (!passwordHash) {
    return false
  }

  if (!isPasswordHash(passwordHash)) {
    return passwordHash === password
  }

  return bcrypt.compareSync(String(password), passwordHash)
}

const migrateStoredPasswords = () => {
  let didChange = false

  users.forEach((user) => {
    if (!isPasswordHash(user.password)) {
      user.password = hashPassword(user.password)
      didChange = true
    }
  })

  if (didChange) {
    saveDatabase()
  }
}

migrateStoredPasswords()

const syncConfiguredAdminUser = () => {
  const configuredAdmin = {
    fullName: readConfiguredValue('ADMIN_FULL_NAME'),
    email: readConfiguredValue('ADMIN_EMAIL'),
    phone: readConfiguredValue('ADMIN_PHONE'),
    password: readConfiguredValue('ADMIN_PASSWORD'),
  }
  let didChange = false
  let adminUser = users.find((entry) => entry.id === 'admin-user') || users.find((entry) => entry.role === 'admin')

  if (!adminUser) {
    if (!configuredAdmin.fullName || !configuredAdmin.email || !configuredAdmin.phone || !configuredAdmin.password) {
      return
    }

    users.unshift(createUserRecord({
      id: 'admin-user',
      fullName: configuredAdmin.fullName,
      email: configuredAdmin.email,
      phone: configuredAdmin.phone,
      password: hashPassword(configuredAdmin.password),
      role: 'admin',
      country: 'US',
      location: 'Miami',
    }))
    saveDatabase()
    return
  }

  if (configuredAdmin.email && configuredAdmin.email.toLowerCase() !== String(adminUser.email || '').toLowerCase()) {
    const duplicateUser = users.find((entry) => entry.id !== adminUser.id && String(entry.email || '').toLowerCase() === configuredAdmin.email.toLowerCase())

    if (!duplicateUser) {
      adminUser.email = configuredAdmin.email
      didChange = true
    }
  }

  if (configuredAdmin.fullName && configuredAdmin.fullName !== adminUser.fullName) {
    adminUser.fullName = configuredAdmin.fullName
    didChange = true
  }

  if (configuredAdmin.phone && configuredAdmin.phone !== adminUser.phone) {
    adminUser.phone = configuredAdmin.phone
    didChange = true
  }

  if (configuredAdmin.password && !verifyPassword(configuredAdmin.password, adminUser.password)) {
    adminUser.password = hashPassword(configuredAdmin.password)
    didChange = true
  }

  if (didChange) {
    saveDatabase()
  }
}

syncConfiguredAdminUser()

const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  const { password, ...safeUser } = user
  return { ...safeUser, countrySettings: getCountrySettings(safeUser.country) }
}

const createTokenSignature = (payload) => crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(payload).digest('base64url')

const createAuthToken = (user) => {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, exp: Date.now() + AUTH_TOKEN_TTL_MS })).toString('base64url')
  return `${payload}.${createTokenSignature(payload)}`
}

const readBearerToken = (request) => {
  const authorizationHeader = String(request.headers.authorization || '')

  if (!authorizationHeader.startsWith(TOKEN_HEADER_PREFIX)) {
    return ''
  }

  return authorizationHeader.slice(TOKEN_HEADER_PREFIX.length).trim()
}

const readAuthSession = (token) => {
  if (!token) {
    return null
  }

  const [payload, signature, ...rest] = String(token).split('.')

  if (!payload || !signature || rest.length) {
    return null
  }

  const expectedSignature = createTokenSignature(payload)

  if (signature.length !== expectedSignature.length) {
    return null
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  try {
    const authSession = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))

    if (!authSession?.userId || !authSession?.exp || Number(authSession.exp) <= Date.now()) {
      return null
    }

    return authSession
  } catch {
    return null
  }
}

const decorateCar = (car) => attachVehicleDisplayMedia(car)
const getUser = (userId) => users.find((entry) => entry.id === userId)
const getCar = (carId) => decorateCar(cars.find((car) => car.id === carId))
const findUserByEmail = (email) => users.find((entry) => entry.email.toLowerCase() === String(email).toLowerCase())
const getActor = (request) => {
  const authSession = readAuthSession(readBearerToken(request))

  if (!authSession) {
    return null
  }

  request.authSession = authSession
  return getUser(authSession.userId)
}

const requireSignedIn = (request, response, next) => {
  const actor = getActor(request)

  if (!actor) {
    response.status(401).json({ message: 'Please create an account or log in first.' })
    return
  }

  request.actor = actor
  next()
}

const requireAdmin = (request, response, next) => {
  const actor = getActor(request)

  if (!actor || actor.role !== 'admin') {
    response.status(403).json({ message: 'Admin credentials are required for this action.' })
    return
  }

  request.actor = actor
  next()
}

const pushNotification = (userId, title, body) => {
  const user = getUser(userId)

  if (!user) {
    return
  }

  user.notifications.unshift({
    id: nextId('note', user.notifications),
    title,
    body,
    createdAt: new Date().toISOString(),
  })
}

const decorateApplication = (application) => {
  const car = getCar(application.carId)
  const selectedPlan = car?.monthlyPlans.find((plan) => plan.months === application.months)

  return { ...application, car, selectedPlan }
}

const decorateServiceRequest = (serviceRequest) => ({
  ...serviceRequest,
  user: sanitizeUser(getUser(serviceRequest.userId)),
})

const decoratePaymentRequest = (paymentRequest) => ({
  ...paymentRequest,
  car: getCar(paymentRequest.carId),
  user: sanitizeUser(getUser(paymentRequest.userId)),
})

const decoratePaymentEvent = (paymentEvent) => ({
  ...paymentEvent,
  payment: payments.find((payment) => payment.id === paymentEvent.paymentId) || null,
  paymentRequest: paymentRequests.find((paymentRequest) => paymentRequest.id === paymentEvent.paymentRequestId) || null,
  car: getCar(paymentEvent.carId),
  user: sanitizeUser(getUser(paymentEvent.userId)),
})

const createReceiptNumber = () => `RCPT-${Date.now()}`
const paymentNeedsManualVerification = (method) => ['bank-transfer', 'wire-transfer'].includes(method)
const paymentNeedsProviderVerification = (method) => method === 'payment-link'
const paymentIsFinalized = (payment) => ['Confirmed', 'Declined', 'Failed'].includes(payment?.status)
const paystackIsConfigured = () => Boolean(PAYSTACK_SECRET_KEY) || PAYSTACK_TEST_MODE === 'mock'
const paystackRunsInMockMode = () => PAYSTACK_TEST_MODE === 'mock'
const toPaystackMinorUnits = (amountUsd) => Math.round(Number(amountUsd) * 100)

const getRequestOrigin = (request) => {
  const candidate = request?.headers?.origin || request?.headers?.referer

  if (!candidate) {
    return ''
  }

  try {
    return new URL(candidate).origin
  } catch {
    return ''
  }
}

const buildFrontendUrl = (path, request) => {
  const frontendOrigin = FRONTEND_ORIGIN || getRequestOrigin(request) || 'http://localhost:5173'
  return new URL(path, frontendOrigin).toString()
}

const buildPaystackHeaders = () => ({
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
})

const buildPaystackSignature = (payload) => crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(payload).digest('hex')
const paystackWebhookSignatureIsValid = (request) => {
  const headerSignature = String(request.headers['x-paystack-signature'] || '')

  if (!headerSignature || !PAYSTACK_SECRET_KEY || !Buffer.isBuffer(request.body)) {
    return false
  }

  const expectedSignature = buildPaystackSignature(request.body)

  if (expectedSignature.length !== headerSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(headerSignature), Buffer.from(expectedSignature))
}

const createPaymentRecord = ({ userId, carId, type, method, amountUsd, paymentRequestId, status, proofAttachment = null, provider = '', providerReference = '', providerAccessCode = '' }) => ({
  id: nextId('pay', payments),
  userId,
  carId,
  paymentRequestId,
  type,
  method,
  provider,
  providerReference,
  providerAccessCode,
  amountUsd: Number(amountUsd),
  createdAt: new Date().toISOString(),
  receiptNumber: '',
  status,
  proofAttachment,
  proofUploadedAt: proofAttachment ? new Date().toISOString() : '',
  verifiedAt: '',
  adminNote: '',
})

const logPaymentEvent = ({ payment = null, paymentRequest = null, eventType, provider = '', reference = '', status = '', actorType = 'system', actorId = '', note = '' }) => {
  paymentEvents.unshift({
    id: nextId('payment-event', paymentEvents),
    paymentId: payment?.id || '',
    paymentRequestId: paymentRequest?.id || '',
    userId: payment?.userId || paymentRequest?.userId || '',
    carId: payment?.carId || paymentRequest?.carId || '',
    eventType,
    provider,
    reference,
    status,
    actorType,
    actorId,
    note,
    createdAt: new Date().toISOString(),
  })
}

const findPaymentByRequestId = (paymentRequestId) => payments.find((entry) => entry.paymentRequestId === paymentRequestId)

const markPaymentRequestStatus = (paymentRequest, status) => {
  paymentRequest.status = status

  if (status === 'Confirmed') {
    paymentRequest.confirmedAt = new Date().toISOString()
  }
}

const confirmPayment = (payment, paymentRequest, options = {}) => {
  if (!payment || !paymentRequest) {
    return null
  }

  payment.status = 'Confirmed'
  payment.receiptNumber = payment.receiptNumber || createReceiptNumber()
  payment.verifiedAt = options.verifiedAt || new Date().toISOString()
  payment.adminNote = options.adminNote || payment.adminNote || ''
  payment.providerReference = options.providerReference || payment.providerReference || ''
  payment.providerAccessCode = options.providerAccessCode || payment.providerAccessCode || ''

  paymentRequest.paymentId = payment.id
  paymentRequest.proofAttachment = payment.proofAttachment || paymentRequest.proofAttachment || null
  paymentRequest.proofUploadedAt = payment.proofUploadedAt || paymentRequest.proofUploadedAt || ''
  paymentRequest.approvedAmountUsd = payment.amountUsd
  paymentRequest.approvedMethod = payment.method
  paymentRequest.referenceCode = paymentRequest.referenceCode || options.referenceCode || payment.providerReference || ''
  markPaymentRequestStatus(paymentRequest, 'Confirmed')
  paymentRequest.confirmedAt = payment.verifiedAt

  return {
    payment: { ...payment, car: getCar(payment.carId) },
    receipt: {
      receiptNumber: payment.receiptNumber,
      amountUsd: payment.amountUsd,
      method: payment.method,
      issuedAt: payment.verifiedAt,
    },
  }
}

const failPayment = (payment, paymentRequest, status, adminNote = '') => {
  if (!payment || !paymentRequest) {
    return
  }

  payment.status = status
  payment.adminNote = adminNote || payment.adminNote || ''
  payment.verifiedAt = new Date().toISOString()
  paymentRequest.adminNote = adminNote || paymentRequest.adminNote || ''
  paymentRequest.status = status === 'Declined' ? 'Declined' : 'Instructions Sent'
}

const processVerifiedPayment = ({ payment, paymentRequest, verifiedReference, verifiedAmountMinor, verifiedAt, adminNote = '' }) => {
  if (!payment || !paymentRequest) {
    throw new Error('Linked payment data was not found.')
  }

  if (String(verifiedReference || '') !== String(payment.providerReference || '')) {
    throw new Error('Paystack reference mismatch.')
  }

  if (Number(verifiedAmountMinor) !== toPaystackMinorUnits(payment.amountUsd)) {
    throw new Error('Paystack amount does not match the approved payment amount.')
  }

  const confirmed = confirmPayment(payment, paymentRequest, {
    verifiedAt: verifiedAt || new Date().toISOString(),
    providerReference: verifiedReference,
    referenceCode: verifiedReference,
    adminNote,
  })

  const car = getCar(payment.carId)
  pushNotification(payment.userId, 'Payment verified', `Receipt ${confirmed.receipt.receiptNumber} was generated for your ${payment.type} payment on ${car.brand} ${car.model}.`)
  return confirmed
}

const processPaystackSettlement = ({ reference, status, amountMinor, paidAt, adminNote = '' }) => {
  const payment = payments.find((entry) => entry.provider === 'paystack' && entry.providerReference === reference)

  if (!payment) {
    throw new Error('Paystack payment record not found.')
  }

  const paymentRequest = paymentRequests.find((entry) => entry.id === payment.paymentRequestId)

  if (!paymentRequest) {
    throw new Error('Linked payment request not found.')
  }

  if (payment.status === 'Confirmed') {
    return confirmPayment(payment, paymentRequest, {
      verifiedAt: payment.verifiedAt || paidAt || payment.createdAt,
      providerReference: payment.providerReference,
      adminNote,
    })
  }

  if (status !== 'success') {
    payment.status = 'Pending Verification'
    payment.adminNote = adminNote || `Paystack returned ${status}.`
    paymentRequest.status = 'Pending Verification'
    return { payment: { ...payment, car: getCar(payment.carId) }, receipt: null }
  }

  return processVerifiedPayment({
    payment,
    paymentRequest,
    verifiedReference: reference,
    verifiedAmountMinor: amountMinor,
    verifiedAt: paidAt,
    adminNote,
  })
}

const initializePaystackTransaction = async ({ email, amountUsd, reference, callbackUrl, metadata }) => {
  if (paystackRunsInMockMode()) {
    return {
      authorization_url: callbackUrl,
      access_code: `mock_access_${reference}`,
      reference,
    }
  }

  const paystackResponse = await fetch(`${PAYSTACK_API_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: buildPaystackHeaders(),
    body: JSON.stringify({
      email,
      amount: toPaystackMinorUnits(amountUsd),
      currency: PAYSTACK_CURRENCY,
      reference,
      callback_url: callbackUrl,
      metadata,
    }),
  })

  const result = await paystackResponse.json()

  if (!paystackResponse.ok || !result?.status || !result?.data?.authorization_url) {
    throw new Error(result?.message || 'Unable to initialize Paystack payment.')
  }

  return result.data
}

const verifyPaystackTransaction = async (reference) => {
  const paystackResponse = await fetch(`${PAYSTACK_API_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: buildPaystackHeaders(),
  })
  const result = await paystackResponse.json()

  if (!paystackResponse.ok || !result?.status || !result?.data) {
    throw new Error(result?.message || 'Unable to verify Paystack payment.')
  }

  return result.data
}

const verifyPaystackTransactionWithFallback = async (reference, amountUsd) => {
  if (paystackRunsInMockMode()) {
    return {
      reference,
      amount: toPaystackMinorUnits(amountUsd),
      status: 'success',
      paid_at: new Date().toISOString(),
    }
  }

  return verifyPaystackTransaction(reference)
}

const decorateRentalRequest = (rentalRequest) => ({
  ...rentalRequest,
  car: getCar(rentalRequest.carId),
  user: sanitizeUser(getUser(rentalRequest.userId)),
})

const buildUserDashboard = (userId) => {
  const user = getUser(userId)

  if (!user) {
    return null
  }

  return {
    profile: sanitizeUser(user),
    favoriteCars: cars.filter((car) => user.favoriteCarIds.includes(car.id)).map(decorateCar),
    applications: financingApplications.filter((application) => application.userId === userId).map(decorateApplication).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    payments: payments.filter((payment) => payment.userId === userId).map((payment) => ({ ...payment, car: getCar(payment.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    paymentRequests: paymentRequests.filter((paymentRequest) => paymentRequest.userId === userId).map(decoratePaymentRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    deliveryRequests: deliveryRequests.filter((request) => request.userId === userId).map((request) => ({ ...request, car: getCar(request.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    serviceRequests: serviceRequests.filter((request) => request.userId === userId).map(decorateServiceRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    rentalRequests: rentalRequests.filter((request) => request.userId === userId).map(decorateRentalRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    notifications: [...user.notifications].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  }
}

const buildAdminDashboard = () => ({
  stats: {
    totalCars: cars.length,
    totalUsers: users.filter((user) => user.role !== 'admin').length,
    activeApplications: financingApplications.filter((item) => item.status === 'Pending Review').length,
    confirmedPayments: payments.filter((item) => item.status === 'Confirmed').length,
    pendingVerificationPayments: payments.filter((item) => item.status === 'Pending Verification').length,
    pendingPaymentRequests: paymentRequests.filter((item) => item.status === 'Pending Approval').length,
    openServiceRequests: serviceRequests.filter((item) => item.status !== 'Closed').length,
    openRentalRequests: rentalRequests.filter((item) => !['Closed', 'Declined'].includes(item.status)).length,
  },
  cars: cars.map(decorateCar),
  users: users.map(sanitizeUser),
  applications: financingApplications.map(decorateApplication).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  payments: payments.map((payment) => ({ ...payment, car: getCar(payment.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  pendingVerificationPayments: payments.filter((payment) => payment.status === 'Pending Verification').map((payment) => ({ ...payment, car: getCar(payment.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  paymentRequests: paymentRequests.map(decoratePaymentRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  paymentEvents: paymentEvents.map(decoratePaymentEvent).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 40),
  deliveryRequests: deliveryRequests.map((request) => ({ ...request, car: getCar(request.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  serviceRequests: serviceRequests.map(decorateServiceRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  rentalRequests: rentalRequests.map(decorateRentalRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
})

const validateServiceRequest = ({ type, title, fullName, email, phone, location, assetDetails, desiredOutcome }) => {
  if (!['trade-in', 'concierge', 'private-sale'].includes(type)) {
    return 'Choose a valid service request type.'
  }

  if (!title || !fullName || !email || !phone || !location || !assetDetails || !desiredOutcome) {
    return 'Complete every required service request field.'
  }

  return ''
}

const validatePaymentRequest = ({ type, preferredMethod, requestedAmountUsd }) => {
  if (!['deposit', 'full'].includes(type)) {
    return 'Choose a valid payment type.'
  }

  if (!['bank-transfer', 'wire-transfer', 'payment-link', 'escrow'].includes(preferredMethod)) {
    return 'Choose a valid preferred payment method.'
  }

  if (!requestedAmountUsd || Number(requestedAmountUsd) <= 0) {
    return 'Enter a valid payment amount.'
  }

  return ''
}

const validateRentalRequest = ({ fullName, email, phone, pickupLocation, dropoffLocation, pickupDate, returnDate, driverLicenseNumber }) => {
  if (!fullName || !email || !phone || !pickupLocation || !dropoffLocation || !pickupDate || !returnDate || !driverLicenseNumber) {
    return 'Complete every required rental request field.'
  }

  const pickupAt = Date.parse(pickupDate)
  const returnAt = Date.parse(returnDate)

  if (Number.isNaN(pickupAt) || Number.isNaN(returnAt)) {
    return 'Choose valid pickup and return dates.'
  }

  if (returnAt <= pickupAt) {
    return 'Return date must be later than pickup date.'
  }

  return ''
}

const validateRentalReview = ({ status, contactEmail, contactPhone, adminNote }) => {
  if (!['Pending Review', 'Approved for contact', 'Vehicle reserved', 'Closed', 'Declined'].includes(status)) {
    return 'Invalid rental request status.'
  }

  if (status === 'Declined' && !adminNote) {
    return 'Add an admin note when declining a rental request.'
  }

  if (['Approved for contact', 'Vehicle reserved'].includes(status) && !contactEmail && !contactPhone) {
    return 'Add a contact email or phone number before approving a rental request.'
  }

  return ''
}

const validatePaymentInstructions = ({ status, approvedMethod, bankName, accountName, accountNumber, paymentLink, adminNote }) => {
  if (!['Instructions Sent', 'Declined'].includes(status)) {
    return 'Choose a valid payment request status.'
  }

  if (status === 'Declined') {
    return adminNote ? '' : 'Add an admin note when declining a payment request.'
  }

  if (!['bank-transfer', 'wire-transfer', 'payment-link', 'escrow'].includes(approvedMethod)) {
    return 'Choose the approved payment method.'
  }

  if (approvedMethod === 'payment-link' && !paymentLink) {
    if (paymentLink !== 'paystack') {
      return 'Provide the payment link before sending instructions.'
    }
  }

  if ((approvedMethod === 'bank-transfer' || approvedMethod === 'wire-transfer') && (!bankName || !accountName || !accountNumber)) {
    return 'Provide bank name, account name, and account number before sending bank instructions.'
  }

  if (approvedMethod === 'escrow' && !adminNote) {
    return 'Add escrow guidance before sending instructions.'
  }

  return ''
}

const validateProofAttachment = (proofAttachment) => {
  if (!proofAttachment || typeof proofAttachment !== 'object') {
    return 'Upload proof of payment before recording a bank or wire transfer.'
  }

  if (!proofAttachment.name || !proofAttachment.type || !proofAttachment.dataUrl) {
    return 'Uploaded proof of payment is incomplete.'
  }

  if (!String(proofAttachment.dataUrl).startsWith('data:')) {
    return 'Uploaded proof of payment must include a previewable attachment.'
  }

  return ''
}

const buildSystemStatus = () => ({
  status: 'ok',
  service: 'prestige-motors-api',
  startedAt: APP_STARTED_AT,
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.round(process.uptime()),
  version: process.env.RENDER_GIT_COMMIT || process.env.npm_package_version || 'dev',
  database: {
    configuredPath: DATABASE_FILE_PATH,
    collections: {
      cars: cars.length,
      users: users.length,
      financingApplications: financingApplications.length,
      payments: payments.length,
      paymentRequests: paymentRequests.length,
      deliveryRequests: deliveryRequests.length,
      serviceRequests: serviceRequests.length,
      rentalRequests: rentalRequests.length,
    },
  },
})

const createBackupFileName = () => `prestige-motors-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`

app.get('/api/health', (request, response) => {
  const systemStatus = buildSystemStatus()

  response.json({
    status: systemStatus.status,
    service: systemStatus.service,
    timestamp: systemStatus.timestamp,
    uptimeSeconds: systemStatus.uptimeSeconds,
    version: systemStatus.version,
  })
})

app.get('/api/meta', (request, response) => {
  response.json(meta)
})

app.post('/api/auth/register', (request, response) => {
  const { fullName, email, phone, password, country, location } = request.body

  if (!fullName || !email || !phone || !password || !country || !location) {
    response.status(400).json({ message: 'Full name, email, phone, password, country, and location are required.' })
    return
  }

  if (password.length < 8) {
    response.status(400).json({ message: 'Password must be at least 8 characters long.' })
    return
  }

  if (findUserByEmail(email)) {
    response.status(400).json({ message: 'An account with that email already exists.' })
    return
  }

  const user = createUserRecord({ id: `user-${Date.now()}`, fullName, email, phone, password: hashPassword(password), role: 'user', country, location })
  users.push(user)
  saveDatabase()

  response.status(201).json({ message: 'Account created successfully.', user: sanitizeUser(user), token: createAuthToken(user) })
})

app.post('/api/auth/login', (request, response) => {
  const { email, password } = request.body
  const user = findUserByEmail(email)

  if (!user || !verifyPassword(password, user.password)) {
    response.status(401).json({ message: 'Invalid email or password.' })
    return
  }

  response.json({ message: 'Login successful.', user: sanitizeUser(user), token: createAuthToken(user) })
})

app.get('/api/cars', (request, response) => {
  const { brand, location, paymentType, minPrice, maxPrice } = request.query

  const filteredCars = cars.filter((car) => {
    if (brand && brand !== 'All' && car.brand !== brand) return false
    if (location && location !== 'All' && car.location !== location) return false
    if (paymentType === 'rental' && !car.rentable) return false
    if (paymentType && paymentType !== 'All' && paymentType !== 'rental' && !car.paymentTypes.includes(paymentType)) return false
    if (minPrice && car.priceUsd < Number(minPrice)) return false
    if (maxPrice && car.priceUsd > Number(maxPrice)) return false
    return true
  })

  response.json({ cars: filteredCars.map(decorateCar) })
})

app.get('/api/cars/:carId', (request, response) => {
  const car = getCar(request.params.carId)

  if (!car) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  response.json({ car })
})

app.get('/api/dashboard/user/:userId', (request, response) => {
  const actor = getActor(request)

  if (!actor) {
    response.status(401).json({ message: 'Please log in to access your dashboard.' })
    return
  }

  if (actor.role !== 'admin' && actor.id !== request.params.userId) {
    response.status(403).json({ message: 'You can only access your own dashboard.' })
    return
  }

  const dashboard = buildUserDashboard(request.params.userId)

  if (!dashboard) {
    response.status(404).json({ message: 'User dashboard not found.' })
    return
  }

  response.json(dashboard)
})

app.get('/api/dashboard/admin', requireAdmin, (request, response) => {
  response.json(buildAdminDashboard())
})

app.get('/api/admin/system/status', requireAdmin, (request, response) => {
  response.json(buildSystemStatus())
})

app.get('/api/admin/system/export', requireAdmin, (request, response) => {
  const backupPayload = {
    exportedAt: new Date().toISOString(),
    exportedBy: request.actor.id,
    version: process.env.RENDER_GIT_COMMIT || process.env.npm_package_version || 'dev',
    snapshot: getDatabaseSnapshot(),
  }

  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Content-Disposition', `attachment; filename="${createBackupFileName()}"`)
  response.send(JSON.stringify(backupPayload, null, 2))
})

app.post('/api/favorites', requireSignedIn, (request, response) => {
  const { carId } = request.body
  const user = request.actor
  const userId = user.id

  if (!getCar(carId)) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  if (user.favoriteCarIds.includes(carId)) {
    user.favoriteCarIds = user.favoriteCarIds.filter((entry) => entry !== carId)
  } else {
    user.favoriteCarIds.push(carId)
    pushNotification(userId, 'Car saved', 'A vehicle was added to your favorites list.')
  }

  saveDatabase()

  response.json(buildUserDashboard(userId))
})

app.post('/api/financing-applications', requireSignedIn, (request, response) => {
  const { carId, fullName, phone, email, incomeUsd, location, depositUsd, months } = request.body
  const car = getCar(carId)
  const user = request.actor
  const userId = user.id

  if (!car) {
    response.status(404).json({ message: 'Select a valid vehicle before applying.' })
    return
  }

  if (!fullName || !phone || !email || !incomeUsd || !location || !depositUsd || !months) {
    response.status(400).json({ message: 'Complete every required financing field.' })
    return
  }

  if (Number(depositUsd) < car.minimumDepositUsd) {
    response.status(400).json({ message: `Minimum deposit for this vehicle is $${car.minimumDepositUsd}.` })
    return
  }

  const application = { id: nextId('app', financingApplications), userId, carId, fullName, phone, email, incomeUsd: Number(incomeUsd), location, depositUsd: Number(depositUsd), months: Number(months), status: 'Pending Review', createdAt: new Date().toISOString() }
  financingApplications.unshift(application)
  user.fullName = fullName
  user.phone = phone
  user.email = email
  user.location = location

  pushNotification(userId, 'Financing application submitted', `Your ${car.brand} ${car.model} financing request is now pending admin review.`)
  saveDatabase()

  response.status(201).json({ message: 'Application submitted. Admin review is now pending.', application: decorateApplication(application) })
})

app.post('/api/payment-requests', requireSignedIn, (request, response) => {
  const { carId, type, preferredMethod, requestedAmountUsd } = request.body
  const user = request.actor
  const userId = user.id
  const car = getCar(carId)

  if (!car) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  const validationError = validatePaymentRequest({ type, preferredMethod, requestedAmountUsd })

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  if (type === 'deposit' && Number(requestedAmountUsd) < car.minimumDepositUsd) {
    response.status(400).json({ message: `Minimum deposit for this vehicle is $${car.minimumDepositUsd}.` })
    return
  }

  const activeRequest = paymentRequests.find((entry) => entry.userId === userId && entry.carId === carId && ['Pending Approval', 'Instructions Sent'].includes(entry.status))

  if (activeRequest) {
    response.status(400).json({ message: 'An active payment instruction request already exists for this vehicle.' })
    return
  }

  const paymentRequest = {
    id: nextId('payment-request', paymentRequests),
    userId,
    carId,
    type,
    requestedMethod: preferredMethod,
    approvedMethod: '',
    requestedAmountUsd: Number(requestedAmountUsd),
    approvedAmountUsd: Number(requestedAmountUsd),
    status: 'Pending Approval',
    instructionsTitle: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    referenceCode: '',
    paymentLink: '',
    adminNote: '',
    paymentId: '',
    proofAttachment: null,
    proofUploadedAt: '',
    createdAt: new Date().toISOString(),
    reviewedAt: '',
    confirmedAt: '',
  }

  paymentRequests.unshift(paymentRequest)
  logPaymentEvent({
    paymentRequest,
    eventType: 'payment-request-created',
    provider: preferredMethod,
    status: paymentRequest.status,
    actorType: 'user',
    actorId: userId,
    note: `Buyer requested ${preferredMethod} for ${type}.`,
  })
  pushNotification(userId, 'Payment method submitted', `Your ${preferredMethod.replace('-', ' ')} request for ${car.brand} ${car.model} is waiting for admin instructions.`)
  saveDatabase()

  response.status(201).json({
    message: 'Payment method submitted. Admin will send the deposit instructions shortly.',
    paymentRequest: decoratePaymentRequest(paymentRequest),
  })
})

app.patch('/api/admin/financing-applications/:applicationId', requireAdmin, (request, response) => {
  const { status } = request.body || {}
  const application = financingApplications.find((entry) => entry.id === request.params.applicationId)

  if (!application) {
    response.status(404).json({ message: 'Application not found.' })
    return
  }

  if (!['Approved', 'Rejected', 'Pending Review'].includes(status)) {
    response.status(400).json({ message: 'Invalid application status.' })
    return
  }

  application.status = status
  const car = getCar(application.carId)
  pushNotification(application.userId, `Application ${status.toLowerCase()}`, `Your financing request for ${car.brand} ${car.model} is now ${status.toLowerCase()}.`)
  saveDatabase()

  response.json({ message: 'Application updated.', application: decorateApplication(application) })
})

app.patch('/api/admin/payment-requests/:requestId', requireAdmin, (request, response) => {
  const paymentRequest = paymentRequests.find((entry) => entry.id === request.params.requestId)

  if (!paymentRequest) {
    response.status(404).json({ message: 'Payment request not found.' })
    return
  }

  const payload = request.body || {}
  const validationError = validatePaymentInstructions(payload)

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  paymentRequest.status = payload.status
  paymentRequest.approvedMethod = payload.status === 'Declined' ? '' : payload.approvedMethod
  paymentRequest.approvedAmountUsd = payload.approvedAmountUsd ? Number(payload.approvedAmountUsd) : paymentRequest.requestedAmountUsd
  paymentRequest.instructionsTitle = payload.instructionsTitle || ''
  paymentRequest.bankName = payload.bankName || ''
  paymentRequest.accountName = payload.accountName || ''
  paymentRequest.accountNumber = payload.accountNumber || ''
  paymentRequest.referenceCode = payload.referenceCode || ''
  paymentRequest.paymentLink = payload.paymentLink || ''
  paymentRequest.adminNote = payload.adminNote || ''
  paymentRequest.reviewedAt = new Date().toISOString()
  logPaymentEvent({
    paymentRequest,
    eventType: 'payment-instructions-updated',
    provider: paymentRequest.approvedMethod || paymentRequest.requestedMethod,
    reference: paymentRequest.referenceCode || '',
    status: paymentRequest.status,
    actorType: 'admin',
    actorId: request.actor.id,
    note: paymentRequest.adminNote || 'Payment instructions updated.',
  })

  const car = getCar(paymentRequest.carId)
  pushNotification(
    paymentRequest.userId,
    payload.status === 'Declined' ? 'Payment request declined' : 'Payment instructions ready',
    payload.status === 'Declined'
      ? `The admin team declined your ${paymentRequest.type} request for ${car.brand} ${car.model}.`
      : `Payment instructions for ${car.brand} ${car.model} are now available in your dashboard.`,
  )
  saveDatabase()

  response.json({ message: 'Payment request updated.', paymentRequest: decoratePaymentRequest(paymentRequest) })
})

app.post('/api/payments/paystack/initialize', requireSignedIn, async (request, response) => {
  if (!paystackIsConfigured()) {
    response.status(503).json({ message: 'Paystack is not configured on this server yet.' })
    return
  }

  const { paymentRequestId, carId } = request.body || {}
  const user = request.actor
  const paymentRequest = paymentRequests.find((entry) => entry.id === paymentRequestId)

  if (!paymentRequest || paymentRequest.userId !== user.id || paymentRequest.carId !== carId) {
    response.status(404).json({ message: 'Approved payment request not found.' })
    return
  }

  if (paymentRequest.status !== 'Instructions Sent' || paymentRequest.approvedMethod !== 'payment-link') {
    response.status(400).json({ message: 'This payment request is not ready for Paystack checkout.' })
    return
  }

  const reference = `pstk_${paymentRequest.id}_${Date.now()}`
  const callbackUrl = buildFrontendUrl(
    `/cars/${paymentRequest.carId}?payment=verify&paymentRequestId=${encodeURIComponent(paymentRequest.id)}&reference=${encodeURIComponent(reference)}`,
    request,
  )
  const existingPayment = findPaymentByRequestId(paymentRequest.id)
  const payment = existingPayment && !paymentIsFinalized(existingPayment)
    ? existingPayment
    : createPaymentRecord({
      userId: user.id,
      carId,
      paymentRequestId: paymentRequest.id,
      type: paymentRequest.type,
      method: 'payment-link',
      amountUsd: paymentRequest.approvedAmountUsd || paymentRequest.requestedAmountUsd,
      status: 'Pending Authorization',
      provider: 'paystack',
      providerReference: reference,
    })

  payment.provider = 'paystack'
  payment.providerReference = reference
  payment.status = 'Pending Authorization'

  if (!existingPayment || existingPayment.id !== payment.id) {
    payments.unshift(payment)
  }

  try {
    const initialized = await initializePaystackTransaction({
      email: user.email,
      amountUsd: payment.amountUsd,
      reference,
      callbackUrl,
      metadata: {
        paymentRequestId: paymentRequest.id,
        carId,
        userId: user.id,
        paymentType: paymentRequest.type,
      },
    })

    payment.providerAccessCode = initialized.access_code || ''
    paymentRequest.paymentId = payment.id
    logPaymentEvent({
      payment,
      paymentRequest,
      eventType: 'paystack-initialized',
      provider: 'paystack',
      reference,
      status: payment.status,
      actorType: 'user',
      actorId: user.id,
      note: paystackRunsInMockMode() ? 'Mock Paystack checkout initialized for local testing.' : 'Hosted Paystack checkout initialized.',
    })
    saveDatabase()

    response.status(201).json({
      message: 'Paystack checkout initialized.',
      authorizationUrl: paystackRunsInMockMode() ? callbackUrl : initialized.authorization_url,
      reference,
      payment: { ...payment, car: getCar(payment.carId) },
      publicKeyConfigured: Boolean(PAYSTACK_PUBLIC_KEY),
      mockMode: paystackRunsInMockMode(),
    })
  } catch (error) {
    payment.status = 'Failed'
    payment.adminNote = error.message
    logPaymentEvent({
      payment,
      paymentRequest,
      eventType: 'paystack-initialize-failed',
      provider: 'paystack',
      reference,
      status: payment.status,
      note: error.message,
    })
    saveDatabase()
    response.status(502).json({ message: error.message || 'Unable to start Paystack checkout.' })
  }
})

app.post('/api/payments/paystack/verify', requireSignedIn, async (request, response) => {
  if (!paystackIsConfigured()) {
    response.status(503).json({ message: 'Paystack is not configured on this server yet.' })
    return
  }

  const { paymentRequestId, reference } = request.body || {}
  const user = request.actor
  const paymentRequest = paymentRequests.find((entry) => entry.id === paymentRequestId)
  const payment = findPaymentByRequestId(paymentRequestId)

  if (!paymentRequest || paymentRequest.userId !== user.id || !payment) {
    response.status(404).json({ message: 'Paystack payment record not found.' })
    return
  }

  if (payment.status === 'Confirmed') {
    const confirmed = confirmPayment(payment, paymentRequest, { verifiedAt: payment.verifiedAt || payment.createdAt, providerReference: payment.providerReference })
    saveDatabase()
    response.json({ message: 'Payment already verified.', ...confirmed })
    return
  }

  try {
    const verified = await verifyPaystackTransactionWithFallback(reference || payment.providerReference, payment.amountUsd)

    const confirmed = processPaystackSettlement({
      reference: verified.reference,
      status: verified.status,
      amountMinor: verified.amount,
      paidAt: verified.paid_at || new Date().toISOString(),
    })
    saveDatabase()

    if (!confirmed.receipt) {
      response.status(409).json({ message: `Paystack returned ${verified.status}.`, payment: confirmed.payment, receipt: null })
      return
    }

    response.json({ message: 'Paystack payment verified.', ...confirmed })
  } catch (error) {
    payment.status = 'Pending Verification'
    payment.adminNote = error.message
    paymentRequest.status = 'Pending Verification'
    saveDatabase()
    response.status(502).json({ message: error.message || 'Unable to verify Paystack payment at the moment.' })
  }
})

app.post('/api/payments/paystack/webhook', (request, response) => {
  if (!paystackIsConfigured()) {
    response.status(503).json({ message: 'Paystack is not configured on this server yet.' })
    return
  }

  if (!paystackWebhookSignatureIsValid(request)) {
    if (paystackRunsInMockMode()) {
      response.status(200).json({ message: 'Mock mode ignores webhook signature validation.' })
      return
    }

    response.status(401).json({ message: 'Invalid Paystack webhook signature.' })
    return
  }

  let eventPayload = null

  try {
    eventPayload = JSON.parse(request.body.toString('utf8'))
  } catch {
    response.status(400).json({ message: 'Invalid Paystack webhook payload.' })
    return
  }

  if (eventPayload?.event !== 'charge.success' || !eventPayload?.data?.reference) {
    response.status(200).json({ message: 'Webhook received and ignored.' })
    return
  }

  try {
    const processed = processPaystackSettlement({
      reference: eventPayload.data.reference,
      status: eventPayload.data.status,
      amountMinor: eventPayload.data.amount,
      paidAt: eventPayload.data.paid_at || new Date().toISOString(),
      adminNote: 'Verified by Paystack webhook.',
    })
    logPaymentEvent({
      payment: processed.payment,
      paymentRequest: paymentRequests.find((entry) => entry.id === processed.payment?.paymentRequestId) || null,
      eventType: 'paystack-webhook-processed',
      provider: 'paystack',
      reference: eventPayload.data.reference,
      status: eventPayload.data.status,
      actorType: 'system',
      note: 'Paystack webhook processed successfully.',
    })
    saveDatabase()
    response.status(200).json({ message: 'Webhook processed.' })
  } catch (error) {
    response.status(400).json({ message: error.message || 'Webhook processing failed.' })
  }
})

app.post('/api/payments', requireSignedIn, (request, response) => {
  const { carId, method, amountUsd, type = 'deposit', paymentRequestId, proofAttachment } = request.body
  const user = request.actor
  const userId = user.id
  const paymentRequest = paymentRequests.find((entry) => entry.id === paymentRequestId)

  const resolvedCarId = paymentRequest?.carId || carId
  const car = getCar(resolvedCarId)

  if (!car) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  if (!paymentRequest || paymentRequest.userId !== userId || paymentRequest.carId !== carId) {
    response.status(400).json({ message: 'Request payment instructions first before recording a deposit.' })
    return
  }

  if (paymentRequest.status !== 'Instructions Sent') {
    response.status(400).json({ message: 'Admin payment instructions must be sent before this payment can be recorded.' })
    return
  }

  if (paymentRequest.type !== type || paymentRequest.approvedMethod !== method) {
    response.status(400).json({ message: 'Use the admin-approved payment method and payment type for this deposit.' })
    return
  }

  if (Number(amountUsd) !== Number(paymentRequest.approvedAmountUsd || paymentRequest.requestedAmountUsd)) {
    response.status(400).json({ message: 'The payment amount must match the approved payment instructions.' })
    return
  }

  if (!method || !amountUsd) {
    response.status(400).json({ message: 'Payment method and amount are required.' })
    return
  }

  if (['bank-transfer', 'wire-transfer'].includes(method)) {
    const proofValidationError = validateProofAttachment(proofAttachment)

    if (proofValidationError) {
      response.status(400).json({ message: proofValidationError })
      return
    }
  }

  const payment = createPaymentRecord({
    userId,
    carId: resolvedCarId,
    paymentRequestId,
    type,
    method,
    amountUsd,
    proofAttachment: proofAttachment || null,
    status: paymentNeedsManualVerification(method) ? 'Pending Verification' : 'Confirmed',
  })
  payments.unshift(payment)
  paymentRequest.paymentId = payment.id
  paymentRequest.proofAttachment = proofAttachment || null
  paymentRequest.proofUploadedAt = payment.proofUploadedAt
  logPaymentEvent({
    payment,
    paymentRequest,
    eventType: 'payment-submitted',
    provider: method,
    reference: payment.providerReference || paymentRequest.referenceCode || '',
    status: payment.status,
    actorType: 'user',
    actorId: userId,
    note: paymentNeedsManualVerification(method) ? 'Buyer uploaded proof for manual verification.' : 'Payment recorded from approved instructions.',
  })

  if (paymentNeedsManualVerification(method)) {
    paymentRequest.status = 'Pending Verification'
    pushNotification(userId, 'Payment submitted for verification', `Your ${type} payment proof for ${car.brand} ${car.model} is pending admin verification.`)
  } else {
    const confirmed = confirmPayment(payment, paymentRequest, { verifiedAt: payment.createdAt })
    pushNotification(userId, 'Payment received', `Receipt ${confirmed.receipt.receiptNumber} was generated for your ${type} payment on ${car.brand} ${car.model}.`)
  }

  saveDatabase()

  response.status(201).json(payment.status === 'Confirmed'
    ? {
      message: 'Payment recorded and receipt generated.',
      payment: { ...payment, car },
      receipt: { receiptNumber: payment.receiptNumber, amountUsd: payment.amountUsd, method: payment.method, issuedAt: payment.verifiedAt || payment.createdAt },
    }
    : {
      message: 'Payment proof uploaded. Admin verification is now pending.',
      payment: { ...payment, car },
      receipt: null,
    })
})

app.patch('/api/admin/payments/:paymentId', requireAdmin, (request, response) => {
  const payment = payments.find((entry) => entry.id === request.params.paymentId)

  if (!payment) {
    response.status(404).json({ message: 'Payment not found.' })
    return
  }

  const paymentRequest = paymentRequests.find((entry) => entry.id === payment.paymentRequestId)

  if (!paymentRequest) {
    response.status(404).json({ message: 'Linked payment request not found.' })
    return
  }

  const { status, adminNote = '' } = request.body || {}

  if (!['Pending Verification', 'Confirmed', 'Declined', 'Failed'].includes(status)) {
    response.status(400).json({ message: 'Invalid payment status.' })
    return
  }

  if (status === 'Confirmed') {
    const confirmed = confirmPayment(payment, paymentRequest, {
      adminNote,
      verifiedAt: new Date().toISOString(),
      actorType: 'admin',
      actorId: request.actor.id,
    })
    pushNotification(payment.userId, 'Payment confirmed', `Receipt ${confirmed.receipt.receiptNumber} was issued for ${getCar(payment.carId).brand} ${getCar(payment.carId).model}.`)
    saveDatabase()
    response.json({ message: 'Payment confirmed.', ...confirmed })
    return
  }

  failPayment(payment, paymentRequest, status, adminNote)
  pushNotification(payment.userId, `Payment ${status.toLowerCase()}`, `Your payment for ${getCar(payment.carId).brand} ${getCar(payment.carId).model} is now ${status.toLowerCase()}.`)
  saveDatabase()
  response.json({ message: `Payment ${status.toLowerCase()}.`, payment: { ...payment, car: getCar(payment.carId) }, paymentRequest: decoratePaymentRequest(paymentRequest) })
})

app.post('/api/delivery-requests', requireSignedIn, (request, response) => {
  const { carId, address, trigger } = request.body
  const car = getCar(carId)
  const user = request.actor
  const userId = user.id

  if (!car) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  if (!address || !trigger) {
    response.status(400).json({ message: 'Delivery address and eligibility trigger are required.' })
    return
  }

  const hasConfirmedDeposit = payments.some((payment) => payment.userId === userId && payment.carId === carId && payment.type === 'deposit' && payment.status === 'Confirmed')
  const hasApprovedLoan = financingApplications.some((application) => application.userId === userId && application.carId === carId && application.status === 'Approved')

  if ((trigger === 'deposit' && !hasConfirmedDeposit) || (trigger === 'approved-loan' && !hasApprovedLoan)) {
    response.status(400).json({ message: 'Delivery can only be requested after a confirmed deposit or approved financing.' })
    return
  }

  const deliveryRequest = { id: nextId('delivery', deliveryRequests), userId, carId, trigger, address, feeUsd: car.delivery.feeUsd, eta: car.delivery.eta, status: 'Pending Dispatch', createdAt: new Date().toISOString() }
  deliveryRequests.unshift(deliveryRequest)
  pushNotification(userId, 'Delivery request created', `Delivery is now pending dispatch for ${car.brand} ${car.model}.`)
  saveDatabase()

  response.status(201).json({ message: 'Delivery request received. Dispatch review is pending.', deliveryRequest: { ...deliveryRequest, car } })
})

app.post('/api/service-requests', requireSignedIn, (request, response) => {
  const { type, title, fullName, email, phone, location, assetDetails, desiredOutcome, budgetUsd, notes } = request.body
  const user = request.actor
  const userId = user.id

  const validationError = validateServiceRequest({ type, title, fullName, email, phone, location, assetDetails, desiredOutcome })

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  const serviceRequest = {
    id: nextId('service', serviceRequests),
    userId,
    type,
    status: 'New',
    title,
    fullName,
    email,
    phone,
    location,
    assetDetails,
    desiredOutcome,
    budgetUsd: budgetUsd ? Number(budgetUsd) : null,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  }

  serviceRequests.unshift(serviceRequest)
  user.fullName = fullName
  user.email = email
  user.phone = phone
  user.location = location

  pushNotification(userId, 'Service request submitted', `Your ${type.replace('-', ' ')} brief is now with the client services desk.`)
  saveDatabase()

  response.status(201).json({
    message: 'Service request submitted. The client services desk will review it shortly.',
    serviceRequest: decorateServiceRequest(serviceRequest),
  })
})

app.post('/api/rental-requests', requireSignedIn, (request, response) => {
  const {
    carId,
    fullName,
    email,
    phone,
    pickupLocation,
    dropoffLocation,
    pickupDate,
    returnDate,
    driverLicenseNumber,
    chauffeurRequired,
    notes,
  } = request.body || {}
  const user = request.actor
  const car = getCar(carId)

  if (!car) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  if (!car.rentable) {
    response.status(400).json({ message: 'This vehicle is not currently available for rent.' })
    return
  }

  const validationError = validateRentalRequest({
    fullName,
    email,
    phone,
    pickupLocation,
    dropoffLocation,
    pickupDate,
    returnDate,
    driverLicenseNumber,
  })

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  const minimumRentalDays = Number(car.rentalTerms?.minimumDays || 1)
  const rentalDays = Math.ceil((Date.parse(returnDate) - Date.parse(pickupDate)) / (1000 * 60 * 60 * 24))

  if (rentalDays < minimumRentalDays) {
    response.status(400).json({ message: `Minimum rental duration for this vehicle is ${minimumRentalDays} day${minimumRentalDays === 1 ? '' : 's'}.` })
    return
  }

  const activeRequest = rentalRequests.find(
    (entry) => entry.userId === user.id && entry.carId === car.id && !['Closed', 'Declined'].includes(entry.status),
  )

  if (activeRequest) {
    response.status(400).json({ message: 'An active rental request already exists for this vehicle.' })
    return
  }

  const rentalRequest = {
    id: nextId('rental', rentalRequests),
    userId: user.id,
    carId: car.id,
    fullName,
    email,
    phone,
    pickupLocation,
    dropoffLocation,
    pickupDate,
    returnDate,
    driverLicenseNumber,
    chauffeurRequired: Boolean(chauffeurRequired),
    notes: notes || '',
    adminNote: '',
    contactEmail: '',
    contactPhone: '',
    status: 'Pending Review',
    createdAt: new Date().toISOString(),
    reviewedAt: '',
  }

  rentalRequests.unshift(rentalRequest)
  user.fullName = fullName
  user.email = email
  user.phone = phone
  user.location = pickupLocation

  pushNotification(user.id, 'Rental request submitted', `Your rental request for ${car.brand} ${car.model} is waiting for review.`)
  saveDatabase()

  response.status(201).json({
    message: 'Rental request submitted. The rental desk will review it shortly.',
    rentalRequest: decorateRentalRequest(rentalRequest),
  })
})

app.patch('/api/admin/service-requests/:requestId', requireAdmin, (request, response) => {
  const { status } = request.body || {}
  const serviceRequest = serviceRequests.find((entry) => entry.id === request.params.requestId)

  if (!serviceRequest) {
    response.status(404).json({ message: 'Service request not found.' })
    return
  }

  if (!['New', 'Reviewing brief', 'Client contacted', 'Sourcing in progress', 'Closed'].includes(status)) {
    response.status(400).json({ message: 'Invalid service request status.' })
    return
  }

  serviceRequest.status = status
  pushNotification(serviceRequest.userId, 'Service request updated', `Your ${serviceRequest.type.replace('-', ' ')} brief is now marked ${status.toLowerCase()}.`)
  saveDatabase()

  response.json({ message: 'Service request updated.', serviceRequest: decorateServiceRequest(serviceRequest) })
})

app.patch('/api/admin/rental-requests/:requestId', requireAdmin, (request, response) => {
  const { status, adminNote, contactEmail, contactPhone } = request.body || {}
  const rentalRequest = rentalRequests.find((entry) => entry.id === request.params.requestId)

  if (!rentalRequest) {
    response.status(404).json({ message: 'Rental request not found.' })
    return
  }

  const validationError = validateRentalReview({ status, adminNote, contactEmail, contactPhone })

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  rentalRequest.status = status
  rentalRequest.adminNote = adminNote || ''
  rentalRequest.contactEmail = contactEmail || ''
  rentalRequest.contactPhone = contactPhone || ''
  rentalRequest.reviewedAt = new Date().toISOString()

  const car = getCar(rentalRequest.carId)
  pushNotification(
    rentalRequest.userId,
    'Rental request updated',
    `Your rental request for ${car.brand} ${car.model} is now ${status.toLowerCase()}.`,
  )
  saveDatabase()

  response.json({ message: 'Rental request updated.', rentalRequest: decorateRentalRequest(rentalRequest) })
})

app.post('/api/admin/cars', requireAdmin, (request, response) => {
  const payload = request.body

  if (!payload.brand || !payload.model || !payload.location || !payload.priceUsd || !payload.minimumDepositUsd) {
    response.status(400).json({ message: 'Brand, model, location, price, and deposit are required.' })
    return
  }

  const record = createCarRecord({ ...payload, catalogManaged: false, id: `${String(payload.brand).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, gallery: payload.gallery?.filter(Boolean) || [payload.heroImage].filter(Boolean), features: payload.features?.filter(Boolean) || [], highlights: payload.highlights?.filter(Boolean) || [], paymentTypes: payload.paymentTypes?.length ? payload.paymentTypes : ['full', 'installment'] })
  cars.unshift(record)
  refreshMetaCollections()
  saveDatabase()

  response.status(201).json({ message: 'Vehicle created.', car: record })
})

app.put('/api/admin/cars/:carId', requireAdmin, (request, response) => {
  const index = cars.findIndex((car) => car.id === request.params.carId)

  if (index === -1) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  const previous = cars[index]
  const payload = request.body
  cars[index] = createCarRecord({ ...previous, ...payload, catalogManaged: false, id: previous.id, gallery: payload.gallery?.filter(Boolean) || previous.gallery, features: payload.features?.filter(Boolean) || previous.features, highlights: payload.highlights?.filter(Boolean) || previous.highlights, paymentTypes: payload.paymentTypes?.length ? payload.paymentTypes : previous.paymentTypes })
  refreshMetaCollections()
  saveDatabase()

  response.json({ message: 'Vehicle updated.', car: cars[index] })
})

app.delete('/api/admin/cars/:carId', requireAdmin, (request, response) => {
  const index = cars.findIndex((car) => car.id === request.params.carId)

  if (index === -1) {
    response.status(404).json({ message: 'Vehicle not found.' })
    return
  }

  cars.splice(index, 1)
  refreshMetaCollections()
  saveDatabase()
  response.json({ message: 'Vehicle removed.' })
})

app.delete('/api/admin/users/:userId', requireAdmin, (request, response) => {
  const index = users.findIndex((user) => user.id === request.params.userId)

  if (index === -1) {
    response.status(404).json({ message: 'User not found.' })
    return
  }

  const user = users[index]

  if (user.role === 'admin') {
    response.status(400).json({ message: 'Admin accounts cannot be removed from the dashboard.' })
    return
  }

  if (request.actor.id === user.id) {
    response.status(400).json({ message: 'You cannot delete the account currently signed in as admin.' })
    return
  }

  users.splice(index, 1)

  for (let currentIndex = financingApplications.length - 1; currentIndex >= 0; currentIndex -= 1) {
    if (financingApplications[currentIndex].userId === user.id) {
      financingApplications.splice(currentIndex, 1)
    }
  }

  for (let currentIndex = payments.length - 1; currentIndex >= 0; currentIndex -= 1) {
    if (payments[currentIndex].userId === user.id) {
      payments.splice(currentIndex, 1)
    }
  }

  for (let currentIndex = paymentRequests.length - 1; currentIndex >= 0; currentIndex -= 1) {
    if (paymentRequests[currentIndex].userId === user.id) {
      paymentRequests.splice(currentIndex, 1)
    }
  }

  for (let currentIndex = deliveryRequests.length - 1; currentIndex >= 0; currentIndex -= 1) {
    if (deliveryRequests[currentIndex].userId === user.id) {
      deliveryRequests.splice(currentIndex, 1)
    }
  }

  for (let currentIndex = serviceRequests.length - 1; currentIndex >= 0; currentIndex -= 1) {
    if (serviceRequests[currentIndex].userId === user.id) {
      serviceRequests.splice(currentIndex, 1)
    }
  }

  for (let currentIndex = rentalRequests.length - 1; currentIndex >= 0; currentIndex -= 1) {
    if (rentalRequests[currentIndex].userId === user.id) {
      rentalRequests.splice(currentIndex, 1)
    }
  }

  saveDatabase()

  response.json({ message: 'User and related records removed.' })
})

app.listen(PORT, () => {
  console.log(`Prestige Motors API listening on port ${PORT}`)
})
