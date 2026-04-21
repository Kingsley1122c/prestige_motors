import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { convertUsdToLocal } from '../utils/format'

const SESSION_STORAGE_KEY = 'prestige-market-session'
const MarketContext = createContext(null)
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path) => {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${API_BASE_URL}${path}`
}

const emptyUserDashboard = {
  profile: null,
  favoriteCars: [],
  applications: [],
  payments: [],
  paymentRequests: [],
  deliveryRequests: [],
  serviceRequests: [],
  notifications: [],
}

const emptyAdminDashboard = {
  stats: {},
  cars: [],
  users: [],
  applications: [],
  payments: [],
  paymentRequests: [],
  deliveryRequests: [],
  serviceRequests: [],
}

const requestJson = async (path, options = {}) => {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(response.ok ? 'Received an unexpected response from the server.' : 'The server returned an invalid response.')
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong.')
  }

  return data
}

const readStoredSession = () => {
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored)
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function MarketProvider({ children }) {
  const [cars, setCars] = useState([])
  const [meta, setMeta] = useState({
    brands: [],
    locations: [],
    paymentTypes: [],
    testimonials: [],
    faqs: [],
    company: {},
    policies: {},
    countries: [],
    defaultCountry: 'US',
  })
  const [currentUser, setCurrentUser] = useState(() => readStoredSession())
  const [userDashboard, setUserDashboard] = useState(emptyUserDashboard)
  const [adminDashboard, setAdminDashboard] = useState(emptyAdminDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState('')
  const [lastReceipt, setLastReceipt] = useState(null)

  const isAuthenticated = Boolean(currentUser?.id)
  const isAdmin = currentUser?.role === 'admin'

  const authHeaders = useMemo(
    () => (currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
    [currentUser],
  )

  const ensureSignedIn = useCallback(() => {
    if (!currentUser?.id) {
      throw new Error('Please log in or create an account to continue.')
    }
  }, [currentUser?.id])

  const ensureAdmin = useCallback(() => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Admin credentials are required for this action.')
    }
  }, [currentUser?.role])

  const refreshCarsMeta = useCallback(async () => {
    const [carsData, metaData] = await Promise.all([requestJson('/api/cars'), requestJson('/api/meta')])
    setCars(carsData.cars)
    setMeta(metaData)
  }, [])

  const refreshDashboards = useCallback(async () => {
    if (!currentUser?.id) {
      setUserDashboard(emptyUserDashboard)
      setAdminDashboard(emptyAdminDashboard)
      return
    }

    const requests = [
      requestJson(`/api/dashboard/user/${currentUser.id}`, { headers: authHeaders }),
    ]

    if (currentUser.role === 'admin') {
      requests.push(requestJson('/api/dashboard/admin', { headers: authHeaders }))
    }

    const [userData, adminData] = await Promise.all(requests)
    setUserDashboard(userData)
    setAdminDashboard(adminData || emptyAdminDashboard)
  }, [authHeaders, currentUser])

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([refreshCarsMeta(), refreshDashboards()])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [refreshCarsMeta, refreshDashboards])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser))
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [currentUser])

  useEffect(() => {
    if (!flash) {
      return undefined
    }

    const timer = window.setTimeout(() => setFlash(''), 4200)
    return () => window.clearTimeout(timer)
  }, [flash])

  const runMutation = useCallback(async (task, successMessage) => {
    setSubmitting(true)
    setError('')

    try {
      const result = await task()
      if (successMessage) {
        setFlash(successMessage)
      }
      return result
    } catch (mutationError) {
      setError(mutationError.message)
      throw mutationError
    } finally {
      setSubmitting(false)
    }
  }, [])

  const login = useCallback(
    async (payload) =>
      runMutation(async () => {
        const result = await requestJson('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setCurrentUser(result.user)
        return result
      }, 'Login successful.'),
    [runMutation],
  )

  const register = useCallback(
    async (payload) =>
      runMutation(async () => {
        const result = await requestJson('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setCurrentUser(result.user)
        return result
      }, 'Account created successfully.'),
    [runMutation],
  )

  const logout = useCallback(() => {
    setCurrentUser(null)
    setLastReceipt(null)
    setUserDashboard(emptyUserDashboard)
    setAdminDashboard(emptyAdminDashboard)
    setFlash('You have been logged out.')
  }, [])

  const toggleFavorite = useCallback(
    async (carId) =>
      runMutation(async () => {
        ensureSignedIn()
        const result = await requestJson('/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ userId: currentUser.id, carId }),
        })
        setUserDashboard(result)

        if (isAdmin) {
          const adminData = await requestJson('/api/dashboard/admin', { headers: authHeaders })
          setAdminDashboard(adminData)
        }

        return result
      }, 'Favorites updated.'),
    [authHeaders, currentUser, ensureSignedIn, isAdmin, runMutation],
  )

  const applyForFinancing = useCallback(
    async (payload) =>
      runMutation(async () => {
        ensureSignedIn()
        const result = await requestJson('/api/financing-applications', {
          method: 'POST',
          body: JSON.stringify({ ...payload, userId: currentUser.id }),
        })
        await refreshDashboards()
        return result
      }, 'Financing application submitted.'),
    [currentUser, ensureSignedIn, refreshDashboards, runMutation],
  )

  const requestPaymentInstructions = useCallback(
    async (payload) =>
      runMutation(async () => {
        ensureSignedIn()
        const result = await requestJson('/api/payment-requests', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        })
        await refreshDashboards()
        return result
      }, 'Payment method submitted for admin approval.'),
    [authHeaders, ensureSignedIn, refreshDashboards, runMutation],
  )

  const createPayment = useCallback(
    async (payload) =>
      runMutation(async () => {
        ensureSignedIn()
        const result = await requestJson('/api/payments', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        })
        setLastReceipt(result.receipt)
        await refreshDashboards()
        return result
      }, 'Payment recorded and receipt generated.'),
    [authHeaders, ensureSignedIn, refreshDashboards, runMutation],
  )

  const requestDelivery = useCallback(
    async (payload) =>
      runMutation(async () => {
        ensureSignedIn()
        const result = await requestJson('/api/delivery-requests', {
          method: 'POST',
          body: JSON.stringify({ ...payload, userId: currentUser.id }),
        })
        await refreshDashboards()
        return result
      }, 'Delivery request submitted.'),
    [currentUser, ensureSignedIn, refreshDashboards, runMutation],
  )

  const submitServiceRequest = useCallback(
    async (payload) =>
      runMutation(async () => {
        ensureSignedIn()
        const result = await requestJson('/api/service-requests', {
          method: 'POST',
          body: JSON.stringify({ ...payload, userId: currentUser.id }),
        })
        await refreshDashboards()
        return result
      }, 'Service request submitted.'),
    [currentUser, ensureSignedIn, refreshDashboards, runMutation],
  )

  const updateApplicationStatus = useCallback(
    async (applicationId, status) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson(`/api/admin/financing-applications/${applicationId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ status }),
        })
        await refreshDashboards()
        return result
      }, `Application ${status.toLowerCase()}.`),
    [authHeaders, ensureAdmin, refreshDashboards, runMutation],
  )

  const updateServiceRequestStatus = useCallback(
    async (requestId, status) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson(`/api/admin/service-requests/${requestId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ status }),
        })
        await refreshDashboards()
        return result
      }, `Service request ${status.toLowerCase()}.`),
    [authHeaders, ensureAdmin, refreshDashboards, runMutation],
  )

  const updatePaymentRequestInstructions = useCallback(
    async (requestId, payload) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson(`/api/admin/payment-requests/${requestId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify(payload),
        })
        await refreshDashboards()
        return result
      }, 'Payment instructions updated.'),
    [authHeaders, ensureAdmin, refreshDashboards, runMutation],
  )

  const addCar = useCallback(
    async (payload) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson('/api/admin/cars', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        })
        await Promise.all([refreshCarsMeta(), refreshDashboards()])
        return result
      }, 'Vehicle listing created.'),
    [authHeaders, ensureAdmin, refreshCarsMeta, refreshDashboards, runMutation],
  )

  const updateCar = useCallback(
    async (carId, payload) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson(`/api/admin/cars/${carId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        })
        await Promise.all([refreshCarsMeta(), refreshDashboards()])
        return result
      }, 'Vehicle listing updated.'),
    [authHeaders, ensureAdmin, refreshCarsMeta, refreshDashboards, runMutation],
  )

  const deleteCar = useCallback(
    async (carId) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson(`/api/admin/cars/${carId}`, {
          method: 'DELETE',
          headers: authHeaders,
        })
        await Promise.all([refreshCarsMeta(), refreshDashboards()])
        return result
      }, 'Vehicle listing removed.'),
    [authHeaders, ensureAdmin, refreshCarsMeta, refreshDashboards, runMutation],
  )

  const deleteUser = useCallback(
    async (userId) =>
      runMutation(async () => {
        ensureAdmin()
        const result = await requestJson(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: authHeaders,
        })
        await refreshDashboards()
        return result
      }, 'User removed from the admin dashboard.'),
    [authHeaders, ensureAdmin, refreshDashboards, runMutation],
  )

  const favoriteIds = useMemo(() => new Set(userDashboard.favoriteCars.map((car) => car.id)), [userDashboard.favoriteCars])
  const featuredCars = useMemo(() => [...cars].sort((first, second) => second.priceUsd - first.priceUsd).slice(0, 3), [cars])
  const selectedCountry = useMemo(() => {
    const countries = Array.isArray(meta.countries) ? meta.countries : []
    const preferredCode = currentUser?.country || meta.defaultCountry || 'US'
    return countries.find((country) => country.code === preferredCode) || countries[0] || { code: 'US', name: 'United States', currencyCode: 'USD', locale: 'en-US', exchangeRate: 1 }
  }, [currentUser?.country, meta.countries, meta.defaultCountry])

  const getLocalizedPrice = useCallback(
    (usdAmount) => ({
      amount: convertUsdToLocal(usdAmount, selectedCountry.exchangeRate),
      currencyCode: selectedCountry.currencyCode,
      locale: selectedCountry.locale,
      countryName: selectedCountry.name,
    }),
    [selectedCountry],
  )

  const value = useMemo(() => ({
    cars,
    meta,
    currentUser,
    isAuthenticated,
    isAdmin,
    selectedCountry,
    userDashboard,
    adminDashboard,
    loading,
    error,
    submitting,
    flash,
    lastReceipt,
    featuredCars,
    favoriteIds,
    getLocalizedPrice,
    reload: loadInitialData,
    login,
    register,
    logout,
    toggleFavorite,
    applyForFinancing,
    requestPaymentInstructions,
    createPayment,
    requestDelivery,
    submitServiceRequest,
    addCar,
    updateCar,
    deleteCar,
    deleteUser,
    updateApplicationStatus,
    updatePaymentRequestInstructions,
    updateServiceRequestStatus,
    clearFlash: () => setFlash(''),
  }), [adminDashboard, addCar, applyForFinancing, cars, createPayment, currentUser, deleteCar, deleteUser, error, favoriteIds, featuredCars, flash, getLocalizedPrice, isAdmin, isAuthenticated, lastReceipt, loadInitialData, loading, login, logout, meta, register, requestDelivery, requestPaymentInstructions, selectedCountry, submitServiceRequest, submitting, toggleFavorite, updateApplicationStatus, updateCar, updatePaymentRequestInstructions, updateServiceRequestStatus, userDashboard])

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export const useMarket = () => {
  const context = useContext(MarketContext)

  if (!context) {
    throw new Error('useMarket must be used inside MarketProvider.')
  }

  return context
}
