import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initializeMarketing, marketingIsConfigured, trackPageView } from '../utils/marketing'

export function MarketingTracker() {
  const location = useLocation()

  useEffect(() => {
    initializeMarketing()
  }, [])

  useEffect(() => {
    if (!marketingIsConfigured()) {
      return
    }

    trackPageView({
      path: `${location.pathname}${location.search}`,
      title: document.title,
    })
  }, [location.pathname, location.search])

  return null
}
