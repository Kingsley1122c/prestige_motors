const COUNTRY_OPTIONS = [
  { code: 'NG', name: 'Nigeria', currencyCode: 'NGN', locale: 'en-NG', exchangeRate: 1550 },
  { code: 'GH', name: 'Ghana', currencyCode: 'GHS', locale: 'en-GH', exchangeRate: 15.2 },
  { code: 'KE', name: 'Kenya', currencyCode: 'KES', locale: 'en-KE', exchangeRate: 130 },
  { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', locale: 'en-AE', exchangeRate: 3.67 },
  { code: 'US', name: 'United States', currencyCode: 'USD', locale: 'en-US', exchangeRate: 1 },
]

const DEFAULT_COUNTRY_CODE = 'US'
const readConfiguredValue = (key, fallback = '') => {
  const configuredValue = String(process.env[key] || '').trim()
  return configuredValue || fallback
}
const ADMIN_LOGIN_HINT_EMAIL = readConfiguredValue('ADMIN_LOGIN_HINT_EMAIL')

const cloneValue = (value) => JSON.parse(JSON.stringify(value))

const getCountrySettings = (countryCode = DEFAULT_COUNTRY_CODE) =>
  COUNTRY_OPTIONS.find((country) => country.code === countryCode) || COUNTRY_OPTIONS[0]

const buildPlans = (priceUsd, minimumDepositUsd, durations = [6, 12, 18, 24]) => {
  const financedAmount = priceUsd - minimumDepositUsd

  return durations.map((months) => {
    const serviceFactor = 1 + months * 0.0065
    return {
      months,
      monthlyUsd: Math.ceil((financedAmount * serviceFactor) / months),
    }
  })
}

const MEDIA_PALETTES = [
  { frame: '#08111f', frameSoft: '#11213b', accent: '#d6ad2f', accentSoft: '#f3d782', line: '#f5efe2', ink: '#e8edf7' },
  { frame: '#130d09', frameSoft: '#2a1b13', accent: '#dca763', accentSoft: '#f4d8af', line: '#fff2dc', ink: '#f2ede8' },
  { frame: '#0f1316', frameSoft: '#1a2026', accent: '#86c6ff', accentSoft: '#cfe9ff', line: '#ecf6ff', ink: '#ecf2f7' },
  { frame: '#150d14', frameSoft: '#25142a', accent: '#f08ca5', accentSoft: '#ffd3df', line: '#fff1f5', ink: '#f8eef3' },
]

const MEDIA_THEME_RULES = [
  {
    name: 'Performance Ember',
    note: 'High-contrast trim palette for halo and performance specifications',
    matcher: /raptor|trx|turbo|competition|type s|speed|sapphire|plaid|performance|supercharged|sport/i,
    paletteIndex: 0,
  },
  {
    name: 'Executive Reserve',
    note: 'Warm metallic palette for flagship luxury and rear-cabin focused trims',
    matcher: /maybach|flying spur|century|escalade|navigator|black label|denali|wagoneer|high country|executive|flagship/i,
    paletteIndex: 1,
  },
  {
    name: 'Electric Horizon',
    note: 'Cool luminous palette for EV and advanced electrified nameplates',
    matcher: /\bev\b|electric|rivian|lucid|tesla|hummer/i,
    paletteIndex: 2,
  },
  {
    name: 'Expedition Slate',
    note: 'Muted terrain palette for off-road, utility, and adventure-oriented trims',
    matcher: /defender|land cruiser|tundra|bronco|4wd|outbound|trail|expedition|truck|pickup|suv/i,
    paletteIndex: 3,
  },
]

const hashTextValue = (input) => Array.from(String(input || '')).reduce((total, character) => total + character.charCodeAt(0), 0)

const getVehicleTheme = ({ brand, model, year, badge, bodyStyle, fuelType }) => {
  const matchSource = `${brand} ${model} ${badge || ''} ${bodyStyle || ''} ${fuelType || ''}`
  const matchingTheme = MEDIA_THEME_RULES.find((theme) => theme.matcher.test(matchSource))

  if (matchingTheme) {
    return {
      name: matchingTheme.name,
      note: matchingTheme.note,
      palette: MEDIA_PALETTES[matchingTheme.paletteIndex],
    }
  }

  const paletteIndex = hashTextValue(`${brand}-${model}-${year}`) % MEDIA_PALETTES.length

  return {
    name: 'Signature Atelier',
    note: 'Catalog palette generated from the vehicle name and trim details',
    palette: MEDIA_PALETTES[paletteIndex],
  }
}

const normalizeBodyStyle = (bodyStyle = '') => String(bodyStyle).toLowerCase()

const buildVehicleViewPlan = (bodyStyle) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)

  if (normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Verified front fascia and stance' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Wheelbase and body side view' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Tailgate, lamps, and rear bodywork' },
      { scene: 'interior', label: 'Cabin dashboard', detail: 'Driver cockpit and dash architecture' },
      { scene: 'interior', label: 'Front seats', detail: 'Bolsters, trim, and console layout' },
      { scene: 'interior', label: 'Rear seating', detail: 'Second-row access and cabin finish' },
      { scene: 'detail', label: 'Cargo bed detail', detail: 'Bed utility, liner, and tailgate zone' },
    ]
  }

  if (normalizedBodyStyle.includes('van')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Nose, grille, and wheel design' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Body length and executive lounge proportions' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Tail lamps, hatch, and coachwork' },
      { scene: 'interior', label: 'Cockpit dashboard', detail: 'Driver layout and center display stack' },
      { scene: 'interior', label: 'Executive lounge seats', detail: 'Captain chairs and comfort controls' },
      { scene: 'interior', label: 'Rear cabin amenities', detail: 'Tables, screens, and ambient finish' },
      { scene: 'detail', label: 'Door and entry detail', detail: 'Sliding entry and premium trim surfaces' },
    ]
  }

  if (normalizedBodyStyle.includes('coupe') || normalizedBodyStyle.includes('sportback')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Front bumper, lights, and hood line' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Roofline, stance, and wheel design' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Rear haunches and tail treatment' },
      { scene: 'interior', label: 'Cockpit dashboard', detail: 'Digital cluster and center console' },
      { scene: 'interior', label: 'Front sport seats', detail: 'Seat contours and upholstery theme' },
      { scene: 'interior', label: 'Passenger cabin', detail: 'Cabin materials and trim layout' },
      { scene: 'detail', label: 'Wheel and brake detail', detail: 'Performance hardware and finish' },
    ]
  }

  if (normalizedBodyStyle.includes('sedan')) {
    return [
      { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Front bodywork and grille signature' },
      { scene: 'exterior', label: 'Exterior side profile', detail: 'Wheelbase and formal roofline' },
      { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Rear lamps and deck treatment' },
      { scene: 'interior', label: 'Cockpit dashboard', detail: 'Dash architecture and display layout' },
      { scene: 'interior', label: 'Front seats', detail: 'Driver and passenger seating finish' },
      { scene: 'interior', label: 'Rear executive seating', detail: 'Second-row comfort and legroom' },
      { scene: 'detail', label: 'Trim and console detail', detail: 'Wood, metal, and switchgear finish' },
    ]
  }

  return [
    { scene: 'exterior', label: 'Exterior front three-quarter', detail: 'Front fascia and body stance' },
    { scene: 'exterior', label: 'Exterior side profile', detail: 'Side silhouette and wheel design' },
    { scene: 'exterior', label: 'Exterior rear three-quarter', detail: 'Rear body lines and lamps' },
    { scene: 'interior', label: 'Cockpit dashboard', detail: 'Driver display and center stack' },
    { scene: 'interior', label: 'Front seats', detail: 'Seat shape and interior finish' },
    { scene: 'interior', label: 'Rear cabin', detail: 'Second-row or third-row comfort zone' },
    { scene: 'detail', label: 'Wheel and trim detail', detail: 'Exterior accents and material finish' },
  ]
}

const buildExteriorIllustration = (bodyStyle, palette) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)

  if (normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')) {
    return `
      <rect x="210" y="410" width="470" height="88" rx="28" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M260 332 L430 332 Q474 332 505 364 L560 364 Q614 364 642 388 L694 388 L694 430 L238 430 Q222 430 214 420 L214 380 Q214 352 260 332 Z" fill="${palette.line}" opacity="0.92" />
      <rect x="530" y="360" width="114" height="56" rx="14" fill="${palette.accent}" opacity="0.9" />
      <rect x="305" y="348" width="128" height="52" rx="18" fill="${palette.accentSoft}" opacity="0.8" />
    `
  }

  if (normalizedBodyStyle.includes('van')) {
    return `
      <rect x="224" y="390" width="460" height="96" rx="30" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M272 304 L520 304 Q590 304 626 340 L678 340 L678 408 L222 408 L222 356 Q222 334 272 304 Z" fill="${palette.line}" opacity="0.92" />
      <rect x="314" y="324" width="154" height="62" rx="18" fill="${palette.accentSoft}" opacity="0.78" />
      <rect x="482" y="324" width="126" height="62" rx="18" fill="${palette.accent}" opacity="0.78" />
    `
  }

  if (normalizedBodyStyle.includes('coupe') || normalizedBodyStyle.includes('sportback')) {
    return `
      <rect x="236" y="416" width="432" height="82" rx="28" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M286 368 Q360 300 470 300 Q562 300 620 356 L668 392 L668 430 L236 430 L236 408 Q236 390 286 368 Z" fill="${palette.line}" opacity="0.93" />
      <path d="M378 322 L522 322 Q566 322 602 354 L458 354 Q416 354 378 322 Z" fill="${palette.accentSoft}" opacity="0.78" />
    `
  }

  if (normalizedBodyStyle.includes('sedan')) {
    return `
      <rect x="220" y="418" width="468" height="80" rx="28" fill="${palette.frameSoft}" opacity="0.96" />
      <path d="M274 360 Q346 308 444 308 H556 Q620 308 674 388 L688 408 L688 430 H220 L220 402 Q220 382 274 360 Z" fill="${palette.line}" opacity="0.93" />
      <rect x="374" y="330" width="172" height="54" rx="18" fill="${palette.accentSoft}" opacity="0.8" />
    `
  }

  return `
    <rect x="214" y="404" width="476" height="92" rx="30" fill="${palette.frameSoft}" opacity="0.96" />
    <path d="M268 332 H554 Q622 332 672 384 L690 404 L690 430 H214 V382 Q214 360 268 332 Z" fill="${palette.line}" opacity="0.93" />
    <rect x="332" y="348" width="148" height="52" rx="18" fill="${palette.accentSoft}" opacity="0.8" />
    <rect x="486" y="348" width="128" height="52" rx="18" fill="${palette.accent}" opacity="0.8" />
  `
}

