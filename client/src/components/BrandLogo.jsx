import { Link } from 'react-router-dom'

export function BrandLogo({ to = '/', variant = 'header', showLocation = true }) {
  const className = `brand-lockup brand-lockup-${variant}`
  const asset = variant === 'light' ? '/prestige-motors-logo-light.svg' : '/prestige-motors-logo.svg'

  return (
    <Link aria-label="Prestige Motors Miami" className={className} to={to}>
      <img alt="Prestige Motors Miami" className="brand-lockup-image" src={asset} />
      {showLocation ? <span className="brand-lockup-location">Miami</span> : null}
    </Link>
  )
}

export default BrandLogo
