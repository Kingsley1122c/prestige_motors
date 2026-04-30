const isBrowser = typeof window !== 'undefined'

const metaPixelId = import.meta.env.VITE_META_PIXEL_ID?.trim()
const tikTokPixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID?.trim()
const googleTagId = import.meta.env.VITE_GOOGLE_TAG_ID?.trim()
const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID?.trim()

let initialized = false

const loadScriptOnce = (id, source) => {
  if (!isBrowser || document.getElementById(id)) {
    return
  }

  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = source
  document.head.appendChild(script)
}

const ensureMetaPixel = () => {
  if (!isBrowser || !metaPixelId || window.fbq) {
    return
  }

  window.fbq = function fbqProxy(...args) {
    if (window.fbq.callMethod) {
      window.fbq.callMethod(...args)
      return
    }

    window.fbq.queue.push(args)
  }

  window.fbq.push = window.fbq
  window.fbq.loaded = true
  window.fbq.version = '2.0'
  window.fbq.queue = []

  loadScriptOnce('meta-pixel-script', 'https://connect.facebook.net/en_US/fbevents.js')
  window.fbq('init', metaPixelId)
}

const ensureTikTokPixel = () => {
  if (!isBrowser || !tikTokPixelId || window.ttq) {
    return
  }

  const ttq = []
  ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
  ttq.setAndDefer = (target, method) => {
    target[method] = (...args) => {
      target.push([method, ...args])
    }
  }

  for (const method of ttq.methods) {
    ttq.setAndDefer(ttq, method)
  }

  ttq.load = (pixelId) => {
    ttq._pixelId = pixelId
    loadScriptOnce('tiktok-pixel-script', `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`)
  }

  ttq.load(tikTokPixelId)
  window.ttq = ttq
}

const ensureGoogleTag = () => {
  if (!isBrowser || (!googleTagId && !googleAdsId)) {
    return
  }

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtagProxy() {
    window.dataLayer.push(arguments)
  }

  const primaryTagId = googleTagId || googleAdsId
  loadScriptOnce('google-tag-script', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryTagId)}`)
  window.gtag('js', new Date())

  if (googleTagId) {
    window.gtag('config', googleTagId, { send_page_view: false })
  }

  if (googleAdsId) {
    window.gtag('config', googleAdsId, { send_page_view: false })
  }
}

export const initializeMarketing = () => {
  if (initialized || !isBrowser) {
    return
  }

  ensureMetaPixel()
  ensureTikTokPixel()
  ensureGoogleTag()
  initialized = true
}

export const marketingIsConfigured = () => Boolean(metaPixelId || tikTokPixelId || googleTagId || googleAdsId)

const trackMetaEvent = (name, payload) => {
  if (metaPixelId && window.fbq) {
    window.fbq('track', name, payload)
  }
}

const trackTikTokEvent = (name, payload) => {
  if (tikTokPixelId && window.ttq?.track) {
    window.ttq.track(name, payload)
  }
}

const trackGoogleEvent = (name, payload) => {
  if ((googleTagId || googleAdsId) && window.gtag) {
    window.gtag('event', name, payload)
  }
}

export const trackPageView = ({ path, title }) => {
  trackMetaEvent('PageView')
  trackTikTokEvent('PageView', { page: path })
  trackGoogleEvent('page_view', {
    page_location: isBrowser ? window.location.href : path,
    page_path: path,
    page_title: title,
  })
}

export const trackLead = ({ contentName, contentCategory, value, currency = 'USD' }) => {
  const payload = {
    content_name: contentName,
    content_category: contentCategory,
    value,
    currency,
  }

  trackMetaEvent('Lead', payload)
  trackTikTokEvent('SubmitForm', payload)
  trackGoogleEvent('generate_lead', payload)
}

export const trackPurchase = ({ transactionId, contentName, value, currency = 'USD' }) => {
  const payload = {
    transaction_id: transactionId,
    content_name: contentName,
    value,
    currency,
  }

  trackMetaEvent('Purchase', payload)
  trackTikTokEvent('CompletePayment', payload)
  trackGoogleEvent('purchase', payload)
}