const buildInteriorIllustration = (bodyStyle, palette) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)
  const rearSeatWidth = normalizedBodyStyle.includes('van') ? 188 : normalizedBodyStyle.includes('truck') ? 148 : 168

  return `
    <path d="M220 254 Q324 198 450 198 H546 Q674 198 778 254 L748 332 H252 Z" fill="${palette.frameSoft}" opacity="0.96" />
    <rect x="320" y="236" width="160" height="64" rx="18" fill="${palette.accentSoft}" opacity="0.9" />
    <rect x="500" y="236" width="126" height="64" rx="18" fill="${palette.accent}" opacity="0.88" />
    <rect x="292" y="388" width="124" height="142" rx="28" fill="${palette.line}" opacity="0.92" />
    <rect x="528" y="388" width="124" height="142" rx="28" fill="${palette.line}" opacity="0.92" />
    <rect x="396" y="430" width="152" height="86" rx="22" fill="${palette.frame}" opacity="0.95" />
    <rect x="356" y="562" width="${rearSeatWidth}" height="74" rx="24" fill="${palette.accentSoft}" opacity="0.88" />
  `
}

const buildDetailIllustration = (bodyStyle, palette) => {
  const normalizedBodyStyle = normalizeBodyStyle(bodyStyle)

  if (normalizedBodyStyle.includes('truck') || normalizedBodyStyle.includes('pickup')) {
    return `
      <rect x="250" y="266" width="428" height="228" rx="30" fill="${palette.frameSoft}" opacity="0.95" />
      <rect x="286" y="302" width="356" height="156" rx="18" fill="${palette.line}" opacity="0.92" />
      <rect x="286" y="448" width="356" height="32" rx="12" fill="${palette.accent}" opacity="0.88" />
    `
  }

  return `
    <circle cx="354" cy="430" r="114" fill="${palette.line}" opacity="0.92" />
    <circle cx="354" cy="430" r="74" fill="${palette.frameSoft}" opacity="0.95" />
    <circle cx="354" cy="430" r="34" fill="${palette.accent}" opacity="0.92" />
    <rect x="478" y="308" width="180" height="170" rx="26" fill="${palette.accentSoft}" opacity="0.88" />
    <rect x="506" y="340" width="124" height="22" rx="10" fill="${palette.frameSoft}" opacity="0.85" />
    <rect x="506" y="382" width="92" height="22" rx="10" fill="${palette.frameSoft}" opacity="0.85" />
    <rect x="506" y="424" width="108" height="22" rx="10" fill="${palette.frameSoft}" opacity="0.85" />
  `
}

