export const formatUsd = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export const formatLocal = (value, currencyCode = 'NGN', locale = 'en-NG') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value)

export const convertUsdToLocal = (value, exchangeRate = 1) => Math.round(Number(value) * Number(exchangeRate))

export const formatMileage = (value) => `${new Intl.NumberFormat('en-US').format(value)} mi`

export const formatDate = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
