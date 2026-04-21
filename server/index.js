const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const {
  nextId,
  createCarRecord,
  createUserRecord,
  getCountrySettings,
  attachVehicleDisplayMedia,
} = require('./data/store')
const {
  cars,
  users,
  financingApplications,
  payments,
  paymentRequests,
  deliveryRequests,
  serviceRequests,
  meta,
  refreshMetaCollections,
  saveDatabase,
} = require('./data/database')

const app = express()
const PORT = process.env.PORT || 4000
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || ''

app.use(cors({
  origin(origin, callback) {
    if (!FRONTEND_ORIGIN || !origin || origin === FRONTEND_ORIGIN) {
      callback(null, true)
      return
    }

    callback(new Error('Origin not allowed by CORS'))
  },
}))
app.use(express.json({ limit: '8mb' }))

const PASSWORD_SALT_ROUNDS = 10

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

const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  const { password, ...safeUser } = user
  return { ...safeUser, countrySettings: getCountrySettings(safeUser.country) }
}

const decorateCar = (car) => attachVehicleDisplayMedia(car)
const getUser = (userId) => users.find((entry) => entry.id === userId)
const getCar = (carId) => decorateCar(cars.find((car) => car.id === carId))
const findUserByEmail = (email) => users.find((entry) => entry.email.toLowerCase() === String(email).toLowerCase())
const getActor = (request) => getUser(request.headers['x-user-id'])

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
    notifications: [...user.notifications].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  }
}

const buildAdminDashboard = () => ({
  stats: {
    totalCars: cars.length,
    totalUsers: users.filter((user) => user.role !== 'admin').length,
    activeApplications: financingApplications.filter((item) => item.status === 'Pending Review').length,
    confirmedPayments: payments.filter((item) => item.status === 'Confirmed').length,
    pendingPaymentRequests: paymentRequests.filter((item) => item.status === 'Pending Approval').length,
    openServiceRequests: serviceRequests.filter((item) => item.status !== 'Closed').length,
  },
  cars: cars.map(decorateCar),
  users: users.map(sanitizeUser),
  applications: financingApplications.map(decorateApplication).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  payments: payments.map((payment) => ({ ...payment, car: getCar(payment.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  paymentRequests: paymentRequests.map(decoratePaymentRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  deliveryRequests: deliveryRequests.map((request) => ({ ...request, car: getCar(request.carId) })).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  serviceRequests: serviceRequests.map(decorateServiceRequest).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
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
    return 'Provide the payment link before sending instructions.'
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

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' })
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

  response.status(201).json({ message: 'Account created successfully.', user: sanitizeUser(user) })
})

app.post('/api/auth/login', (request, response) => {
  const { email, password } = request.body
  const user = findUserByEmail(email)

  if (!user || !verifyPassword(password, user.password)) {
    response.status(401).json({ message: 'Invalid email or password.' })
    return
  }

  response.json({ message: 'Login successful.', user: sanitizeUser(user) })
})

app.get('/api/cars', (request, response) => {
  const { brand, location, paymentType, minPrice, maxPrice } = request.query

  const filteredCars = cars.filter((car) => {
    if (brand && brand !== 'All' && car.brand !== brand) return false
    if (location && location !== 'All' && car.location !== location) return false
    if (paymentType && paymentType !== 'All' && !car.paymentTypes.includes(paymentType)) return false
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

app.post('/api/favorites', (request, response) => {
  const { userId, carId } = request.body
  const user = getUser(userId)

  if (!user) {
    response.status(401).json({ message: 'Please create an account or log in first.' })
    return
  }

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

app.post('/api/financing-applications', (request, response) => {
  const { userId, carId, fullName, phone, email, incomeUsd, location, depositUsd, months } = request.body
  const car = getCar(carId)
  const user = getUser(userId)

  if (!user) {
    response.status(401).json({ message: 'Please create an account or log in before applying.' })
    return
  }

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

  const payment = {
    id: nextId('pay', payments),
    userId,
    carId: resolvedCarId,
    type,
    method,
    amountUsd: Number(amountUsd),
    createdAt: new Date().toISOString(),
    receiptNumber: `RCPT-${Date.now()}`,
    status: 'Confirmed',
    proofAttachment: proofAttachment || null,
    proofUploadedAt: proofAttachment ? new Date().toISOString() : '',
  }
  payments.unshift(payment)
  paymentRequest.status = 'Confirmed'
  paymentRequest.paymentId = payment.id
  paymentRequest.confirmedAt = payment.createdAt
  paymentRequest.proofAttachment = proofAttachment || null
  paymentRequest.proofUploadedAt = proofAttachment ? payment.createdAt : ''
  pushNotification(userId, 'Payment received', `Receipt ${payment.receiptNumber} was generated for your ${type} payment on ${car.brand} ${car.model}.`)
  saveDatabase()

  response.status(201).json({
    message: 'Payment recorded and receipt generated.',
    payment: { ...payment, car },
    receipt: { receiptNumber: payment.receiptNumber, amountUsd: payment.amountUsd, method: payment.method, issuedAt: payment.createdAt },
  })
})

app.post('/api/delivery-requests', (request, response) => {
  const { userId, carId, address, trigger } = request.body
  const car = getCar(carId)
  const user = getUser(userId)

  if (!user) {
    response.status(401).json({ message: 'Please create an account or log in before requesting delivery.' })
    return
  }

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

app.post('/api/service-requests', (request, response) => {
  const { userId, type, title, fullName, email, phone, location, assetDetails, desiredOutcome, budgetUsd, notes } = request.body
  const user = getUser(userId)

  if (!user) {
    response.status(401).json({ message: 'Please create an account or log in before submitting a service request.' })
    return
  }

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

app.post('/api/admin/cars', requireAdmin, (request, response) => {
  const payload = request.body

  if (!payload.brand || !payload.model || !payload.location || !payload.priceUsd || !payload.minimumDepositUsd) {
    response.status(400).json({ message: 'Brand, model, location, price, and deposit are required.' })
    return
  }

  const record = createCarRecord({ ...payload, id: `${String(payload.brand).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, gallery: payload.gallery?.filter(Boolean) || [payload.heroImage].filter(Boolean), features: payload.features?.filter(Boolean) || [], highlights: payload.highlights?.filter(Boolean) || [], paymentTypes: payload.paymentTypes?.length ? payload.paymentTypes : ['full', 'installment'] })
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
  cars[index] = createCarRecord({ ...previous, ...payload, id: previous.id, gallery: payload.gallery?.filter(Boolean) || previous.gallery, features: payload.features?.filter(Boolean) || previous.features, highlights: payload.highlights?.filter(Boolean) || previous.highlights, paymentTypes: payload.paymentTypes?.length ? payload.paymentTypes : previous.paymentTypes })
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

  saveDatabase()

  response.json({ message: 'User and related records removed.' })
})

app.listen(PORT, () => {
  console.log(`Prestige Motors API listening on port ${PORT}`)
})