const createVehicleMediaCard = ({ brand, model, year, bodyStyle, exteriorColor, interiorColor, badge, scene, label, detail, theme }) => {
  const resolvedTheme = theme || getVehicleTheme({ brand, model, year, badge, bodyStyle })
  const palette = resolvedTheme.palette
  const vehicleName = `${brand} ${model}`
  const colorLine = scene === 'interior'
    ? `Interior finish ${interiorColor || 'Tailored trim'}`
    : `Exterior finish ${exteriorColor || 'Signature specification'}`
  const sceneBadge = scene === 'interior' ? 'Interior' : scene === 'detail' ? 'Detail' : 'Exterior'
  const artwork = scene === 'interior'
    ? buildInteriorIllustration(bodyStyle, palette)
    : scene === 'detail'
      ? buildDetailIllustration(bodyStyle, palette)
      : buildExteriorIllustration(bodyStyle, palette)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img" aria-label="${vehicleName} ${label}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.frame}" />
          <stop offset="100%" stop-color="${palette.frameSoft}" />
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${palette.accentSoft}" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="960" height="720" rx="38" fill="url(#bg)" />
      <circle cx="182" cy="118" r="144" fill="${palette.accent}" opacity="0.12" />
      <circle cx="824" cy="612" r="188" fill="${palette.accentSoft}" opacity="0.08" />
      <rect x="56" y="56" width="848" height="608" rx="32" fill="none" stroke="${palette.line}" stroke-opacity="0.14" />
      <rect x="86" y="88" width="196" height="30" rx="15" fill="url(#glow)" opacity="0.92" />
      <rect x="720" y="88" width="150" height="32" rx="16" fill="${palette.frame}" fill-opacity="0.78" stroke="${palette.line}" stroke-opacity="0.3" />
      <text x="88" y="154" fill="${palette.ink}" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700">${vehicleName}</text>
      <text x="88" y="198" fill="${palette.accentSoft}" font-family="Segoe UI, Arial, sans-serif" font-size="22">${year} ${bodyStyle} - ${badge || 'Verified catalog media'}</text>
      <text x="748" y="110" fill="${palette.accentSoft}" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700">${sceneBadge}</text>
      <text x="88" y="238" fill="${palette.ink}" fill-opacity="0.86" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="600">${label}</text>
      <text x="88" y="274" fill="${palette.ink}" fill-opacity="0.7" font-family="Segoe UI, Arial, sans-serif" font-size="19">${detail}</text>
      <text x="88" y="304" fill="${palette.ink}" fill-opacity="0.62" font-family="Segoe UI, Arial, sans-serif" font-size="17">${colorLine}</text>
      <text x="88" y="334" fill="${palette.accentSoft}" fill-opacity="0.86" font-family="Segoe UI, Arial, sans-serif" font-size="17">${resolvedTheme.name} theme</text>
      ${artwork}
      <circle cx="308" cy="516" r="56" fill="${palette.frame}" opacity="0.98" />
      <circle cx="308" cy="516" r="34" fill="${palette.accentSoft}" opacity="0.92" />
      <circle cx="628" cy="516" r="56" fill="${palette.frame}" opacity="0.98" />
      <circle cx="628" cy="516" r="34" fill="${palette.accentSoft}" opacity="0.92" />
      <text x="88" y="618" fill="${palette.accentSoft}" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600">Interior and exterior media matched to vehicle name</text>
      <text x="88" y="646" fill="${palette.ink}" fill-opacity="0.62" font-family="Segoe UI, Arial, sans-serif" font-size="16">${resolvedTheme.note}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s+/g, ' ').trim())}`
}

const buildVehicleDisplayGallery = (vehicle) => {
  const theme = getVehicleTheme(vehicle)

  return buildVehicleViewPlan(vehicle.bodyStyle).map((view, index) => ({
    id: `${vehicle.id}-display-${index + 1}`,
    scene: view.scene,
    label: view.label,
    detail: view.detail,
    themeName: theme.name,
    themeNote: theme.note,
    src: createVehicleMediaCard({ ...vehicle, ...view, theme }),
  }))
}

const attachVehicleDisplayMedia = (vehicle) => {
  if (!vehicle) {
    return null
  }

  const displayGalleryItems = buildVehicleDisplayGallery(vehicle)
  const displayTheme = getVehicleTheme(vehicle)
  const displayGallery = displayGalleryItems.map((item) => item.src)

  return {
    ...vehicle,
    displayTheme: { name: displayTheme.name, note: displayTheme.note, accent: displayTheme.palette.accent },
    displayHeroImage: displayGallery[0],
    displayGallery,
    displayGalleryItems,
  }
}

const createCarRecord = (input) => {
  const priceUsd = Number(input.priceUsd)
  const minimumDepositUsd = Number(input.minimumDepositUsd)
  const durations = input.installmentDurations?.length
    ? input.installmentDurations.map((value) => Number(value))
    : [6, 12, 18, 24]
  const defaultCountry = getCountrySettings(DEFAULT_COUNTRY_CODE)

  return attachVehicleDisplayMedia({
    id: input.id,
    badge: input.badge || 'Featured',
    brand: input.brand,
    model: input.model,
    year: Number(input.year),
    mileage: Number(input.mileage),
    location: input.location,
    condition: input.condition,
    priceUsd,
    priceLocal: Math.round(priceUsd * defaultCountry.exchangeRate),
    currencyCode: defaultCountry.currencyCode,
    minimumDepositUsd,
    installmentDurations: durations,
    monthlyPlans: buildPlans(priceUsd, minimumDepositUsd, durations),
    paymentTypes: input.paymentTypes || ['full', 'installment'],
    bodyStyle: input.bodyStyle,
    fuelType: input.fuelType,
    transmission: input.transmission,
    drivetrain: input.drivetrain,
    exteriorColor: input.exteriorColor,
    interiorColor: input.interiorColor,
    description: input.description,
    heroImage: input.heroImage || '',
    gallery: input.gallery || [],
    features: input.features || [],
    highlights: input.highlights || [],
    delivery: {
      feeUsd: Number(input.delivery?.feeUsd || 0),
      eta: input.delivery?.eta || '2-5 business days',
    },
  })
}

const createUserRecord = (input) => ({
  id: input.id,
  fullName: input.fullName,
  email: input.email,
  phone: input.phone,
  password: input.password,
  role: input.role || 'user',
  country: input.country || DEFAULT_COUNTRY_CODE,
  location: input.location || 'Not set',
  favoriteCarIds: input.favoriteCarIds || [],
  notifications: input.notifications || [],
})

const cars = [
  createCarRecord({
    id: 'lexus-lx-600-2023', badge: 'Flagship', brand: 'Lexus', model: 'LX 600 F SPORT', year: 2023, mileage: 8200,
    location: 'Houston', condition: 'Certified used', priceUsd: 128000, minimumDepositUsd: 15000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Obsidian Black', interiorColor: 'Saddle Tan',
    description: 'A flagship luxury SUV positioned in our Texas partner inventory with commanding road presence, executive rear comfort, and full verification before payment.',
    heroImage: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80'],
    features: ['360 camera', 'Mark Levinson audio', 'Ventilated seats', 'Adaptive suspension'],
    highlights: ['Houston inspection available same day', 'Financing up to 24 months', 'Verified VIN report included'],
    delivery: { feeUsd: 350, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'mercedes-s580-2022', badge: 'Executive', brand: 'Mercedes-Benz', model: 'S 580 4MATIC', year: 2022, mileage: 15400,
    location: 'Atlanta', condition: 'Certified used', priceUsd: 146000, minimumDepositUsd: 18000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Graphite Grey', interiorColor: 'Macchiato Beige',
    description: 'Long-wheelbase comfort and modern safety technology for buyers who want chauffeured luxury sourced through our Atlanta executive showroom network.',
    heroImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80'],
    features: ['Rear executive seating', 'Burmester 4D audio', 'Air suspension', 'Night package'],
    highlights: ['Atlanta showroom verification appointment', 'Bank transfer or escrow supported', 'Business registration details available'],
    delivery: { feeUsd: 420, eta: '3-5 business days after deposit confirmation' },
  }),
  createCarRecord({
    id: 'toyota-land-cruiser-2021', badge: 'Popular', brand: 'Toyota', model: 'Land Cruiser GR Sport', year: 2021, mileage: 27600,
    location: 'Dallas', condition: 'Certified used', priceUsd: 93000, minimumDepositUsd: 9000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Pearl White', interiorColor: 'Black Leather',
    description: 'A dependable premium SUV for families and fleet buyers, offered through our Dallas stock with clear ownership records and flexible monthly plans.',
    heroImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Crawl control', 'Adaptive cruise', 'Third-row seating', 'Off-road package'],
    highlights: ['Ideal for installment buyers', 'Dallas inspection and test drive required before release', 'Delivery only after approval'],
    delivery: { feeUsd: 300, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'bmw-x7-2023', badge: 'New Arrival', brand: 'BMW', model: 'X7 xDrive40i', year: 2023, mileage: 10900,
    location: 'Chicago', condition: 'Certified used', priceUsd: 118500, minimumDepositUsd: 14000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Sapphire', interiorColor: 'Ivory White',
    description: 'Spacious three-row comfort with a refined digital cabin and payment options structured for executives and family buyers sourcing through Chicago.',
    heroImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1523983388277-336a66bf9bcd?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Panoramic roof', 'Gesture control', 'Harman Kardon audio', 'Air suspension'],
    highlights: ['Chicago inspection before any release', 'Automated receipts for all payments', 'Delivery request after deposit'],
    delivery: { feeUsd: 360, eta: '2-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'range-rover-sport-2022', badge: 'Premium', brand: 'Land Rover', model: 'Range Rover Sport HSE', year: 2022, mileage: 19100,
    location: 'San Francisco', condition: 'Certified used', priceUsd: 121000, minimumDepositUsd: 15000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Santorini Black', interiorColor: 'Ebony',
    description: 'Performance SUV styling with a carefully documented ownership trail, suited for buyers who want West Coast inventory with flexible financing.',
    heroImage: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80'],
    features: ['Terrain response', 'Meridian audio', 'Matrix LED', 'Heated steering'],
    highlights: ['Bay Area delivery estimate shown upfront', 'Escrow available for qualified buyers', 'Inspection-first process'],
    delivery: { feeUsd: 480, eta: '5-7 business days after financing approval' },
  }),
  createCarRecord({
    id: 'porsche-cayenne-2024', badge: 'Collector Pick', brand: 'Porsche', model: 'Cayenne Platinum Edition', year: 2024, mileage: 4200,
    location: 'Osaka', condition: 'Brand new', priceUsd: 136000, minimumDepositUsd: 20000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed Tiptronic', drivetrain: 'AWD', exteriorColor: 'Jet Black Metallic', interiorColor: 'Bordeaux Red',
    description: 'A high-specification luxury SUV for discerning buyers who want a premium Japan-market import experience with documented financing and compliance steps.',
    heroImage: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['Sport Chrono package', 'BOSE surround', 'Head-up display', 'Adaptive sport seats'],
    highlights: ['Osaka import documentation disclosed', 'Loan and escrow workflows supported', 'Premium concierge inspection scheduling'],
    delivery: { feeUsd: 650, eta: '7-10 business days after release approval' },
  }),
  createCarRecord({
    id: 'cadillac-escalade-v-2024', badge: 'USA Arrival', brand: 'Cadillac', model: 'Escalade V', year: 2024, mileage: 6100,
    location: 'Los Angeles', condition: 'Certified used', priceUsd: 164000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Raven', interiorColor: 'Jet Black',
    description: 'A full-size performance luxury SUV sourced from the US market with bold styling, concierge inspection support, and transparent financing terms.',
    heroImage: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80'],
    features: ['Super Cruise', 'AKG studio audio', 'Executive second row', 'Night vision'],
    highlights: ['US-based inventory release', 'High-value vehicle verification included', 'Ideal for executive family transport'],
    delivery: { feeUsd: 540, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'tesla-model-x-plaid-2024', badge: 'Electric', brand: 'Tesla', model: 'Model X Plaid', year: 2024, mileage: 3400,
    location: 'New York', condition: 'Brand new', priceUsd: 129500, minimumDepositUsd: 17000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Pearl White', interiorColor: 'Cream',
    description: 'High-performance electric luxury SUV with falcon-wing doors, digital controls, and an America-based handover process.',
    heroImage: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Autopilot', 'Six-seat layout', 'HEPA filtration', 'Panoramic windshield'],
    highlights: ['Popular US luxury EV', 'Inspection available in Manhattan partner showroom', 'Receipt and escrow workflow supported'],
    delivery: { feeUsd: 510, eta: '3-6 business days after payment verification' },
  }),
  createCarRecord({
    id: 'mercedes-g63-2023', badge: 'Miami Select', brand: 'Mercedes-Benz', model: 'AMG G 63', year: 2023, mileage: 7800,
    location: 'Miami', condition: 'Certified used', priceUsd: 198000, minimumDepositUsd: 28000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Magno Black', interiorColor: 'Classic Red',
    description: 'An ultra-premium luxury icon with US showroom access, detailed ownership records, and structured monthly plans.',
    heroImage: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'],
    features: ['AMG performance exhaust', 'Burmester audio', 'Nappa leather', '360 camera'],
    highlights: ['Miami-based inspection scheduling', 'High-deposit buyers supported', 'Ideal for premium export or US handover'],
    delivery: { feeUsd: 620, eta: '3-5 business days after release approval' },
  }),
  createCarRecord({
    id: 'lexus-lm-500h-2024', badge: 'Asia Exclusive', brand: 'Lexus', model: 'LM 500h Ultra Luxury', year: 2024, mileage: 2500,
    location: 'Tokyo', condition: 'Brand new', priceUsd: 172000, minimumDepositUsd: 24000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Luxury Van', fuelType: 'Hybrid', transmission: 'Automatic', drivetrain: 'AWD', exteriorColor: 'Sonic Titanium', interiorColor: 'White Leather',
    description: 'A chauffeur-grade luxury MPV from Japan with private lounge seating and Asia-market documentation for careful buyers.',
    heroImage: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80'],
    features: ['Rear lounge package', 'Hybrid powertrain', 'Mark Levinson audio', 'Executive climate control'],
    highlights: ['Japan-market luxury import', 'Asia documentation reviewed before release', 'High-comfort chauffeur configuration'],
    delivery: { feeUsd: 700, eta: '7-12 business days after approval' },
  }),
  createCarRecord({
    id: 'toyota-alphard-2024', badge: 'Asia Family', brand: 'Toyota', model: 'Alphard Executive Lounge', year: 2024, mileage: 5100,
    location: 'Singapore', condition: 'Foreign used', priceUsd: 108000, minimumDepositUsd: 13000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Luxury Van', fuelType: 'Hybrid', transmission: 'CVT', drivetrain: 'FWD', exteriorColor: 'Precious Metal', interiorColor: 'Beige',
    description: 'A luxury people-mover with premium second-row comfort, ideal for family buyers or hospitality operators sourcing from Asia.',
    heroImage: 'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80'],
    features: ['Ottoman captain seats', 'JBL audio', 'Digital rear mirror', 'Power sliding doors'],
    highlights: ['Singapore-based vehicle history', 'Family and hotel shuttle use case', 'Installment-friendly pricing'],
    delivery: { feeUsd: 560, eta: '6-9 business days after payment confirmation' },
  }),
  createCarRecord({
    id: 'nissan-gtr-2022', badge: 'Performance Asia', brand: 'Nissan', model: 'GT-R Premium', year: 2022, mileage: 8900,
    location: 'Seoul', condition: 'Foreign used', priceUsd: 149000, minimumDepositUsd: 21000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '6-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Gun Metallic', interiorColor: 'Black',
    description: 'A serious high-performance coupe sourced through Asia, offered with documented verification and transparent export-ready release terms.',
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80'],
    features: ['Brembo brakes', 'Bose audio', 'Launch control', 'Performance telemetry'],
    highlights: ['Seoul-market performance vehicle', 'Specialist inspection before release', 'Collector-grade documentation'],
    delivery: { feeUsd: 640, eta: '6-10 business days after approval' },
  }),
  createCarRecord({
    id: 'audi-rs7-2024', badge: 'US Sportback', brand: 'Audi', model: 'RS 7 Performance', year: 2024, mileage: 3900,
    location: 'Los Angeles', condition: 'Brand new', priceUsd: 158000, minimumDepositUsd: 23000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sportback', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Daytona Gray', interiorColor: 'Black Valcona',
    description: 'A four-door performance flagship from our California pipeline, pairing supercar pace with daily luxury and transparent finance structure.',
    heroImage: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['RS dynamic package', 'Bang & Olufsen audio', 'Carbon optics', 'All-wheel steering'],
    highlights: ['California-based verification slot', 'Performance finance profile supported', 'Executive and enthusiast appeal'],
    delivery: { feeUsd: 575, eta: '2-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'rolls-royce-ghost-2023', badge: 'Ultra Luxury', brand: 'Rolls-Royce', model: 'Ghost Extended', year: 2023, mileage: 2800,
    location: 'Miami', condition: 'Certified used', priceUsd: 348000, minimumDepositUsd: 55000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Diamond', interiorColor: 'Arctic White',
    description: 'A chauffeur-grade ultra-luxury sedan in our Miami collection for buyers who want top-tier provenance, concierge handling, and discreet payment workflows.',
    heroImage: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Starlight headliner', 'Rear theatre seating', 'Bespoke audio', 'Signature umbrella doors'],
    highlights: ['Miami private inspection suite', 'Escrow preferred for premium transfers', 'Ideal for chauffeured executive ownership'],
    delivery: { feeUsd: 840, eta: '3-6 business days after release approval' },
  }),
  createCarRecord({
    id: 'ferrari-purosangue-2024', badge: 'Exotic US', brand: 'Ferrari', model: 'Purosangue', year: 2024, mileage: 1900,
    location: 'Las Vegas', condition: 'Brand new', priceUsd: 425000, minimumDepositUsd: 70000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Performance SUV', fuelType: 'Petrol', transmission: '8-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Nero Daytona', interiorColor: 'Rosso Ferrari',
    description: 'Ferrari’s four-door performance statement sourced from our US exotic network, built for collectors who still want clarity on verification and release terms.',
    heroImage: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80'],
    features: ['Naturally aspirated V12', 'Carbon roof', 'Adaptive suspension', 'Launch telemetry'],
    highlights: ['Las Vegas specialist inspection available', 'Collector-grade documentation pack', 'High-deposit approval path supported'],
    delivery: { feeUsd: 980, eta: '4-7 business days after approval' },
  }),
  createCarRecord({
    id: 'lamborghini-urus-2024', badge: 'Super SUV', brand: 'Lamborghini', model: 'Urus S', year: 2024, mileage: 2600,
    location: 'Bangkok', condition: 'Brand new', priceUsd: 289000, minimumDepositUsd: 46000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Nero Helene', interiorColor: 'Nero Ade',
    description: 'A super-SUV from our Asia luxury channel with aggressive styling, fast approval workflows, and documented handover conditions.',
    heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['ANIMA drive modes', 'Panoramic roof', 'Bang & Olufsen audio', 'Carbon ceramic brakes'],
    highlights: ['Bangkok-market sourcing verified', 'Asia import paperwork shared upfront', 'Fast-track premium delivery coordination'],
    delivery: { feeUsd: 860, eta: '6-10 business days after approval' },
  }),
  createCarRecord({
    id: 'bentley-bentayga-2024', badge: 'Desert Spec', brand: 'Bentley', model: 'Bentayga Speed', year: 2024, mileage: 3200,
    location: 'Scottsdale', condition: 'Brand new', priceUsd: 274000, minimumDepositUsd: 43000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Onyx', interiorColor: 'Linen and Beluga',
    description: 'A grand touring Bentley SUV secured through our Arizona exotic desk with handcrafted cabin finishes and clearly documented release terms.',
    heroImage: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'],
    features: ['Naim audio', 'Rear entertainment', 'Bentley Dynamic Ride', 'Touring specification'],
    highlights: ['Scottsdale private viewing available', 'High-balance finance cases supported', 'Collector-grade ownership file included'],
    delivery: { feeUsd: 780, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'aston-martin-dbx707-2024', badge: 'Northwest Exotic', brand: 'Aston Martin', model: 'DBX707', year: 2024, mileage: 4100,
    location: 'Seattle', condition: 'Certified used', priceUsd: 239000, minimumDepositUsd: 36000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Xenon Grey', interiorColor: 'Oxford Tan',
    description: 'A high-output British performance SUV routed through our Seattle exotic network, blending daily usability with super-SUV pace.',
    heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=1200&q=80'],
    features: ['Carbon roof', 'Bowers & Wilkins audio', 'Active anti-roll control', 'Sport exhaust'],
    highlights: ['Seattle handover route available', 'Verified ownership and service documentation', 'Rapid credit review for qualified buyers'],
    delivery: { feeUsd: 760, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'lucid-air-sapphire-2024', badge: 'EV Halo', brand: 'Lucid', model: 'Air Sapphire', year: 2024, mileage: 1800,
    location: 'San Jose', condition: 'Brand new', priceUsd: 262000, minimumDepositUsd: 40000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Infinite Black', interiorColor: 'Santa Cruz',
    description: 'A tri-motor electric flagship from Silicon Valley inventory with hyper-sedan acceleration and structured premium finance options.',
    heroImage: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1200&q=80'],
    features: ['Tri-motor powertrain', 'Glass canopy roof', 'DreamDrive Pro', 'Massaging rear seats'],
    highlights: ['San Jose EV specialist inspection', 'Premium charging and ownership briefing', 'Eligible for structured high-value financing'],
    delivery: { feeUsd: 720, eta: '3-5 business days after payment confirmation' },
  }),
  createCarRecord({
    id: 'maybach-gls-600-2024', badge: 'Beverly Hills', brand: 'Mercedes-Maybach', model: 'GLS 600', year: 2024, mileage: 2700,
    location: 'Beverly Hills', condition: 'Brand new', priceUsd: 248000, minimumDepositUsd: 39000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '9-speed automatic', drivetrain: 'AWD', exteriorColor: 'Obsidian Black and Mojave Silver', interiorColor: 'Crystal White',
    description: 'A Maybach flagship SUV reserved through our Beverly Hills partner showroom for buyers who want rear-cabin luxury without ambiguous terms.',
    heroImage: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'],
    features: ['Executive rear seats', 'E-Active Body Control', 'Burmester high-end 3D audio', 'Champagne cooler'],
    highlights: ['Beverly Hills private suite viewing', 'White-glove paperwork handling', 'Preferred for chauffeur and owner-driver clients'],
    delivery: { feeUsd: 795, eta: '3-5 business days after approval' },
  }),
  createCarRecord({
    id: 'honda-nsx-type-s-2022', badge: 'Japan Halo', brand: 'Honda', model: 'NSX Type S', year: 2022, mileage: 5200,
    location: 'Yokohama', condition: 'Foreign used', priceUsd: 228000, minimumDepositUsd: 34000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Hybrid', transmission: '9-speed dual clutch', drivetrain: 'AWD', exteriorColor: 'Berlina Black', interiorColor: 'Red Alcantara',
    description: 'A rare Japan-market hybrid supercar sourced through Yokohama, offered with collector documentation and careful cross-border release handling.',
    heroImage: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80'],
    features: ['Sport Hybrid SH-AWD', 'Carbon package', 'ELS Studio audio', 'Track mode telemetry'],
    highlights: ['Yokohama collector inspection offered', 'Rare allocation paperwork included', 'Ideal for enthusiast finance and escrow'],
    delivery: { feeUsd: 770, eta: '7-11 business days after approval' },
  }),
  createCarRecord({
    id: 'toyota-century-suv-2024', badge: 'Japan State Class', brand: 'Toyota', model: 'Century SUV', year: 2024, mileage: 900,
    location: 'Nagoya', condition: 'Brand new', priceUsd: 212000, minimumDepositUsd: 32000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Hybrid', transmission: 'Automatic', drivetrain: 'AWD', exteriorColor: 'Black', interiorColor: 'Wool Blend Grey',
    description: 'A formal Japan-market ultra-luxury SUV sourced through Nagoya for buyers who value privacy, rear-seat comfort, and discreet documentation.',
    heroImage: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    gallery: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?auto=format&fit=crop&w=1200&q=80'],
    features: ['Powered ottoman seating', 'Rear privacy suite', 'Hybrid quiet mode', 'Rear entertainment controls'],
    highlights: ['Nagoya sourcing documents reviewed', 'Discrete executive transport profile', 'Specialist concierge delivery planning'],
    delivery: { feeUsd: 810, eta: '7-12 business days after approval' },
  }),
  createCarRecord({
    id: 'ford-f150-raptor-r-2024', badge: 'Performance Truck', brand: 'Ford', model: 'F-150 Raptor R', year: 2024, mileage: 2400,
    location: 'Austin', condition: 'Brand new', priceUsd: 134000, minimumDepositUsd: 18000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Code Orange', interiorColor: 'Black and Orange',
    description: 'A supercharged halo pickup from our Texas performance-truck allocation, built for buyers who want the correct nameplate, aggressive off-road presence, and clean release paperwork.',
    features: ['FOX Live Valve shocks', '37-inch package', 'Recaro seats', 'Trail camera system'],
    highlights: ['Austin performance truck inspection lane', 'Exterior and cabin media matched to exact model', 'Installment review available for qualified buyers'],
    delivery: { feeUsd: 420, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'ram-1500-trx-2024', badge: 'Supercharged Truck', brand: 'Ram', model: '1500 TRX Final Edition', year: 2024, mileage: 1800,
    location: 'Phoenix', condition: 'Brand new', priceUsd: 142000, minimumDepositUsd: 20000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: '4WD', exteriorColor: 'Diamond Black', interiorColor: 'Black and Red',
    description: 'A collector-grade TRX configuration sourced through our Southwest truck desk with matched exterior and interior catalog media and a clear high-value deposit workflow.',
    features: ['Launch control', 'Beadlock-capable wheels', 'TRX performance pages', 'Harman Kardon audio'],
    highlights: ['Phoenix off-road inspection availability', 'Correct model-matched truck imagery', 'Premium transport and enclosed delivery options'],
    delivery: { feeUsd: 460, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'gmc-hummer-ev-pickup-2025', badge: 'EV Truck', brand: 'GMC', model: 'Hummer EV Pickup 3X', year: 2025, mileage: 900,
    location: 'Los Angeles', condition: 'Brand new', priceUsd: 156000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Meteorite Metallic', interiorColor: 'Lunar Horizon',
    description: 'A tri-motor electric super truck from our California inventory with matched cockpit and bed-detail media for buyers who need the correct vehicle presentation before committing.',
    features: ['CrabWalk', 'Extract mode', 'Infinity roof panels', 'UltraVision cameras'],
    highlights: ['Los Angeles EV specialist desk', 'Verified pickup-specific media set', 'Structured premium payment options'],
    delivery: { feeUsd: 520, eta: '3-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'chevrolet-silverado-hd-2024', badge: 'Heavy Duty', brand: 'Chevrolet', model: 'Silverado 2500HD High Country', year: 2024, mileage: 3200,
    location: 'Houston', condition: 'Brand new', priceUsd: 119000, minimumDepositUsd: 16000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Diesel', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Iridescent Pearl', interiorColor: 'Jet Black and Umber',
    description: 'A luxury heavy-duty pickup positioned for ranch, towing, and executive utility buyers who want exact truck-specific interior and exterior media before deposit approval.',
    features: ['Duramax diesel', 'Multi-Flex tailgate', 'Surround vision', 'Trailering tech package'],
    highlights: ['Houston heavy-duty inspection support', 'Cargo-bed and cabin imagery matched to model name', 'Fleet and owner-driver finance review supported'],
    delivery: { feeUsd: 430, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'porsche-911-turbo-s-2024', badge: 'Icon Sports Car', brand: 'Porsche', model: '911 Turbo S', year: 2024, mileage: 1400,
    location: 'Miami', condition: 'Brand new', priceUsd: 276000, minimumDepositUsd: 42000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Coupe', fuelType: 'Petrol', transmission: '8-speed PDK', drivetrain: 'AWD', exteriorColor: 'GT Silver Metallic', interiorColor: 'Black and Chalk',
    description: 'An iconic 911 specification offered through our Miami performance desk with exact-match media for the body, cabin, and wheel hardware instead of generic sports-car imagery.',
    features: ['Sport Chrono', 'Carbon roof', 'Rear axle steering', 'Burmester audio'],
    highlights: ['Miami performance-car inspection suite', 'Interior and exterior media tied to exact 911 nameplate', 'Collector-friendly documentation pack'],
    delivery: { feeUsd: 690, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'bentley-flying-spur-speed-2024', badge: 'Ultra Sedan', brand: 'Bentley', model: 'Flying Spur Speed', year: 2024, mileage: 2300,
    location: 'New York', condition: 'Brand new', priceUsd: 312000, minimumDepositUsd: 48000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Beluga', interiorColor: 'Linen and Saddle',
    description: 'A flagship Bentley sports sedan for buyers who want verified rear-cabin and exterior views matched to the exact Flying Spur specification before finance or deposit decisions.',
    features: ['Naim audio', 'Touring specification', 'Rear entertainment', 'All-wheel steering'],
    highlights: ['New York private viewing lane', 'Exact-model interior and exterior media set', 'Executive chauffeur and owner-driver use cases supported'],
    delivery: { feeUsd: 760, eta: '3-5 business days after release approval' },
  }),
  createCarRecord({
    id: 'bmw-m8-gran-coupe-2024', badge: 'Grand Coupe', brand: 'BMW', model: 'M8 Competition Gran Coupe', year: 2024, mileage: 2800,
    location: 'Chicago', condition: 'Brand new', priceUsd: 214000, minimumDepositUsd: 33000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Sedan', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Frozen Black', interiorColor: 'Silverstone and Black',
    description: 'A high-output four-door flagship from our Midwest performance stock with matched cockpit, seat, and exterior views for buyers who want the right car shown the right way.',
    features: ['M carbon package', 'Bowers & Wilkins audio', 'Adaptive M suspension', 'M drive modes'],
    highlights: ['Chicago specialist performance review', 'Exact-model image set with multiple interior views', 'Finance desk prepared for premium sport sedans'],
    delivery: { feeUsd: 610, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'land-rover-defender-130-2025', badge: 'Expedition Luxury', brand: 'Land Rover', model: 'Defender 130 Outbound', year: 2025, mileage: 1100,
    location: 'Denver', condition: 'Brand new', priceUsd: 138000, minimumDepositUsd: 19000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: 'AWD', exteriorColor: 'Carpathian Grey', interiorColor: 'Ebony Resist',
    description: 'A long-wheelbase Defender built for clients who want luxury expedition capability and exact-match exterior and interior catalog views before committing to transport or finance.',
    features: ['Air suspension', 'Electronic active differential', 'Cold climate pack', 'Meridian audio'],
    highlights: ['Denver mountain-route delivery planning', 'Name-matched cabin and body media for the exact 130 trim', 'Adventure and executive use cases both supported'],
    delivery: { feeUsd: 540, eta: '3-6 business days after approval' },
  }),
  createCarRecord({
    id: 'cadillac-escalade-v-2024', badge: 'Flagship SUV', brand: 'Cadillac', model: 'Escalade-V', year: 2024, mileage: 1600,
    location: 'Miami', condition: 'Brand new', priceUsd: 214000, minimumDepositUsd: 32000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: 'AWD', exteriorColor: 'Black Raven', interiorColor: 'Jet Black',
    description: 'A supercharged full-size flagship SUV with matched cabin, rear-seat, and exterior catalog views for buyers who want the correct Escalade-V presentation before approval.',
    features: ['Super Cruise', 'AKG 36-speaker audio', 'Executive second row', 'Performance exhaust'],
    highlights: ['Miami flagship SUV inspection lane', 'Trim-matched luxury gallery with rear-cabin captions', 'Structured premium financing available'],
    delivery: { feeUsd: 680, eta: '3-5 business days after approval' },
  }),
  createCarRecord({
    id: 'lincoln-navigator-black-label-2024', badge: 'Black Label', brand: 'Lincoln', model: 'Navigator Black Label', year: 2024, mileage: 2100,
    location: 'Dallas', condition: 'Brand new', priceUsd: 168000, minimumDepositUsd: 24000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Pristine White', interiorColor: 'Central Park Theme',
    description: 'A full-size American luxury SUV positioned for executive family buyers who need exact-model exterior and interior views, not generic SUV photography.',
    features: ['Massage seats', 'Revel Ultima 3D audio', 'BlueCruise', 'Black Label interior themes'],
    highlights: ['Dallas executive-delivery coordination', 'Theme-specific gallery captions across interior and exterior views', 'Concierge finance support for family fleets'],
    delivery: { feeUsd: 520, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'toyota-tundra-capstone-2024', badge: 'Luxury Truck', brand: 'Toyota', model: 'Tundra Capstone', year: 2024, mileage: 2600,
    location: 'Austin', condition: 'Brand new', priceUsd: 108000, minimumDepositUsd: 15000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Hybrid', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Wind Chill Pearl', interiorColor: 'Black and White Leather',
    description: 'A premium hybrid pickup with exact truck-specific media covering the front stance, side profile, cabin, second row, and cargo bed before deposit review.',
    features: ['i-Force Max hybrid', 'Panoramic roof', 'Power running boards', 'Trailer backup guide'],
    highlights: ['Austin truck desk allocation', 'Correct Capstone-specific truck gallery', 'Hybrid truck finance review available'],
    delivery: { feeUsd: 410, eta: '2-4 business days after approval' },
  }),
  createCarRecord({
    id: 'rivian-r1t-quad-motor-2024', badge: 'Adventure EV', brand: 'Rivian', model: 'R1T Quad-Motor', year: 2024, mileage: 1900,
    location: 'Seattle', condition: 'Brand new', priceUsd: 126000, minimumDepositUsd: 18000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'Truck', fuelType: 'Electric', transmission: 'Single-speed', drivetrain: 'AWD', exteriorColor: 'Forest Green', interiorColor: 'Ocean Coast',
    description: 'An all-electric adventure truck with exact-match gallery views for the body, gear tunnel zone, dashboard, and seat layout rather than generic EV imagery.',
    features: ['Quad-motor AWD', 'Air suspension', 'Gear tunnel', 'Camp speaker'],
    highlights: ['Seattle EV truck specialist review', 'Electric Horizon color theme applied to gallery media', 'Adventure and premium daily-use buyer profiles supported'],
    delivery: { feeUsd: 490, eta: '3-5 business days after payment verification' },
  }),
  createCarRecord({
    id: 'gmc-yukon-denali-ultimate-2024', badge: 'Executive SUV', brand: 'GMC', model: 'Yukon Denali Ultimate', year: 2024, mileage: 2400,
    location: 'Houston', condition: 'Brand new', priceUsd: 154000, minimumDepositUsd: 22000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Diesel', transmission: '10-speed automatic', drivetrain: '4WD', exteriorColor: 'Titanium Rush', interiorColor: 'Alpine Umber',
    description: 'A full-size luxury utility flagship with exact-name media showing its formal exterior, cockpit, captain chairs, and rear-cabin comfort zones.',
    features: ['Denali Ultimate interior', 'Air ride suspension', 'Super Cruise', 'Bose Performance Series'],
    highlights: ['Houston executive SUV lane', 'Executive Reserve theme used across gallery set', 'Suitable for owner-driver or chauffeured use'],
    delivery: { feeUsd: 540, eta: '2-5 business days after approval' },
  }),
  createCarRecord({
    id: 'jeep-grand-wagoneer-series-iii-2024', badge: 'American Reserve', brand: 'Jeep', model: 'Grand Wagoneer Series III', year: 2024, mileage: 2800,
    location: 'Denver', condition: 'Brand new', priceUsd: 148000, minimumDepositUsd: 21000, paymentTypes: ['full', 'installment'],
    bodyStyle: 'SUV', fuelType: 'Petrol', transmission: '8-speed automatic', drivetrain: '4WD', exteriorColor: 'Diamond Black', interiorColor: 'Global Black and Tupelo',
    description: 'A premium three-row American luxury SUV with exact gallery labeling for front fascia, profile, rear bodywork, cockpit, and second-row executive seating.',
    features: ['McIntosh audio', 'Rear-seat monitoring', 'Night vision', 'Palermo leather'],
    highlights: ['Denver high-country delivery planning', 'Large luxury SUV media matched to exact Series III trim', 'Family and executive finance profiles supported'],
    delivery: { feeUsd: 560, eta: '3-6 business days after approval' },
  }),
]

const users = [
  createUserRecord({
    id: 'admin-user', fullName: readConfiguredValue('ADMIN_FULL_NAME', 'Prestige Admin'), email: readConfiguredValue('ADMIN_EMAIL', 'admin@prestigemotors.example'), phone: readConfiguredValue('ADMIN_PHONE', '+1 305 555 0198'),
    password: readConfiguredValue('ADMIN_PASSWORD', 'Admin@2026'), role: 'admin', country: 'US', location: 'Miami',
  }),
  createUserRecord({
    id: 'demo-user', fullName: 'Amina Yusuf', email: 'amina@example.com', phone: '+1 917 555 0172',
    password: 'Buyer@2026', role: 'user', country: 'US', location: 'New York',
    favoriteCarIds: ['lexus-lx-600-2023', 'toyota-land-cruiser-2021'],
    notifications: [{ id: 'note-1', title: 'Verification first', body: 'Inspection is required before vehicle release. Delivery opens after deposit or approved financing.', createdAt: '2026-04-19T10:15:00.000Z' }],
  }),
]

const financingApplications = [
  { id: 'app-1', userId: 'demo-user', carId: 'tesla-model-x-plaid-2024', fullName: 'Amina Yusuf', phone: '+234 801 555 0199', email: 'amina@example.com', incomeUsd: 6400, location: 'New York', depositUsd: 18000, months: 24, status: 'Approved', createdAt: '2026-04-18T12:00:00.000Z' },
  { id: 'app-2', userId: 'demo-user', carId: 'cadillac-escalade-v-2024', fullName: 'Amina Yusuf', phone: '+234 801 555 0199', email: 'amina@example.com', incomeUsd: 6400, location: 'Miami', depositUsd: 22000, months: 18, status: 'Pending Review', createdAt: '2026-04-20T09:30:00.000Z' },
]

const payments = [
  {
    id: 'pay-1',
    userId: 'demo-user',
    carId: 'tesla-model-x-plaid-2024',
    type: 'deposit',
    method: 'bank-transfer',
    amountUsd: 18000,
    createdAt: '2026-04-19T08:00:00.000Z',
    receiptNumber: 'RCPT-20260419-001',
    status: 'Confirmed',
    proofAttachment: {
      name: 'tesla-bank-transfer-slip.png',
      type: 'image/png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    },
    proofUploadedAt: '2026-04-19T07:52:00.000Z',
  },
]

const paymentRequests = [
  {
    id: 'payment-request-1',
    userId: 'demo-user',
    carId: 'tesla-model-x-plaid-2024',
    type: 'deposit',
    requestedMethod: 'bank-transfer',
    approvedMethod: 'bank-transfer',
    requestedAmountUsd: 18000,
    approvedAmountUsd: 18000,
    status: 'Confirmed',
    instructionsTitle: 'Wire instructions prepared',
    bankName: 'First Atlantic Private Bank',
    accountName: 'Prestige Motors Miami LLC Client Account',
    accountNumber: '4821193048',
    referenceCode: 'TESLA-DEP-001',
    paymentLink: '',
    adminNote: 'Use the reference code in the transfer narration.',
    paymentId: 'pay-1',
    proofAttachment: {
      name: 'tesla-bank-transfer-slip.png',
      type: 'image/png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    },
    proofUploadedAt: '2026-04-19T07:52:00.000Z',
    createdAt: '2026-04-18T14:00:00.000Z',
    reviewedAt: '2026-04-18T14:30:00.000Z',
    confirmedAt: '2026-04-19T08:00:00.000Z',
  },
  {
    id: 'payment-request-2',
    userId: 'demo-user',
    carId: 'cadillac-escalade-v-2024',
    type: 'deposit',
    requestedMethod: 'bank-transfer',
    approvedMethod: '',
    requestedAmountUsd: 22000,
    approvedAmountUsd: 22000,
    status: 'Pending Approval',
    instructionsTitle: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    referenceCode: '',
    paymentLink: '',
    adminNote: 'Buyer requested bank transfer instructions for the minimum deposit.',
    paymentId: '',
    proofAttachment: null,
    proofUploadedAt: '',
    createdAt: '2026-04-20T09:45:00.000Z',
    reviewedAt: '',
    confirmedAt: '',
  },
]

const deliveryRequests = [
  { id: 'delivery-1', userId: 'demo-user', carId: 'tesla-model-x-plaid-2024', trigger: 'approved-loan', status: 'Scheduled', address: 'Brooklyn, New York', feeUsd: 510, eta: '3-6 business days after payment verification', createdAt: '2026-04-20T08:00:00.000Z' },
]

const serviceRequests = [
  {
    id: 'service-1',
    userId: 'demo-user',
    type: 'concierge',
    status: 'Reviewing brief',
    fullName: 'Amina Yusuf',
    email: 'amina@example.com',
    phone: '+1 917 555 0172',
    location: 'New York',
    title: 'Source a 2024 Bentley Flying Spur Speed',
    budgetUsd: 285000,
    assetDetails: 'Seeking a black-on-tan Flying Spur Speed with fewer than 5,000 miles and rear entertainment.',
    desiredOutcome: 'Open to US stock first, then Japan or GCC export stock with verified history.',
    notes: 'Would like finance and enclosed transport options included in the proposal.',
    createdAt: '2026-04-20T11:45:00.000Z',
  },
]

const meta = {
  brands: [],
  locations: [],
  paymentTypes: ['full', 'installment'],
  defaultCountry: DEFAULT_COUNTRY_CODE,
  countries: COUNTRY_OPTIONS,
  adminCredentialsHint: ADMIN_LOGIN_HINT_EMAIL ? { email: ADMIN_LOGIN_HINT_EMAIL } : null,
  testimonials: [
    { id: 'review-1', name: 'Marcus Ellison', role: 'Private banking client, Miami', quote: 'The team had the VIN file, service history, and enclosed transport options ready before I sent a deposit. It felt like a real boutique dealership, not a listing board.' },
    { id: 'review-2', name: 'Rachel Kim', role: 'Founder, Newport Coast', quote: 'I liked that the numbers were presented cleanly. Deposit, monthly cost, payoff horizon, and handover timing were all laid out before the finance desk called me.' },
    { id: 'review-3', name: 'Daniel Tan', role: 'Collector buying from Singapore', quote: 'Their Asia sourcing process was disciplined. Inspection photos, export paperwork, and the release conditions were shared in the right order without any pressure tactics.' },
  ],
  faqs: [
    { question: 'How does installment financing work?', answer: 'Choose a vehicle, review the deposit and monthly plan, submit your income and contact details, then wait for admin review. Approval decisions are shared through the user dashboard.' },
    { question: 'Can delivery happen before payment?', answer: 'No. Delivery requests are available only after a deposit is confirmed or a financing request is approved.' },
    { question: 'How do I verify the vehicle before payment?', answer: 'You can schedule an inspection or test drive. We also provide ownership and verification documents before release.' },
    { question: 'Which payment methods are supported?', answer: 'Card payment, bank transfer, and an optional escrow workflow for qualified transactions are supported. Receipts are generated automatically.' },
  ],
  company: {
    name: readConfiguredValue('COMPANY_NAME', 'Prestige Motors Miami'),
    address: readConfiguredValue('COMPANY_ADDRESS', '415 Biscayne Boulevard, Miami, Florida, United States'),
    phone: readConfiguredValue('COMPANY_PHONE', '+1 305 555 0044'),
    email: readConfiguredValue('COMPANY_EMAIL', 'clientservices@prestigemotors.example'),
    hours: readConfiguredValue('COMPANY_HOURS', 'Mon-Sat, 9:00 AM - 7:00 PM'),
  },
  policies: {
    privacy: 'Client information is used for showroom appointments, finance review, identity checks, transport coordination, and receipt records only. We do not sell client data or market guaranteed approvals.',
    terms: 'Vehicle handover begins after inspection completion and either cleared funds, a verified deposit, or formal finance approval. Delivery timing depends on route, paperwork, and final release authorization.',
    security: 'Deploy behind HTTPS with SSL enabled, store secrets in environment variables, and restrict admin access before production launch.',
  },
}

const buildMeta = (carCollection) => ({
  ...cloneValue(meta),
  brands: [...new Set(carCollection.map((car) => car.brand))],
  locations: [...new Set(carCollection.map((car) => car.location))],
})

const seedData = {
  cars: cloneValue(cars),
  users: cloneValue(users),
  financingApplications: cloneValue(financingApplications),
  payments: cloneValue(payments),
  paymentRequests: cloneValue(paymentRequests),
  deliveryRequests: cloneValue(deliveryRequests),
  serviceRequests: cloneValue(serviceRequests),
}

const nextId = (prefix, collection) => {
  const nextValue = collection.reduce((maxValue, entry) => {
    const rawId = String(entry?.id || '')
    const pattern = new RegExp(`^${prefix}-(\\d+)$`)
    const match = rawId.match(pattern)

    if (!match) {
      return maxValue
    }

    return Math.max(maxValue, Number(match[1]))
  }, 0)

  return `${prefix}-${nextValue + 1}`
}

module.exports = {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  cars,
  users,
  financingApplications,
  payments,
  paymentRequests,
  deliveryRequests,
  serviceRequests,
  meta,
  seedData,
  buildMeta,
  attachVehicleDisplayMedia,
  buildVehicleDisplayGallery,
  nextId,
  createCarRecord,
  createUserRecord,
  getCountrySettings,
}
